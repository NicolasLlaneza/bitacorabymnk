-- ════════════════════════════════════════════════════════════════════
-- RPC: cambiar_mi_password
-- ════════════════════════════════════════════════════════════════════
-- Reemplaza el trío (verificar_password_actual + auth.updateUser + rpc
-- marcar_password_cambiada) por una sola operación atómica del lado
-- servidor. Motivo: el endpoint auth.updateUser exige "Secure password
-- change" (recent auth) en configuraciones nuevas de Supabase y no
-- teníamos forma limpia de satisfacer eso sin romper el cliente JS.
--
-- Dos casos de uso:
--
--   A) PRIMER INGRESO (debe_cambiar_password = true):
--      La persona sigue usando la contraseña temporal que le dictó el
--      superadmin. Esa contraseña la conocen los dos, así que exigir la
--      "actual" no aporta seguridad — solo fricción. Se acepta cambio
--      directo sin verificar la actual.
--
--   B) CAMBIO VOLUNTARIO (debe_cambiar_password = false):
--      La persona ya tiene su propia contraseña. Antes de cambiarla
--      hay que verificar que quien la cambia la conoce, porque una
--      sesión secuestrada podría redefinirla sin este check.
--
-- Seguridad:
--   • SECURITY DEFINER para poder tocar auth.users.encrypted_password
--     (que el rol authenticated no ve directamente).
--   • Scope acotado a auth.uid() — nunca puede afectar filas de otros
--     usuarios.
--   • Solo authenticated ejecuta.
--   • Hash con bcrypt cost 10 (mismo cost que usa Supabase Auth).
--   • Validación de longitud mínima 12 caracteres (coincide con la
--     política del proyecto).
--
-- Tradeoff conocido: bypasseamos GoTrue, así que las sesiones en otros
-- dispositivos siguen válidas hasta que expire su JWT (~1h por default).
-- Para el caso de uso del taller es aceptable.
-- ════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

create or replace function public.cambiar_mi_password(
  p_nueva  text,
  p_actual text default null
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid          uuid;
  v_debe_cambiar boolean;
  v_stored       text;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;

  if p_nueva is null or length(p_nueva) < 12 then
    raise exception 'La contraseña debe tener al menos 12 caracteres'
      using errcode = '22023';
  end if;

  select debe_cambiar_password into v_debe_cambiar
    from public.profiles
   where id = v_uid;

  -- Caso B: cambio voluntario → verificar contraseña actual
  if not coalesce(v_debe_cambiar, false) then
    if p_actual is null or p_actual = '' then
      raise exception 'Ingresá tu contraseña actual'
        using errcode = '28000';
    end if;

    select encrypted_password into v_stored
      from auth.users
     where id = v_uid;

    if v_stored is null or v_stored <> crypt(p_actual, v_stored) then
      raise exception 'La contraseña actual no es correcta'
        using errcode = '28P01';
    end if;

    -- No permitir setear la misma contraseña que ya tiene
    if v_stored = crypt(p_nueva, v_stored) then
      raise exception 'La nueva contraseña tiene que ser distinta de la actual'
        using errcode = '22023';
    end if;
  end if;

  -- Actualizar el hash con bcrypt cost 10 (default de Supabase Auth)
  update auth.users
     set encrypted_password = crypt(p_nueva, gen_salt('bf', 10)),
         updated_at         = now()
   where id = v_uid;

  -- Apagar el flag si estaba activo (idempotente)
  update public.profiles
     set debe_cambiar_password = false,
         updated_at            = now()
   where id = v_uid
     and debe_cambiar_password = true;
end;
$$;

revoke all    on function public.cambiar_mi_password(text, text) from public;
grant execute on function public.cambiar_mi_password(text, text) to authenticated;

comment on function public.cambiar_mi_password(text, text) is
  'Cambia la contraseña del usuario autenticado. Si debe_cambiar_password=true (primer ingreso post-alta), acepta la nueva sin verificar la actual. Si false, exige y valida la actual antes de cambiar. Bypasse la Auth API por limitaciones de "Secure password change" en configs recientes de Supabase.';
