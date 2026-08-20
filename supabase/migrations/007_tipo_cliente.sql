-- ════════════════════════════════════════════════════════════════════
-- Distinguir clientes persona vs empresa
-- ════════════════════════════════════════════════════════════════════
-- Requerido para personalizar mensajes de notificación:
--   Persona: "Hola {primer_nombre}!"
--   Empresa: "Hola equipo de {razon_social}!"
--
-- Diseño:
--   - 'nombre'  es genérico: nombre y apellido (persona) o razón social (empresa)
--   - 'documento' guarda DNI (persona) o CUIT (empresa), opcional
--   - 'contacto_nombre' solo se usa para empresas (persona de contacto)
--
-- Los clientes existentes se marcan como 'persona' por default
-- (asumimos que la mayoría lo son).
-- ════════════════════════════════════════════════════════════════════

do $$
begin
  if not exists (select 1 from pg_type where typname = 'tipo_cliente') then
    create type tipo_cliente as enum ('persona', 'empresa');
  end if;
end$$;

alter table public.clientes
  add column if not exists tipo tipo_cliente not null default 'persona';

alter table public.clientes
  add column if not exists documento text;

alter table public.clientes
  add column if not exists contacto_nombre text;

-- Índice para búsquedas por documento (útil cuando crece la cartera)
create index if not exists idx_clientes_documento
  on public.clientes(documento)
  where documento is not null;
