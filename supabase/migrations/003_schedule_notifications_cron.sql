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
-- Requisitos previos (habilitar desde Dashboard → Database → Extensions):
--   • pg_cron — agendar trabajos periódicos
--   • pg_net  — hacer requests HTTP desde Postgres
-- ════════════════════════════════════════════════════════════════════

select cron.schedule(
  'process-notifications-every-5-min',
  '*/5 * * * *',
  $$
  select net.http_post(
    url     := 'https://isswkrbmtklhogfsivce.supabase.co/functions/v1/process-notifications',
    headers := jsonb_build_object(
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlzc3drcmJtdGtsaG9nZnNpdmNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NzM3MDUsImV4cCI6MjA5MzI0OTcwNX0.pUqzxk3m1xgAVKCOsWCBT_Aq7VIv8vob-q-6SI_mmJo',
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
