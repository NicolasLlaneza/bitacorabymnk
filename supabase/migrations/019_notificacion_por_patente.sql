-- ════════════════════════════════════════════════════════════════════
-- Notificaciones asociadas a un vehículo (carga por patente)
-- ════════════════════════════════════════════════════════════════════
-- El taller quiere programar notificaciones buscando por patente, no
-- solo por cliente. Hasta ahora el vehículo solo se conocía si la
-- notificación tenía un servicio asociado (servicio_id → vehiculo_id).
--
-- Agrega vehiculo_id opcional: la notificación sigue siendo para un
-- cliente (cliente_id, a quien se le envía el WhatsApp), y además puede
-- indicar de qué vehículo se trata. Las políticas RLS de la tabla
-- cubren la columna nueva sin cambios.
--
-- Backfill: las notificaciones existentes con servicio toman el
-- vehículo de ese servicio.
-- ════════════════════════════════════════════════════════════════════

alter table public.notificaciones
  add column if not exists vehiculo_id uuid
    references public.vehiculos(id) on delete set null;

create index if not exists idx_notif_vehiculo
  on public.notificaciones(vehiculo_id);

update public.notificaciones n
   set vehiculo_id = s.vehiculo_id
  from public.servicios s
 where n.servicio_id = s.id
   and n.vehiculo_id is null;
