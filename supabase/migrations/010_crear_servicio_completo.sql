-- ════════════════════════════════════════════════════════════════════
-- RPC: crear_servicio_completo
-- ════════════════════════════════════════════════════════════════════
-- Crea servicio + (opcional) vehículo nuevo + (opcional) cliente nuevo
-- en una sola transacción. Si algún paso falla, rollback automático
-- (nada de clientes ni vehículos "huérfanos").
--
-- El frontend le pasa los 3 payloads via JSONB. Escenarios:
--   1. Solo servicio (vehículo existente):
--        cliente_nuevo=null, cliente_id=null,
--        vehiculo_nuevo=null, vehiculo_id=<existente>
--   2. Servicio + vehículo nuevo, cliente existente:
--        vehiculo_id=null, vehiculo_nuevo=<datos>, cliente_id=<existente>
--   3. Servicio + vehículo + cliente todo nuevo:
--        vehiculo_nuevo=<datos>, cliente_nuevo=<datos>
--
-- Devuelve JSONB con los IDs para que el frontend pueda subir fotos
-- al servicio recién creado.
-- ════════════════════════════════════════════════════════════════════

create or replace function public.crear_servicio_completo(
  p_servicio        jsonb,
  p_cliente_id      uuid  default null,
  p_vehiculo_id     uuid  default null,
  p_cliente_nuevo   jsonb default null,
  p_vehiculo_nuevo  jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cliente_id  uuid;
  v_vehiculo_id uuid;
  v_servicio_id uuid;
begin
  -- Verificar permiso: solo admins activos pueden usar esta RPC
  if not public.is_active_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  -- 1. Cliente
  if p_cliente_nuevo is not null then
    insert into public.clientes (
      tipo, nombre, telefono, email,
      documento, contacto_nombre, acepta_whatsapp,
      canal_preferido, estado
    ) values (
      coalesce(p_cliente_nuevo->>'tipo', 'persona')::tipo_cliente,
      p_cliente_nuevo->>'nombre',
      p_cliente_nuevo->>'telefono',
      p_cliente_nuevo->>'email',
      p_cliente_nuevo->>'documento',
      p_cliente_nuevo->>'contacto_nombre',
      coalesce((p_cliente_nuevo->>'acepta_whatsapp')::boolean, true),
      coalesce(p_cliente_nuevo->>'canal_preferido', 'WhatsApp'),
      coalesce(p_cliente_nuevo->>'estado', 'nuevo')
    )
    returning id into v_cliente_id;
  else
    v_cliente_id := p_cliente_id;
    if v_cliente_id is null then
      raise exception 'Se requiere cliente_id o cliente_nuevo';
    end if;
  end if;

  -- 2. Vehículo
  if p_vehiculo_nuevo is not null then
    insert into public.vehiculos (
      cliente_id, patente, tipo_patente,
      marca, modelo, anio, km
    ) values (
      v_cliente_id,
      p_vehiculo_nuevo->>'patente',
      p_vehiculo_nuevo->>'tipo_patente',
      p_vehiculo_nuevo->>'marca',
      p_vehiculo_nuevo->>'modelo',
      nullif(p_vehiculo_nuevo->>'anio', '')::integer,
      coalesce(nullif(p_vehiculo_nuevo->>'km', '')::integer, 0)
    )
    returning id into v_vehiculo_id;
  else
    v_vehiculo_id := p_vehiculo_id;
    if v_vehiculo_id is null then
      raise exception 'Se requiere vehiculo_id o vehiculo_nuevo';
    end if;
  end if;

  -- 3. Servicio
  insert into public.servicios (
    vehiculo_id, cliente_id, tipo, fecha, km,
    producto, importe, observaciones, cobrado
  ) values (
    v_vehiculo_id,
    v_cliente_id,
    p_servicio->>'tipo',
    (p_servicio->>'fecha')::date,
    (p_servicio->>'km')::integer,
    nullif(p_servicio->>'producto', ''),
    nullif(p_servicio->>'importe', '')::numeric,
    nullif(p_servicio->>'observaciones', ''),
    coalesce((p_servicio->>'cobrado')::boolean, false)
  )
  returning id into v_servicio_id;

  return jsonb_build_object(
    'servicio_id',  v_servicio_id,
    'cliente_id',   v_cliente_id,
    'vehiculo_id',  v_vehiculo_id
  );
end;
$$;

-- Solo usuarios autenticados pueden ejecutar
-- (la RPC internamente valida que sea admin activo con is_active_admin)
revoke execute on function public.crear_servicio_completo(jsonb, uuid, uuid, jsonb, jsonb) from anon;
grant  execute on function public.crear_servicio_completo(jsonb, uuid, uuid, jsonb, jsonb) to authenticated;
