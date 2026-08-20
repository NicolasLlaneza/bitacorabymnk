-- ════════════════════════════════════════════════════════════════════
-- Bajar el mínimo de contraseña de 12 a 8 caracteres
-- ════════════════════════════════════════════════════════════════════
-- Re-define cambiar_mi_password con el nuevo mínimo. Coincide con el
-- constant MIN_PASSWORD del frontend y de admin-create-user.
--
-- IMPORTANTE: si Supabase Auth tiene "Minimum password length" > 8 en el
-- dashboard (Auth → Providers → Email), admin.createUser sigue rechazando
-- passwords cortas. Hay que bajarlo también a 8 en el dashboard para que
-- el alta de usuarios acepte contraseñas de 8-11 chars.
-- ════════════════════════════════════════════════════════════════════

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

  if p_nueva is null or length(p_nueva) < 8 then
    raise exception 'La contraseña debe tener al menos 8 caracteres'
      using errcode = '22023';
  end if;

  select debe_cambiar_password into v_debe_cambiar
    from public.profiles
   where id = v_uid;

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

    if v_stored = crypt(p_nueva, v_stored) then
      raise exception 'La nueva contraseña tiene que ser distinta de la actual'
        using errcode = '22023';
    end if;
  end if;

  update auth.users
     set encrypted_password = crypt(p_nueva, gen_salt('bf', 10)),
         updated_at         = now()
   where id = v_uid;

  update public.profiles
     set debe_cambiar_password = false,
         updated_at            = now()
   where id = v_uid
     and debe_cambiar_password = true;
end;
$$;
