-- ════════════════════════════════════════════════════════════════════
-- Auditoría en vehículos + gestión de usuarios por superadmin
-- ════════════════════════════════════════════════════════════════════
-- 1. `vehiculos` quedó sin campo de auditoría en el schema inicial.
--    Se agrega creado_por y se extiende el trigger set_audit_user.
--
-- 2. `profiles` solo tenía políticas de SELECT. Sin INSERT/UPDATE
--    ni un superadmin podía dar de baja a otro usuario desde la app.
--    Se agregan las políticas faltantes con guardas de seguridad.
--
-- ORDEN IMPORTANTE: todos los ALTER TABLE van primero. Si se crean los
-- triggers antes de que existan las columnas que tocan, el primer UPDATE
-- falla con "record new has no field X" porque PL/pgSQL compila el cuerpo
-- de la función contra el rowtype vigente en ese momento.
--
-- Idempotente: se puede re-ejecutar sin efectos secundarios.
-- ════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────
-- 1. CAMBIOS DE ESQUEMA (todos juntos, antes de funciones y triggers)
-- ─────────────────────────────────────────────────────────────────────

-- Auditoría en vehículos (faltaba en el schema inicial)
alter table public.vehiculos
  add column if not exists creado_por uuid references public.profiles(id) on delete set null;

comment on column public.vehiculos.creado_por is
  'Usuario que registró el vehículo. Lo setea el trigger set_audit_user con auth.uid(); no es falsificable desde el cliente.';

-- Columnas de profiles que usan los triggers de más abajo.
-- fecha_baja y updated_at deberían venir del schema inicial, pero las
-- declaramos por si la instancia se creó con una versión previa.
alter table public.profiles
  add column if not exists email      text,
  add column if not exists fecha_baja timestamptz,
  add column if not exists updated_at timestamptz default now();

comment on column public.profiles.email is
  'Copia desnormalizada de auth.users.email. La mantiene el trigger handle_new_user; es el identificador con el que la persona inicia sesión.';


-- ─────────────────────────────────────────────────────────────────────
-- 2. AUDITORÍA: extender el trigger para cubrir vehículos
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.set_audit_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_TABLE_NAME = 'clientes' then
    new.creado_por := auth.uid();
  elsif TG_TABLE_NAME = 'vehiculos' then
    new.creado_por := auth.uid();
  elsif TG_TABLE_NAME = 'servicios' then
    new.registrado_por := auth.uid();
  elsif TG_TABLE_NAME = 'notificaciones' then
    new.programado_por := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists tr_vehiculos_audit on public.vehiculos;
create trigger tr_vehiculos_audit
  before insert on public.vehiculos
  for each row execute function public.set_audit_user();


-- ─────────────────────────────────────────────────────────────────────
-- 3. ALTA DE USUARIOS: leer nombre/rol/email al crear el perfil
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nombre text;
  v_rol    text;
begin
  v_nombre := coalesce(
    nullif(new.raw_user_meta_data->>'nombre', ''),
    split_part(new.email, '@', 1)
  );
  v_rol := coalesce(nullif(new.raw_user_meta_data->>'rol', ''), 'admin');

  -- Blindaje: solo aceptamos los roles válidos
  if v_rol not in ('admin', 'superadmin') then
    v_rol := 'admin';
  end if;

  insert into public.profiles (id, nombre, rol, activo, email)
  values (new.id, v_nombre, v_rol, true, new.email)
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Backfill del email para los usuarios ya existentes.
-- Va antes de crear el trigger de UPDATE en profiles para no dispararlo
-- innecesariamente sobre cada fila.
update public.profiles p
   set email = u.email
  from auth.users u
 where u.id = p.id
   and p.email is null;


-- ─────────────────────────────────────────────────────────────────────
-- 4. GESTIÓN DE USUARIOS: guardas y políticas
-- ─────────────────────────────────────────────────────────────────────

-- Impide que un superadmin se dé de baja a sí mismo o se quite el rol.
-- Sin esto, el último superadmin activo podría dejar al sistema sin
-- nadie capaz de gestionar usuarios.
create or replace function public.guard_profile_self_lockout()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.id = auth.uid() then
    if old.activo = true and new.activo = false then
      raise exception 'No podés darte de baja a vos mismo'
        using errcode = 'P0001';
    end if;
    if old.rol = 'superadmin' and new.rol <> 'superadmin' then
      raise exception 'No podés quitarte el rol de superadmin a vos mismo'
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists tr_profiles_self_lockout on public.profiles;
create trigger tr_profiles_self_lockout
  before update on public.profiles
  for each row execute function public.guard_profile_self_lockout();

-- Mantiene fecha_baja sincronizada con el campo activo
create or replace function public.set_profile_fecha_baja()
returns trigger
language plpgsql
as $$
begin
  if new.activo = false and (old.activo is distinct from false) then
    new.fecha_baja := now();
  elsif new.activo = true then
    new.fecha_baja := null;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists tr_profiles_fecha_baja on public.profiles;
create trigger tr_profiles_fecha_baja
  before update on public.profiles
  for each row execute function public.set_profile_fecha_baja();

-- Política que faltaba. El INSERT lo hace la Edge Function
-- admin-create-user con service role (necesita crear también el usuario
-- en auth.users), así que acá solo habilitamos UPDATE.
drop policy if exists "Superadmins actualizan perfiles" on public.profiles;
create policy "Superadmins actualizan perfiles"
  on public.profiles for update
  using (public.is_superadmin())
  with check (public.is_superadmin());


-- ─────────────────────────────────────────────────────────────────────
-- 5. ÍNDICES PARA EL PANEL
-- ─────────────────────────────────────────────────────────────────────
-- El registro de actividad ordena por created_at descendente y filtra
-- por usuario. El panel de KPIs agrupa servicios por fecha.
create index if not exists idx_clientes_creado_por
  on public.clientes(creado_por, created_at desc);

create index if not exists idx_vehiculos_creado_por
  on public.vehiculos(creado_por, created_at desc);

create index if not exists idx_servicios_registrado_por
  on public.servicios(registrado_por, created_at desc);

create index if not exists idx_servicios_fecha
  on public.servicios(fecha desc);

create index if not exists idx_notificaciones_programado_por
  on public.notificaciones(programado_por, created_at desc);
