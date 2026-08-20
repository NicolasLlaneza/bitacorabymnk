-- ════════════════════════════════════════════════════════════════════
-- RPC: clientes_dormidos
-- ════════════════════════════════════════════════════════════════════
-- El panel /inicio necesita mostrar clientes activos cuya última visita
-- fue hace más de N meses. La implementación anterior traía
-- 'clientes(*, servicios(fecha))' — un join que devuelve una fila por
-- servicio, con la info del cliente duplicada N veces.
--
-- Con 100 clientes × 20 servicios cada uno son 2000 filas por consulta.
-- El panel refetchea en cada focus/visibilitychange, así que multiplica.
--
-- Esta función devuelve solo los clientes dormidos, ya filtrados y con
-- la última visita agregada. El frontend recibe 5-20 filas típicamente.
-- ════════════════════════════════════════════════════════════════════

create or replace function public.clientes_dormidos(p_meses integer default 6)
returns table (
  id            uuid,
  nombre        text,
  telefono      text,
  ultima_visita date
)
language sql
security definer
set search_path = public
stable
as $$
  select
    c.id,
    c.nombre,
    c.telefono,
    max(s.fecha) as ultima_visita
  from public.clientes c
  join public.servicios s on s.cliente_id = c.id
  where c.activo = true
  group by c.id, c.nombre, c.telefono
  having max(s.fecha) < (current_date - (p_meses || ' months')::interval)
  order by max(s.fecha) asc;
$$;

-- Solo authenticated ejecuta (RLS ya filtró en las tablas base)
revoke execute on function public.clientes_dormidos(integer) from anon;
grant  execute on function public.clientes_dormidos(integer) to authenticated;
