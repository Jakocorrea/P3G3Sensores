// ⚠️ Reemplaza estos valores por los de TU proyecto Supabase:
window.CONFIG = {
  SUPABASE_URL: "https://P3G3sensores.SUPABASE.co",
  SUPABASE_ANON_KEY: "TU_ANON_KEY",

  // Sensores a monitorear (el id DEBE coincidir con 'sensor' en la tabla)
  SENSORS: [
    { id: "MQ-135", label: "MQ-135 (Calidad aire)", threshold: 150 }, // ppm de referencia
    { id: "MQ-7",   label: "MQ-7 (CO)",              threshold: 50  },
    { id: "MQ-2",   label: "MQ-2 (LPG/Humo)",        threshold: 200 }
  ],

  // Se considera "offline" si no llega dato nuevo en este tiempo:
  OFFLINE_AFTER_SEC: 90,

  // Zona horaria para mostrar horas
  TZ: "America/Bogota"
};
