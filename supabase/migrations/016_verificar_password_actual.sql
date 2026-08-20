-- ════════════════════════════════════════════════════════════════════
-- RPC: verificar_password_actual
-- ════════════════════════════════════════════════════════════════════
-- El form de cambio de contraseña necesita confirmar que quien está
-- sentado adelante es el dueño real de la sesión antes de aceptar la
-- nueva contraseña. La primera versión hacía signInWithPassword contra
-- el mismo cliente de Supabase, pero eso disparaba token refresh y
-- rompía las llamadas siguientes con "No API key found in request".
--
-- Este RPC hace la verificación server-side sin tocar la sesión: recibe
-- una contraseña candidata, la hashea con el salt de la contraseña
-- almacenada, y devuelve true/false. Nunca devuelve el hash ni la
-- contraseña — solo el veredicto.
--
-- SECURITY: SECURITY DEFINER para poder leer auth.users.encrypted_password
-- (que el rol authenticated no puede leer directo). El scope está acotado
-- a la fila del auth.uid() actual — no puede probar contraseñas de otros.
--
-- Requiere pgcrypto (viene habilitado por defecto en Supabase).
-- ════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

create or replace function public.verificar_password_actual(p_password text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_stored text;
  v_uid    uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    return false;
  end if;

  select encrypted_password into v_stored
    from auth.users
   where id = v_uid;

  if v_stored is null or v_stored = '' then
    return false;
  end if;

  -- crypt(input, stored_hash) reusa el salt del stored_hash y devuelve
  -- el mismo hash si la contraseña coincide.
  return v_stored = crypt(p_password, v_stored);
end;
$$;

revoke all    on function public.verificar_password_actual(text) from public;
grant execute on function public.verificar_password_actual(text) to authenticated;

comment on function public.verificar_password_actual(text) is
  'Devuelve true si p_password es la contraseña actual del usuario autenticado. Se usa en el form de cambio de contraseña para reautenticar sin manipular la sesión del cliente.';
