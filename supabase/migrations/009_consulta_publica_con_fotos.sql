-- ════════════════════════════════════════════════════════════════════
-- consulta_publica: incluir fotos por servicio
-- ════════════════════════════════════════════════════════════════════
-- El cliente en la consulta pública ahora puede ver las fotos de cada
-- servicio realizado. La función devuelve los storage_paths (no URLs);
-- la Edge Function consulta-publica se encarga de generar URLs firmadas
-- (1h de validez) antes de enviar al frontend.
-- ════════════════════════════════════════════════════════════════════

create or replace function public.consulta_publica(p_patente text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vehiculo  record;
  v_servicios json;
begin
  p_patente := upper(replace(p_patente, ' ', ''));

  select * into v_vehiculo
  from public.vehiculos
  where patente = p_patente and activo = true;

  if not found then
    return null;
  end if;

  -- NOTA: cliente_nombre intencionalmente excluido del retorno
  -- para proteger datos personales del titular (Ley 25.326)

  -- Servicios con fotos anidadas (solo storage_paths — no URLs)
  select json_agg(
    json_build_object(
      'fecha',         s.fecha,
      'tipo',          s.tipo,
      'km',            s.km,
      'producto',      s.producto,
      'observaciones', s.observaciones,
      'fotos',         coalesce(
        (select json_agg(f.storage_path order by f.orden)
           from public.fotos_servicio f
          where f.servicio_id = s.id),
        '[]'::json
      )
    ) order by s.fecha desc
  ) into v_servicios
  from public.servicios s
  where s.vehiculo_id = v_vehiculo.id;

  return json_build_object(
    'patente',      v_vehiculo.patente,
    'marca',        v_vehiculo.marca,
    'modelo',       v_vehiculo.modelo,
    'anio',         v_vehiculo.anio,
    'tipo_patente', v_vehiculo.tipo_patente,
    'servicios',    coalesce(v_servicios, '[]'::json)
  );
end;
$$;
