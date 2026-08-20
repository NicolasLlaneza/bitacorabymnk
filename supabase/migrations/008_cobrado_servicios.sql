-- ════════════════════════════════════════════════════════════════════
-- Campo 'cobrado' en servicios
-- ════════════════════════════════════════════════════════════════════
-- Permite marcar si un servicio ya se cobró o está pendiente.
-- Útil para conciliación al cierre del día/mes.
-- ════════════════════════════════════════════════════════════════════

alter table public.servicios
  add column if not exists cobrado boolean not null default false;

alter table public.servicios
  add column if not exists fecha_cobro timestamptz;

-- Trigger: setea fecha_cobro cuando cobrado pasa de false a true
create or replace function public.set_fecha_cobro()
returns trigger language plpgsql as $$
begin
  if new.cobrado = true and (old is null or old.cobrado = false) then
    new.fecha_cobro := now();
  elsif new.cobrado = false then
    -- Si se destilda, limpiamos la fecha
    new.fecha_cobro := null;
  end if;
  return new;
end;
$$;

drop trigger if exists tr_servicios_cobro on public.servicios;
create trigger tr_servicios_cobro
  before insert or update of cobrado on public.servicios
  for each row execute function public.set_fecha_cobro();

-- Índice para filtros rápidos de pendientes de cobro
create index if not exists idx_servicios_cobrado
  on public.servicios(cobrado)
  where cobrado = false;
