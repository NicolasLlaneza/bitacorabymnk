-- ════════════════════════════════════════════════════════════════════
-- Tabla: configuracion_whatsapp
-- ════════════════════════════════════════════════════════════════════
-- Guarda los IDs de WhatsApp Business obtenidos del Embedded Signup.
-- El phone_number_id ya no vive en un env var — se lee de acá para
-- que cuando el cliente reconecte su cuenta se actualice sin redeploys.
--
-- Diseño single-tenant: solo una fila permitida (unique index en constante).
-- Cuando eventualmente se soporte multi-taller, se agrega taller_id y se
-- reemplaza el unique index por unique(taller_id).
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.configuracion_whatsapp (
  id                uuid primary key default gen_random_uuid(),
  waba_id           text not null,
  phone_number_id   text not null,
  display_name      text,
  numero_visible    text,
  conectado_at      timestamptz not null default now(),
  conectado_por     uuid references public.profiles(id),
  updated_at        timestamptz not null default now()
);

-- Fuerza single-row: cualquier segunda inserción rompe por unique
create unique index if not exists configuracion_whatsapp_singleton
  on public.configuracion_whatsapp((true));

-- Trigger para mantener updated_at al día
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists tr_config_whatsapp_updated_at on public.configuracion_whatsapp;
create trigger tr_config_whatsapp_updated_at
  before update on public.configuracion_whatsapp
  for each row execute function public.set_updated_at();

-- Trigger para setear conectado_por con auth.uid() automáticamente
create or replace function public.set_conectado_por()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.conectado_por := auth.uid();
  return new;
end;
$$;

drop trigger if exists tr_config_whatsapp_audit on public.configuracion_whatsapp;
create trigger tr_config_whatsapp_audit
  before insert on public.configuracion_whatsapp
  for each row execute function public.set_conectado_por();

-- RLS
alter table public.configuracion_whatsapp enable row level security;

create policy "Admins ven config whatsapp"
  on public.configuracion_whatsapp for select
  using (public.is_active_admin());

create policy "Admins crean config whatsapp"
  on public.configuracion_whatsapp for insert
  with check (public.is_active_admin());

create policy "Admins actualizan config whatsapp"
  on public.configuracion_whatsapp for update
  using (public.is_active_admin());

create policy "Admins borran config whatsapp"
  on public.configuracion_whatsapp for delete
  using (public.is_active_admin());
