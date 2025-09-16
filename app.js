// app.js (ESM)
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const cfg = window.CONFIG;
const supabase = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

const $grid = document.getElementById("grid");
const $log  = document.getElementById("log");
const $wsDot = document.getElementById("wsDot");
const $wsText= document.getElementById("wsText");

// Estado por sensor
const state = new Map(); // sensorId -> { ppm, ratio, ts:Date, status:"ok|warn|err" }

function fmtTime(d){
  try{
    return new Intl.DateTimeFormat("es-CO", {
      dateStyle:"short", timeStyle:"medium", timeZone: cfg.TZ
    }).format(d);
  }catch{ return d.toISOString(); }
}

function log(msg){
  const p = document.createElement("p");
  p.innerHTML = msg;
  $log.prepend(p);
}

function badgeClass(ppm, threshold){
  if (ppm == null) return "warn";
  if (ppm >= threshold) return "err";
  return "ok";
}

function heartbeat(){
  const now = Date.now();
  for (const s of cfg.SENSORS){
    const card = document.getElementById(`card-${s.id}`);
    const meta = card.querySelector(".meta");
    const statusBadge = card.querySelector(".badge");
    const st = state.get(s.id);
    let isOffline = true;
    if (st?.ts){
      const ageSec = (now - st.ts.getTime())/1000;
      isOffline = ageSec > cfg.OFFLINE_AFTER_SEC;
      meta.querySelector(".last").textContent = st.ts ? fmtTime(st.ts) : "—";
      meta.querySelector(".age").textContent  = st.ts ? `${Math.round(ageSec)} s` : "—";
    }else{
      meta.querySelector(".last").textContent = "—";
      meta.querySelector(".age").textContent  = "—";
    }
    // Estado visual general (online/offline)
    statusBadge.textContent = isOffline ? "OFFLINE" : "ONLINE";
    statusBadge.className = `badge ${isOffline ? "warn" : "ok"}`;
  }
}
setInterval(heartbeat, 1000);

// Construir cards
function buildGrid(){
  $grid.innerHTML = "";
  for (const s of cfg.SENSORS){
    const card = document.createElement("div");
    card.className = "card";
    card.id = `card-${s.id}`;
    card.innerHTML = `
      <div class="cardHead">
        <div class="sName">${s.label}</div>
        <div class="badge warn">—</div>
      </div>
      <div class="value"><span class="val">—</span> <span style="font-size:14px;color:#9aa3b2">ppm</span></div>
      <div class="meta">
        <span><span class="dot gray"></span> umbral <b>${s.threshold}</b> ppm</span>
        <span>último: <span class="last">—</span></span>
        <span>edad: <span class="age">—</span></span>
      </div>
    `;
    $grid.appendChild(card);
  }
}

function updateSensorCard(sensorId, ppm, ratio, tsISO){
  const s = cfg.SENSORS.find(x=>x.id===sensorId);
  if(!s) return;
  const card = document.getElementById(`card-${s.id}`);
  if(!card) return;

  const valEl = card.querySelector(".val");
  const badge = card.querySelector(".badge");

  const ts = tsISO ? new Date(tsISO) : null;
  state.set(s.id, { ppm, ratio, ts });

  // Valor principal
  if (ppm == null || Number.isNaN(ppm)) {
    valEl.textContent = "—";
  } else {
    valEl.textContent = Math.round(Number(ppm)*10)/10;
  }
  // Color por umbral
  const klass = badgeClass(ppm, s.threshold);
  badge.className = `badge ${klass}`;
  // Online/offline se actualiza en heartbeat()
}

// Conexión Realtime y estado
function setWsStatus(connected){
  $wsDot.className = `dot ${connected ? "green" : "gray"}`;
  $wsText.textContent = connected ? "En vivo" : "Desconectado";
}

async function init(){
  buildGrid();
  setWsStatus(false);
  log("Inicializando…");

  // 1) Carga inicial (últimas lecturas, tomamos la más reciente por sensor)
  const { data, error } = await supabase
    .from("readings")
    .select("sensor, ts, ppm, ratio")
    .order("ts", { ascending: false })
    .limit(1000);

  if(error){
    log(`Error inicial: ${error.message}`);
  }else{
    // Mantener la última por sensor
    const seen = new Set();
    for(const row of data){
      if(seen.has(row.sensor)) continue;
      updateSensorCard(row.sensor, row.ppm, row.ratio, row.ts);
      seen.add(row.sensor);
    }
    log(`Lecturas iniciales cargadas (${seen.size} sensores).`);
  }

  // 2) Suscripción Realtime a INSERTs
  const channel = supabase.channel("realtime:readings")
    .on("postgres_changes",
      { event: "INSERT", schema: "public", table: "readings" },
      payload => {
        const r = payload.new;
        updateSensorCard(r.sensor, r.ppm, r.ratio, r.ts);
        log(`↪ Recibido <span class="highlight">${r.sensor}</span> → ${Number(r.ppm).toFixed(1)} ppm @ ${fmtTime(new Date(r.ts))}`);
      }
    )
    .subscribe((status) => {
      // status: SUBSCRIBED | TIMED_OUT | CLOSED | CHANNEL_ERROR
      const ok = (status === "SUBSCRIBED");
      setWsStatus(ok);
      if(!ok) log(`Estado realtime: ${status}`);
    });
}

init();
