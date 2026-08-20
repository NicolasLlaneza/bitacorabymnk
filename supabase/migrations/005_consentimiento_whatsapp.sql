-- ════════════════════════════════════════════════════════════════════
-- Consentimiento explícito de WhatsApp por cliente
-- ════════════════════════════════════════════════════════════════════
-- Meta WhatsApp Business Policy + Ley 25.326 exigen que el titular
-- del teléfono haya autorizado recibir mensajes de la empresa.
--
-- El admin del taller marca el checkbox en la ficha del cliente
-- después de que este da su consentimiento (verbal o escrito).
--
-- Los clientes existentes al momento de esta migración quedan como
-- 'acepta_whatsapp = true' asumiendo consentimiento implícito histórico
-- (el taller ya los tenía en su cartera y les escribía por WhatsApp).
-- Cambios individuales pueden desmarcarse desde la UI.
-- ════════════════════════════════════════════════════════════════════

alter table public.clientes
  add column if not exists acepta_whatsapp boolean not null default true;

alter table public.clientes
  add column if not exists fecha_consentimiento timestamptz;

-- Marcar la fecha de consentimiento en los existentes con la fecha de creación
-- (aproximación: asumimos que dieron consentimiento cuando fueron cargados)
update public.clientes
   set fecha_consentimiento = created_at
 where fecha_consentimiento is null;

-- Trigger: cuando se marca acepta_whatsapp = true, setear fecha_consentimiento
-- si aún no la tiene, o actualizarla si estaba en false y ahora en true
create or replace function public.set_fecha_consentimiento()
returns trigger language plpgsql as $$
begin
  if new.acepta_whatsapp = true and (old is null or old.acepta_whatsapp = false) then
    new.fecha_consentimiento := now();
  end if;
  return new;
end;
$$;

drop trigger if exists tr_clientes_consentimiento on public.clientes;
create trigger tr_clientes_consentimiento
  before insert or update of acepta_whatsapp on public.clientes
  for each row execute function public.set_fecha_consentimiento();
