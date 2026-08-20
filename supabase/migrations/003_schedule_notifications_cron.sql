-- ════════════════════════════════════════════════════════════════════
-- Cron job: process-notifications cada 5 minutos
-- ════════════════════════════════════════════════════════════════════
-- Dispara la Edge Function process-notifications cada 5 minutos.
-- Esa función busca notificaciones pendientes cuya fecha/hora ya pasó
-- y dispara send-notification por cada una.
--
-- Precisión: una notificación programada para las HH:MM se envía
-- entre HH:MM y HH:MM+5min.
--
-- ┌─────────────────────────────────────────────────────────────────┐
-- │ ⚠ ANTES DE APLICAR ESTA MIGRACIÓN                                │
-- │                                                                  │
-- │ 1. Reemplazá SUPABASE_URL_PLACEHOLDER con la URL de tu proyecto  │
-- │    (Dashboard → Settings → API → Project URL, sin barra final)   │
-- │    Ej: https://abcdefghijklmnop.supabase.co                      │
-- │                                                                  │
-- │ 2. Reemplazá SUPABASE_ANON_KEY_PLACEHOLDER con tu anon key       │
-- │    (Dashboard → Settings → API → anon public)                    │
-- │                                                                  │
-- │ Si no lo hacés, el cron se registra pero cada firing tira 404    │
-- │ contra un dominio que no existe. La app funciona igual salvo el  │
-- │ envío automático de notificaciones.                              │
-- └─────────────────────────────────────────────────────────────────┘
-- ════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────
-- Extensions necesarias:
--   • pg_cron — agendar trabajos periódicos dentro de la BD
--   • pg_net  — hacer requests HTTP salientes desde Postgres
--
-- CREATE EXTENSION las habilita si el binario ya está preinstalado
-- (Supabase lo hace por default). Alternativa por UI:
--   Dashboard → Database → Extensions → activar pg_cron y pg_net.
-- ─────────────────────────────────────────────────────────────────────
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net  with schema extensions;


select cron.schedule(
  'process-notifications-every-5-min',
  '*/5 * * * *',
  $$
  select net.http_post(
    url     := 'SUPABASE_URL_PLACEHOLDER/functions/v1/process-notifications',
    headers := jsonb_build_object(
      'Authorization', 'Bearer SUPABASE_ANON_KEY_PLACEHOLDER',
      'Content-Type',  'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Comandos útiles para administrar el cron:
--
-- Ver el cron job:
--   select * from cron.job;
--
-- Ver historial de ejecuciones:
--   select * from cron.job_run_details order by start_time desc limit 10;
--
-- Borrar el cron:
--   select cron.unschedule('process-notifications-every-5-min');
