-- ════════════════════════════════════════════════════════════════════
-- Forzar cambio de la contraseña temporal en el primer ingreso
-- ════════════════════════════════════════════════════════════════════
-- Cuando un superadmin crea un usuario nuevo, admin-create-user lo hace
-- con una contraseña temporal que el superadmin le dicta a la persona.
-- Esa contraseña la conoce quien creó la cuenta, así que el dueño
-- legítimo tiene que cambiarla antes de operar.
--
-- Este flag lo setea handle_new_user leyendo raw_user_meta_data cuando
-- el alta la dispara admin-create-user. Se apaga cuando el usuario
-- llama al RPC marcar_password_cambiada tras un updateUser exitoso.
--
-- Idempotente: se puede re-ejecutar.
-- ════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────
-- 1. COLUMNA
-- ─────────────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists debe_cambiar_password boolean not null default false;

comment on column public.profiles.debe_cambiar_password is
  'True cuando el usuario fue creado por un superadmin y todavía usa la contraseña temporal. Se resetea a false vía rpc marcar_password_cambiada() tras el primer cambio.';


-- ─────────────────────────────────────────────────────────────────────
-- 2. TRIGGER: leer el flag de user_metadata al crear el perfil
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nombre        text;
  v_rol           text;
  v_debe_cambiar  boolean;
begin
  v_nombre := coalesce(
    nullif(new.raw_user_meta_data->>'nombre', ''),
    split_part(new.email, '@', 1)
  );
  v_rol := coalesce(nullif(new.raw_user_meta_data->>'rol', ''), 'admin');

  if v_rol not in ('admin', 'superadmin') then
    v_rol := 'admin';
  end if;

  -- Casteo defensivo: si viene mal el metadata, tratamos como false
  -- para no bloquear al usuario ante un alta con datos sucios.
  v_debe_cambiar := coalesce(
    (new.raw_user_meta_data->>'debe_cambiar_password')::boolean,
    false
  );

  insert into public.profiles (id, nombre, rol, activo, email, debe_cambiar_password)
  values (new.id, v_nombre, v_rol, true, new.email, v_debe_cambiar)
  on conflict (id) do nothing;

  return new;
end;
$$;


-- ─────────────────────────────────────────────────────────────────────
-- 3. RPC: marcar_password_cambiada
-- ─────────────────────────────────────────────────────────────────────
-- La política RLS de profiles solo permite UPDATE a superadmins, así que
-- un admin común no puede apagar su propio flag directamente. Este RPC
-- corre con SECURITY DEFINER y limita el efecto: solo la fila del user
-- autenticado, solo el campo debe_cambiar_password, solo de true a false.
create or replace function public.marcar_password_cambiada()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
     set debe_cambiar_password = false,
         updated_at            = now()
   where id = auth.uid()
     and debe_cambiar_password = true;
end;
$$;

revoke all on function public.marcar_password_cambiada() from public;
grant execute on function public.marcar_password_cambiada() to authenticated;

comment on function public.marcar_password_cambiada() is
  'Apaga el flag debe_cambiar_password del usuario autenticado. Se llama desde el frontend tras un updateUser({password}) exitoso.';
