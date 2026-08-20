-- ════════════════════════════════════════════════════════════════════
-- NEU+ — Auto-creación de perfil al registrar usuario en Auth
-- ════════════════════════════════════════════════════════════════════
-- Problema: crear un usuario desde el dashboard de Supabase solo
-- inserta en auth.users, dejando public.profiles vacío. Sin esa fila,
-- is_active_admin() devuelve false y RLS bloquea todo acceso.
--
-- Solución: trigger AFTER INSERT en auth.users que crea el perfil
-- automáticamente con valores provisionales editables después.
-- ════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────
-- FUNCIÓN: handle_new_user
-- Crea automáticamente una fila en public.profiles cuando se registra
-- un nuevo usuario en Supabase Auth (vía dashboard, API o seed.sql).
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nombre, rol, activo)
  values (
    new.id,
    split_part(new.email, '@', 1),
    'admin',
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ─────────────────────────────────────────────────────────────────────
-- BACKFILL: usuarios existentes sin perfil
-- Cubre usuarios ya creados desde el dashboard antes de este trigger.
-- ─────────────────────────────────────────────────────────────────────
insert into public.profiles (id, nombre, rol, activo)
select
  id,
  split_part(email, '@', 1),
  'admin',
  true
from auth.users
where id not in (select id from public.profiles)
on conflict (id) do nothing;
