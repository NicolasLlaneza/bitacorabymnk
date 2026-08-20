import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  DollarSign, Wrench, UserPlus, Receipt,
  AlertTriangle, BellOff, Clock, TrendingUp,
  MessageCircle, CalendarClock,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { formatFechaAR, formatFechaHoraAR, estaDentroDeLasProximas } from '@/lib/fecha'
import { EVENTOS, suscribirseA } from '@/lib/eventos'
import { useCachedResource } from '@/hooks/useCachedResource'
import logger from '@/lib/logger'
import { COLORS } from '@/lib/colors'
import { formatearARS } from '@/lib/formato'
import { ROUTES } from '@/lib/routes'
import { ROLES } from '@/lib/catalogos'
import EnviarWhatsAppModal from '@/components/EnviarWhatsAppModal'
import Button from '@/components/Button'

const MESES_INACTIVIDAD = 6   // umbral para considerar a un cliente "dormido"

function primerDiaDelMes() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
}

function hace(meses) {
  const d = new Date()
  d.setMonth(d.getMonth() - meses)
  return d.toISOString().split('T')[0]
}

// Fecha de mañana en YYYY-MM-DD (hora Argentina). Se usa como corte
// superior para "notificaciones de las próximas 24hs": traemos las de
// hoy o mañana y filtramos con precisión en el cliente por fecha+hora.
function mananaFecha() {
  const d = new Date()
  d.setHours(d.getHours() - 3)
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}


// Carga los datos del panel. Se saca del componente para poder pasarla
// al hook como fetcher puro (sin capturar setState).
async function cargarPanel(esSuperadmin) {
  const desdeMes = primerDiaDelMes()

  // TEMP: logs de diagnóstico para bug de KPIs en $0. Remover cuando esté resuelto.
  console.log('[InicioPage] cargarPanel — desdeMes:', desdeMes, 'hace(6):', hace(6), 'mananaFecha:', mananaFecha())

  const [
    sinCobrar,
    serviciosMes,
    clientesMes,
    notifsFallidas,
    notifsPendientes,
    notifsProximas,
    tiposServicio,
    actividad,
    dormidosRes,
  ] = await Promise.all([
        // Servicios sin cobrar (con datos de contacto para poder accionar)
        supabase
          .from('servicios')
          .select('id, fecha, tipo, importe, clientes(nombre, telefono), vehiculos(patente)')
          .eq('cobrado', false)
          .not('importe', 'is', null)
          .order('fecha'),

        // Servicios del mes en curso
        supabase
          .from('servicios')
          .select('id, tipo, importe')
          .gte('fecha', desdeMes),

        // Clientes nuevos del mes
        supabase
          .from('clientes')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', desdeMes),

        // Notificaciones fallidas
        supabase
          .from('notificaciones')
          .select('id', { count: 'exact', head: true })
          .eq('estado', 'fallida'),

        // Notificaciones pendientes (total, para el KPI)
        supabase
          .from('notificaciones')
          .select('id', { count: 'exact', head: true })
          .eq('estado', 'pendiente'),

        // Notificaciones pendientes con envío en las próximas 24hs.
        // Se traen los datos del cliente porque el widget muestra un botón
        // "Enviar por WhatsApp" que abre el modal — necesita teléfono y mensaje.
        supabase
          .from('notificaciones')
          .select('id, mensaje, motivo, fecha_envio, hora_envio, cliente_id, clientes(nombre, telefono)')
          .eq('estado', 'pendiente')
          .lte('fecha_envio', mananaFecha())
          .order('fecha_envio')
          .order('hora_envio'),

        // Todos los servicios para el ranking por tipo (últimos 6 meses)
        supabase
          .from('servicios')
          .select('tipo')
          .gte('fecha', hace(6)),

        // Registro de actividad (solo superadmin)
        esSuperadmin
          ? supabase
              .from('servicios')
              .select('id, tipo, created_at, profiles:registrado_por(nombre), clientes(nombre)')
              .order('created_at', { ascending: false })
              .limit(15)
          : Promise.resolve({ data: [] }),

    // Clientes dormidos: RPC agregada en migration 013
    // (evita traer todos los servicios de todos los clientes).
    supabase.rpc('clientes_dormidos', { p_meses: MESES_INACTIVIDAD }),
  ])

  // Log de errores silenciosos: si alguna query falla, supabase-js devuelve
  // { data: null, error: ... } sin throw. Sin este log, los KPIs quedan en 0
  // sin explicación visible en runtime.
  const respuestas = { sinCobrar, serviciosMes, clientesMes, notifsFallidas, notifsPendientes, notifsProximas, tiposServicio, actividad, dormidosRes }
  for (const [nombre, res] of Object.entries(respuestas)) {
    if (res?.error) console.error(`[InicioPage] query "${nombre}" falló:`, res.error)
  }
  console.log('[InicioPage] serviciosMes.data:', serviciosMes.data, 'tiposServicio.data:', tiposServicio.data)

  const dormidos = dormidosRes.data ?? []

  // Ranking de tipos de servicio
  const conteo = {}
  for (const s of tiposServicio.data ?? []) {
    conteo[s.tipo] = (conteo[s.tipo] ?? 0) + 1
  }
  const ranking = Object.entries(conteo)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)

  const serviciosDelMes = serviciosMes.data ?? []
  const facturadoMes = serviciosDelMes.reduce((acc, s) => acc + Number(s.importe ?? 0), 0)
  const conImporte   = serviciosDelMes.filter(s => s.importe != null)

  // Filtrar en cliente por fecha+hora exacta dentro de las próximas 24h.
  // La query trajo hasta mañana, pero puede incluir notificaciones de
  // mañana con hora posterior a "ahora + 24hs" — las descartamos.
  const proximas = (notifsProximas.data ?? []).filter(n =>
    estaDentroDeLasProximas(n.fecha_envio, n.hora_envio, 24)
  )

  return {
    sinCobrar:       sinCobrar.data ?? [],
    totalSinCobrar:  (sinCobrar.data ?? []).reduce((acc, s) => acc + Number(s.importe ?? 0), 0),
    dormidos,
    facturadoMes,
    cantServiciosMes: serviciosDelMes.length,
    ticketPromedio:  conImporte.length ? facturadoMes / conImporte.length : 0,
    clientesNuevos:  clientesMes.count ?? 0,
    notifsFallidas:  notifsFallidas.count ?? 0,
    notifsPendientes: notifsPendientes.count ?? 0,
    proximas,
    ranking,
    maxRanking:      ranking[0]?.[1] ?? 1,
    actividad:       actividad.data ?? [],
  }
}

export default function InicioPage() {
  const { profile } = useAuth()
  const esSuperadmin = profile?.rol === ROLES.SUPERADMIN
  const [sendingNotif, setSendingNotif] = useState(null)

  // Cache SWR: si volvimos a esta página en menos de 30s, muestra datos al
  // toque y revalida en background. Cualquier mutación relevante invalida
  // el cache y fuerza refetch.
  const claveCache = `inicio:panel:${esSuperadmin ? 'super' : 'admin'}`
  const { data, loading } = useCachedResource(
    claveCache,
    () => cargarPanel(esSuperadmin),
    {
      invalidaEn: [
        EVENTOS.servicioActualizado,
        EVENTOS.clienteActualizado,
        EVENTOS.notifActualizada,
        EVENTOS.vehiculoActualizado,
      ],
    }
  )

  // El hook useCachedResource ya maneja visibilitychange internamente
  // y también escucha los eventos de invalidaEn — no hace falta lógica
  // manual para refetch ni para sacar notifs del widget.

  if (loading) return <p className="text-gray-200 text-sm">Cargando panel...</p>
  if (!data)   return <p className="text-gray-200 text-sm">No se pudo cargar el panel.</p>

  const hayAlertas = data.sinCobrar.length > 0 || data.dormidos.length > 0 || data.notifsFallidas > 0

  return (
    <div className="space-y-6">

      {/* ── PRÓXIMAS 24 HS ── */}
      {data.proximas && data.proximas.length > 0 && (
        <section className="bg-dark-200 border-2 border-red rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CalendarClock size={18} className="text-red" />
            <h2 className="text-gray-100 text-sm font-bold uppercase tracking-widest">
              Para enviar en las próximas 24 horas
            </h2>
            <span className="ml-auto text-xs bg-red text-gray-100 px-2 py-0.5 rounded font-semibold tabular-nums">
              {data.proximas.length}
            </span>
          </div>
          <p className="text-gray-300 text-xs">
            Estos recordatorios están agendados para hoy o mañana. Tocá "Enviar" para abrir WhatsApp Web con el mensaje pre-cargado.
          </p>
          <div className="divide-y divide-dark-400 -mx-4">
            {data.proximas.map(n => (
              <div key={n.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-100 text-sm font-medium truncate">
                    {n.clientes?.nombre ?? '—'}
                    <span className="ml-2 text-xs text-gray-300 font-normal">
                      {formatFechaAR(n.fecha_envio)} · {n.hora_envio?.slice(0, 5)}
                    </span>
                  </p>
                  <p className="text-gray-300 text-xs truncate">{n.motivo}</p>
                </div>
                <Button size="sm" onClick={() => setSendingNotif(n)} className="shrink-0">
                  <MessageCircle size={13} /> Enviar
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── ALERTAS ── */}
      {hayAlertas && (
        <div className="space-y-2">
          {data.sinCobrar.length > 0 && (
            <AlertaCard
              icon={Receipt}
              color={COLORS.warning}
              titulo={`${data.sinCobrar.length} servicio${data.sinCobrar.length !== 1 ? 's' : ''} sin cobrar`}
              detalle={`${formatearARS(data.totalSinCobrar)} pendientes de cobro`}
              to={ROUTES.SERVICIOS}
            />
          )}
          {data.dormidos.length > 0 && (
            <AlertaCard
              icon={Clock}
              color={COLORS.danger}
              titulo={`${data.dormidos.length} cliente${data.dormidos.length !== 1 ? 's' : ''} sin volver`}
              detalle={`Sin servicios hace más de ${MESES_INACTIVIDAD} meses`}
              to={ROUTES.NOTIFICACIONES}
            />
          )}
          {data.notifsFallidas > 0 && (
            <AlertaCard
              icon={BellOff}
              color={COLORS.danger}
              titulo={`${data.notifsFallidas} notificación${data.notifsFallidas !== 1 ? 'es' : ''} fallida${data.notifsFallidas !== 1 ? 's' : ''}`}
              detalle="Revisá el motivo y reintentá el envío"
              to={ROUTES.NOTIFICACIONES}
            />
          )}
        </div>
      )}

      {/* ── KPIs DEL MES ── */}
      <section>
        <h2 className="text-xs uppercase tracking-widest text-gray-200 font-semibold mb-3">
          Este mes
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard icon={DollarSign} label="Facturado"       valor={formatearARS(data.facturadoMes)} />
          <KpiCard icon={Wrench}     label="Servicios"       valor={data.cantServiciosMes} />
          <KpiCard icon={TrendingUp} label="Ticket promedio" valor={formatearARS(data.ticketPromedio)} />
          <KpiCard icon={UserPlus}   label="Clientes nuevos" valor={data.clientesNuevos} />
        </div>
      </section>

      {/* ── SERVICIOS SIN COBRAR ── */}
      {data.sinCobrar.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-widest text-gray-200 font-semibold mb-3">
            Pendientes de cobro
          </h2>
          <div className="bg-dark-200 border border-dark-400 rounded-lg overflow-x-auto">
            <table className="w-full text-sm min-w-[600px] whitespace-nowrap">
              <thead>
                <tr className="border-b border-dark-400">
                  {['Cliente', 'Vehículo', 'Servicio', 'Fecha', 'Importe'].map(c => (
                    <th key={c} className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-gray-200">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.sinCobrar.slice(0, 10).map(s => (
                  <tr key={s.id} className="border-b border-dark-400 last:border-0 hover:bg-dark-300 transition-colors">
                    <td className="px-4 py-2.5 text-gray-100">{s.clientes?.nombre ?? '—'}</td>
                    <td className="px-4 py-2.5 text-gray-200 font-mono text-xs">{s.vehiculos?.patente ?? '—'}</td>
                    <td className="px-4 py-2.5 text-gray-200">{s.tipo}</td>
                    <td className="px-4 py-2.5 text-gray-200">{formatFechaAR(s.fecha)}</td>
                    <td className="px-4 py-2.5 text-yellow-500 font-medium">{formatearARS(s.importe)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.sinCobrar.length > 10 && (
            <p className="text-xs text-gray-300 mt-2">
              Mostrando 10 de {data.sinCobrar.length}.{' '}
              <Link to={ROUTES.SERVICIOS} className="text-red hover:text-red-bright">Ver todos</Link>
            </p>
          )}
        </section>
      )}

      {/* ── CLIENTES DORMIDOS ── */}
      {data.dormidos.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-widest text-gray-200 font-semibold mb-3">
            Clientes sin volver hace {MESES_INACTIVIDAD}+ meses
          </h2>
          <div className="bg-dark-200 border border-dark-400 rounded-lg overflow-x-auto">
            <table className="w-full text-sm min-w-[400px] whitespace-nowrap">
              <thead>
                <tr className="border-b border-dark-400">
                  {['Cliente', 'Teléfono', ''].map(c => (
                    <th key={c} className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-gray-200">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.dormidos.slice(0, 10).map(c => (
                  <tr key={c.id} className="border-b border-dark-400 last:border-0 hover:bg-dark-300 transition-colors">
                    <td className="px-4 py-2.5 text-gray-100">{c.nombre}</td>
                    <td className="px-4 py-2.5 text-gray-200">{c.telefono}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Link
                        to={ROUTES.NOTIFICACIONES}
                        className="text-xs text-red hover:text-red-bright font-semibold uppercase tracking-wider"
                      >
                        Contactar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── RANKING DE SERVICIOS ── */}
      {data.ranking.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-widest text-gray-200 font-semibold mb-3">
            Servicios más frecuentes · últimos 6 meses
          </h2>
          <div className="bg-dark-200 border border-dark-400 rounded-lg p-4 space-y-3">
            {data.ranking.map(([tipo, cantidad]) => (
              <div key={tipo}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-100">{tipo}</span>
                  <span className="text-gray-200 tabular-nums">{cantidad}</span>
                </div>
                <div className="h-1.5 bg-dark-400 rounded overflow-hidden">
                  <div
                    className="h-full bg-red rounded"
                    style={{ width: `${(cantidad / data.maxRanking) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── REGISTRO DE ACTIVIDAD (solo superadmin) ── */}
      {esSuperadmin && data.actividad.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-widest text-gray-200 font-semibold mb-3">
            Actividad reciente
          </h2>
          <div className="bg-dark-200 border border-dark-400 rounded-lg divide-y divide-dark-400">
            {data.actividad.map(a => (
              <div key={a.id} className="px-4 py-2.5 flex items-baseline justify-between gap-3 text-sm">
                <span className="text-gray-200">
                  <span className="text-gray-100 font-medium">{a.profiles?.nombre ?? 'Sistema'}</span>
                  {' registró '}
                  <span className="text-gray-100">{a.tipo}</span>
                  {a.clientes?.nombre && <> para {a.clientes.nombre}</>}
                </span>
                <span className="text-gray-300 text-xs whitespace-nowrap">
                  {formatFechaHoraAR(a.created_at)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {sendingNotif && (
        <EnviarWhatsAppModal
          notificacion={sendingNotif}
          onClose={() => setSendingNotif(null)}
        />
      )}

    </div>
  )
}

// ─── Subcomponentes ─────────────────────────────────────────────────────

function AlertaCard({ icon: Icon, color, titulo, detalle, to }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 p-3 rounded border transition-colors hover:bg-dark-300"
      style={{ borderColor: color + '55', backgroundColor: color + '11' }}
    >
      <Icon size={18} style={{ color }} className="shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-gray-100 text-sm font-medium">{titulo}</p>
        <p className="text-gray-300 text-xs">{detalle}</p>
      </div>
    </Link>
  )
}

function KpiCard({ icon: Icon, label, valor }) {
  return (
    <div className="bg-dark-200 border border-dark-400 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className="text-gray-300" />
        <span className="text-xs uppercase tracking-wider text-gray-300">{label}</span>
      </div>
      <p className="text-gray-100 text-xl font-bold tabular-nums">{valor}</p>
    </div>
  )
}
