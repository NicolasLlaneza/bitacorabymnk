-- ════════════════════════════════════════════════════════════════════
-- Proteger campos históricos de servicios
-- ════════════════════════════════════════════════════════════════════
-- El frontend deshabilita fecha, km, importe y tipo cuando un admin
-- normal edita un servicio existente. Esto es defense-in-depth: si
-- alguien manipula el request (curl, DevTools, extensión) igual no
-- puede cambiar esos campos.
--
-- Implementación con trigger: en un UPDATE, si el usuario no es
-- superadmin, cualquier intento de modificar los campos protegidos
-- se ignora (se restaura al valor previo). Silencioso a propósito:
-- si tirara error, el UPDATE completo fallaría y se perderían los
-- cambios legítimos a producto/observaciones/cobrado.
-- ════════════════════════════════════════════════════════════════════

create or replace function public.proteger_campos_servicio()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Solo aplica en UPDATE, y solo si el usuario no es superadmin.
  if public.is_superadmin() then
    return new;
  end if;

  -- Si algún campo protegido intentó cambiar, se restaura al valor previo.
  -- Los campos libres (producto, observaciones, cobrado, fecha_cobro)
  -- pasan sin restricción.
  new.tipo    := old.tipo;
  new.fecha   := old.fecha;
  new.km      := old.km;
  new.importe := old.importe;

  return new;
end;
$$;

drop trigger if exists tr_servicios_proteger_campos on public.servicios;
create trigger tr_servicios_proteger_campos
  before update on public.servicios
  for each row execute function public.proteger_campos_servicio();
