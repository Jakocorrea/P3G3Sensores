# Monitor de Gases (GitHub Pages + Supabase)

Sitio estático que muestra el último valor de cada sensor MQ y su estado (ONLINE/OFFLINE) en tiempo real.
La Raspberry Pi inserta lecturas en `public.readings` (Supabase), y el front escucha Realtime.

## Configuración
1. Crea un proyecto en **Supabase** y habilita **Realtime** para la tabla `public.readings`.
2. Crea la tabla (ejemplo):
   ```sql
   create table if not exists public.readings (
     id bigserial primary key,
     ts timestamptz not null,
     sensor text not null,
     ppm double precision,
     ratio double precision
   );
