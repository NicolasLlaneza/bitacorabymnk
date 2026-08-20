-- ════════════════════════════════════════════════════════════════════
-- Rate limiting para consulta pública
-- ════════════════════════════════════════════════════════════════════
-- Guarda cada consulta con IP y timestamp. La Edge Function chequea
-- cuántas consultas hizo la misma IP en la última hora y rechaza si
-- supera el límite.
--
-- Complementa al CAPTCHA (que protege de bots) para prevenir abuso
-- humano/enumeración manual.
--
-- Retention: los registros más viejos que 24h no aportan valor y solo
-- ocupan espacio. Un job programado los limpia (ver más abajo).
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.consulta_publica_log (
  id           bigserial primary key,
  ip           text not null,
  patente      text,
  consultado_at timestamptz not null default now()
);

-- Índice para el count de la última hora por IP (query hot path)
create index if not exists idx_consulta_publica_log_ip_time
  on public.consulta_publica_log(ip, consultado_at desc);

-- RLS: solo el service role escribe/lee (la Edge Function usa service role).
-- Anon nunca debería tocar esta tabla directamente.
alter table public.consulta_publica_log enable row level security;

-- No creamos policies explícitas: sin policies + RLS enabled = nadie
-- puede acceder salvo service_role (que bypasea RLS por diseño).

-- Job de limpieza: borrar registros de más de 24h una vez al día.
-- Usa pg_cron (ya habilitado en migration 003).
select cron.schedule(
  'consulta-publica-log-cleanup',
  '0 3 * * *',  -- todos los días a las 3 AM UTC (00:00 ARG)
  $$
  delete from public.consulta_publica_log
   where consultado_at < now() - interval '24 hours'
  $$
);
