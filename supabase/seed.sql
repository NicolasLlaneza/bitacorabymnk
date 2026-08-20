-- ════════════════════════════════════════════════════════════════════
-- NEU+ — Usuarios de prueba
-- ════════════════════════════════════════════════════════════════════
-- Ejecutar en Supabase SQL Editor (requiere acceso a auth.users)
-- Contraseña de ambos usuarios: Test1234!
-- ════════════════════════════════════════════════════════════════════

do $$
declare
  v_user1_id uuid := gen_random_uuid();
  v_user2_id uuid := gen_random_uuid();
begin

  -- ─── Usuario de prueba 1 ─────────────────────────────────────────
  insert into auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role,
    aud
  ) values (
    v_user1_id,
    '00000000-0000-0000-0000-000000000000',
    'test@neuplus.com',
    crypt('Test1234!', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    false,
    'authenticated',
    'authenticated'
  )
  on conflict (email) do nothing;

  insert into auth.identities (
    id,
    user_id,
    provider_id,
    provider,
    identity_data,
    created_at,
    updated_at,
    last_sign_in_at
  ) values (
    gen_random_uuid(),
    v_user1_id,
    'test@neuplus.com',
    'email',
    jsonb_build_object('sub', v_user1_id, 'email', 'test@neuplus.com'),
    now(),
    now(),
    now()
  )
  on conflict do nothing;

  insert into public.profiles (id, nombre, rol, activo)
  values (v_user1_id, 'Admin de Prueba', 'admin', true)
  on conflict (id) do nothing;


  -- ─── Usuario de prueba 2 ─────────────────────────────────────────
  insert into auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role,
    aud
  ) values (
    v_user2_id,
    '00000000-0000-0000-0000-000000000000',
    'test2@neuplus.com',
    crypt('Test1234!', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    false,
    'authenticated',
    'authenticated'
  )
  on conflict (email) do nothing;

  insert into auth.identities (
    id,
    user_id,
    provider_id,
    provider,
    identity_data,
    created_at,
    updated_at,
    last_sign_in_at
  ) values (
    gen_random_uuid(),
    v_user2_id,
    'test2@neuplus.com',
    'email',
    jsonb_build_object('sub', v_user2_id, 'email', 'test2@neuplus.com'),
    now(),
    now(),
    now()
  )
  on conflict do nothing;

  insert into public.profiles (id, nombre, rol, activo)
  values (v_user2_id, 'Admin de Prueba 2', 'admin', true)
  on conflict (id) do nothing;

end $$;
