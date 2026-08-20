-- ════════════════════════════════════════════════════════════════════
-- NEU+ — Esquema inicial de base de datos
-- ════════════════════════════════════════════════════════════════════
-- Sistema de seguimiento post venta para taller automotriz
--
-- Decisiones técnicas:
--   • UUID en lugar de IDs incrementales (privacidad + seguridad)
--   • Soft delete para preservar integridad histórica
--   • Auditoría defensiva (creado_por) sin tracking de productividad
--   • Row Level Security activo en todas las tablas
--   • Funciones SECURITY DEFINER para evitar recursión en políticas RLS
--   • Desnormalización controlada en servicios (cliente_id + vehiculo_id)
--   • Índices parciales para queries frecuentes
--
-- Para ejecutar en una BDD vacía: copiar todo el archivo en SQL Editor
-- ════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────
-- TRIGGER DE AUDITORÍA
-- Setea automáticamente el usuario que crea cada registro.
-- Sobreescribe cualquier valor enviado desde el cliente para evitar
-- que los campos de auditoría sean falsificados.
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
  elsif TG_TABLE_NAME = 'servicios' then
    new.registrado_por := auth.uid();
  elsif TG_TABLE_NAME = 'notificaciones' then
    new.programado_por := auth.uid();
  end if;
  return new;
end;
$$;


-- ─────────────────────────────────────────────────────────────────────
-- TABLA: profiles
-- Datos extra de los administradores
-- Vinculada con auth.users de Supabase Auth
-- ─────────────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  nombre text not null,
  rol text not null check (rol in ('admin', 'superadmin')),
  activo boolean default true,
  fecha_baja timestamptz null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

comment on column public.profiles.activo is
  'Si false, el usuario no puede iniciar sesión pero sus datos asociados se preservan.';
comment on column public.profiles.fecha_baja is
  'Fecha de baja del usuario. Si está null, está activo. Soft delete para preservar integridad histórica.';


-- ─────────────────────────────────────────────────────────────────────
-- FUNCIONES DE SEGURIDAD
-- Usan SECURITY DEFINER para bypassear RLS y evitar recursión infinita
-- cuando las políticas de una tabla necesitan consultar profiles.
-- Se declaran DESPUÉS de crear public.profiles porque las funciones SQL
-- (language sql) validan las referencias del body al momento de crearse
-- (a diferencia de plpgsql, que las difiere). Antes de crear la tabla
-- estas definiciones fallan con "relation public.profiles does not exist".
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.is_active_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and activo = true
  )
$$;

create or replace function public.is_superadmin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and rol = 'superadmin'
  )
$$;


alter table public.profiles enable row level security;

create policy "Admins ven su propio perfil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Superadmins ven todos los perfiles"
  on public.profiles for select
  using (public.is_superadmin());


-- ─────────────────────────────────────────────────────────────────────
-- TABLA: clientes
-- Clientes del taller
-- ─────────────────────────────────────────────────────────────────────
create table public.clientes (
  id uuid default gen_random_uuid() primary key,
  nombre text not null,
  telefono text not null,
  email text,
  canal_preferido text default 'WhatsApp' check (canal_preferido in ('WhatsApp', 'Email', 'Ambos')),
  estado text default 'nuevo' check (estado in ('nuevo', 'ok', 'proximo', 'urgente')),
  creado_por uuid references public.profiles(id) on delete set null,
  activo boolean default true,
  fecha_baja timestamptz null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_clientes_telefono on public.clientes(telefono);
create index idx_clientes_estado on public.clientes(estado);
create index idx_clientes_activo on public.clientes(activo);

comment on column public.clientes.creado_por is
  'Admin que cargó el cliente. Solo para auditoría defensiva, NO para ranking de productividad.';
comment on column public.clientes.fecha_baja is
  'Soft delete: si no es null, el cliente está dado de baja pero conserva su historial.';

alter table public.clientes enable row level security;

create policy "Admins ven clientes activos"
  on public.clientes for select
  using (public.is_active_admin() and activo = true);

create policy "Admins crean clientes"
  on public.clientes for insert
  with check (public.is_active_admin());

create policy "Admins actualizan clientes"
  on public.clientes for update
  using (public.is_active_admin());

create trigger tr_clientes_audit
  before insert on public.clientes
  for each row execute function public.set_audit_user();


-- ─────────────────────────────────────────────────────────────────────
-- TABLA: vehiculos
-- Vehículos asociados a cada cliente
-- ─────────────────────────────────────────────────────────────────────
create table public.vehiculos (
  id uuid default gen_random_uuid() primary key,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  patente text not null unique,
  tipo_patente text not null check (tipo_patente in ('auto-viejo', 'auto-nuevo', 'moto-nueva')),
  marca text not null,
  modelo text not null,
  anio integer check (anio >= 1950 and anio <= 2100),
  km integer default 0 check (km >= 0),
  activo boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_vehiculos_cliente on public.vehiculos(cliente_id);
create unique index idx_vehiculos_patente on public.vehiculos(patente);

comment on column public.vehiculos.patente is
  'Patente normalizada sin espacios. Ejemplos: ABC123, AB123CD, A123BC.';
comment on column public.vehiculos.tipo_patente is
  'Formato detectado: auto-viejo (3L+3N), auto-nuevo (2L+3N+2L), moto-nueva (1L+3N+2L).';

alter table public.vehiculos enable row level security;

-- Admins autenticados ven todos los vehículos (activos e inactivos)
create policy "Admins ven vehiculos"
  on public.vehiculos for select
  using (public.is_active_admin());

-- NOTA: la consulta pública de vehículos se maneja exclusivamente a través
-- de la función consulta_publica() con SECURITY DEFINER, que bypasea RLS.
-- No se necesita una política abierta para usuarios anónimos.

create policy "Admins crean vehiculos"
  on public.vehiculos for insert
  with check (public.is_active_admin());

create policy "Admins actualizan vehiculos"
  on public.vehiculos for update
  using (public.is_active_admin());


-- ─────────────────────────────────────────────────────────────────────
-- TABLA: servicios
-- Servicios realizados a cada vehículo
-- ─────────────────────────────────────────────────────────────────────
create table public.servicios (
  id uuid default gen_random_uuid() primary key,
  vehiculo_id uuid not null references public.vehiculos(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  tipo text not null,
  fecha date not null,
  km integer not null check (km >= 0),
  producto text,
  importe numeric(12, 2) check (importe >= 0),
  observaciones text,
  registrado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_servicios_vehiculo on public.servicios(vehiculo_id);
create index idx_servicios_cliente on public.servicios(cliente_id);
create index idx_servicios_fecha on public.servicios(fecha desc);

comment on column public.servicios.km is
  'Kilometraje del vehículo al momento del servicio. Permite trackear el uso real.';
comment on column public.servicios.importe is
  'Monto del servicio en pesos argentinos. Solo accesible por admins.';
comment on column public.servicios.registrado_por is
  'Admin que registró el servicio. Solo para auditoría defensiva.';

alter table public.servicios enable row level security;

create policy "Admins ven servicios"
  on public.servicios for select
  using (public.is_active_admin());

create policy "Admins crean servicios"
  on public.servicios for insert
  with check (public.is_active_admin());

create policy "Admins actualizan servicios"
  on public.servicios for update
  using (public.is_active_admin());

create trigger tr_servicios_audit
  before insert on public.servicios
  for each row execute function public.set_audit_user();


-- ─────────────────────────────────────────────────────────────────────
-- TABLA: fotos_servicio
-- Evidencia fotográfica de cada servicio
-- ─────────────────────────────────────────────────────────────────────
create table public.fotos_servicio (
  id uuid default gen_random_uuid() primary key,
  servicio_id uuid not null references public.servicios(id) on delete cascade,
  url text not null,
  storage_path text not null,
  orden integer default 0,
  created_at timestamptz default now()
);

create index idx_fotos_servicio on public.fotos_servicio(servicio_id);

comment on column public.fotos_servicio.url is
  'URL pública de la foto en Supabase Storage.';
comment on column public.fotos_servicio.storage_path is
  'Ruta interna del archivo en el bucket. Necesaria para borrar el archivo del Storage cuando se borra la fila.';
comment on column public.fotos_servicio.orden is
  'Orden de visualización de las fotos (0, 1, 2, ...). Permite reordenar.';

alter table public.fotos_servicio enable row level security;

create policy "Admins ven fotos"
  on public.fotos_servicio for select
  using (public.is_active_admin());

create policy "Admins suben fotos"
  on public.fotos_servicio for insert
  with check (public.is_active_admin());

create policy "Admins borran fotos"
  on public.fotos_servicio for delete
  using (public.is_active_admin());


-- ─────────────────────────────────────────────────────────────────────
-- TABLA: notificaciones
-- Recordatorios programados a clientes
-- ─────────────────────────────────────────────────────────────────────
create table public.notificaciones (
  id uuid default gen_random_uuid() primary key,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  servicio_id uuid references public.servicios(id) on delete set null,
  motivo text not null,
  canal text not null check (canal in ('WhatsApp', 'Email', 'Ambos')),
  mensaje text not null,
  fecha_envio date not null,
  hora_envio time default '09:00:00',
  estado text default 'pendiente' check (estado in ('pendiente', 'enviada', 'fallida', 'cancelada')),
  programado_por uuid references public.profiles(id) on delete set null,
  enviado_at timestamptz null,
  error_msg text null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_notif_cliente on public.notificaciones(cliente_id);
create index idx_notif_estado on public.notificaciones(estado);
create index idx_notif_fecha_envio on public.notificaciones(fecha_envio);
create index idx_notif_pendientes on public.notificaciones(fecha_envio)
  where estado = 'pendiente';

comment on column public.notificaciones.servicio_id is
  'Servicio que originó la notificación. Puede ser null si es una notificación manual.';
comment on column public.notificaciones.estado is
  'Estado del envío: pendiente, enviada, fallida, cancelada.';
comment on column public.notificaciones.error_msg is
  'Si el envío falló, guarda el mensaje de error de la API de WhatsApp/Email.';
comment on column public.notificaciones.enviado_at is
  'Timestamp exacto del envío exitoso. Sirve para auditoría.';

alter table public.notificaciones enable row level security;

create policy "Admins ven notificaciones"
  on public.notificaciones for select
  using (public.is_active_admin());

create policy "Admins crean notificaciones"
  on public.notificaciones for insert
  with check (public.is_active_admin());

create policy "Admins actualizan notificaciones"
  on public.notificaciones for update
  using (public.is_active_admin());

create policy "Admins cancelan notificaciones"
  on public.notificaciones for delete
  using (public.is_active_admin());

create trigger tr_notificaciones_audit
  before insert on public.notificaciones
  for each row execute function public.set_audit_user();


-- ─────────────────────────────────────────────────────────────────────
-- FUNCIÓN PÚBLICA: consulta_publica
-- Permite consultar el historial de servicios de un vehículo por patente
-- sin autenticación y sin exponer datos sensibles (importe, cliente)
-- ─────────────────────────────────────────────────────────────────────
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

  select json_agg(
    json_build_object(
      'fecha',         fecha,
      'tipo',          tipo,
      'km',            km,
      'producto',      producto,
      'observaciones', observaciones
    ) order by fecha desc
  ) into v_servicios
  from public.servicios
  where vehiculo_id = v_vehiculo.id;

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

