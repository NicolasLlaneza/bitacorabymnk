import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell, X, MessageCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import logger from '@/lib/logger'
import { estaProntoAVencer } from '@/lib/fecha'
import { EVENTOS, suscribirseA } from '@/lib/eventos'
import EnviarWhatsAppModal from './EnviarWhatsAppModal'
import Button from './Button'

// Cada cuánto revisamos si hay notificaciones vencidas.
// Un minuto es suficiente: el envío es manual, no importan los segundos.
const POLL_MS   = 60 * 1000
// Cuando el usuario descarta el toast, no lo mostramos de nuevo hasta pasado esto.
// Evita que se convierta en un pop-up molesto si sigue habiendo pendientes.
const SNOOZE_MS = 30 * 60 * 1000
// Ventana de aviso: mostramos también notificaciones a X minutos de vencer,
// no solo las ya vencidas. Da tiempo a preparse antes.
const VENTANA_MIN = 10

/**
 * Toast fijo abajo a la derecha que avisa cuando hay notificaciones
 * cuya hora programada ya llegó (o llega pronto). Solo aparece dentro
 * del layout autenticado (AppLayout), así que RLS ya garantiza que
 * el usuario tiene permisos.
 *
 * Se refresca cada minuto. Al descartar, queda oculto por 30 min.
 */
export default function NotifVencidaToast() {
  const [pendientes, setPendientes] = useState([])
  const [oculto, setOculto]         = useState(false)
  const [sendingNotif, setSendingNotif] = useState(null)

  // Al descartar guardamos el instante. Un ref evita re-renders.
  const snoozeHastaRef = useRef(0)

  const fetchPendientes = useCallback(async () => {
    // Traemos las pendientes de hoy y las filtramos por hora en el cliente.
    // Es un dataset chico (max unas decenas), no vale la pena filtrar en SQL.
    const hoy = new Date()
    hoy.setHours(hoy.getHours() - 3)
    const hoyISO = hoy.toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('notificaciones')
      .select('id, mensaje, motivo, fecha_envio, hora_envio, cliente_id, clientes(nombre, telefono)')
      .eq('estado', 'pendiente')
      .lte('fecha_envio', hoyISO)
      .order('fecha_envio')
      .order('hora_envio')

    if (error) { logger.error(error); return }

    // Solo las que ya vencieron o vencen en los próximos VENTANA_MIN minutos.
    const vencidas = (data ?? []).filter(n =>
      estaProntoAVencer(n.fecha_envio, n.hora_envio, VENTANA_MIN)
    )
    setPendientes(vencidas)

    // Si el snooze venció y hay pendientes de nuevo, mostramos el toast.
    if (Date.now() >= snoozeHastaRef.current) setOculto(false)
  }, [])

  // Escuchar cuando alguien marca una notificación como enviada desde
  // cualquier vista: la sacamos del toast al toque, sin refetch.
  useEffect(() => {
    return suscribirseA(EVENTOS.notifActualizada, (e) => {
      const { id, estado } = e.detail ?? {}
      if (estado && estado !== 'pendiente') {
        setPendientes(prev => prev.filter(n => n.id !== id))
      }
    })
  }, [])

  // Polling activo solo cuando la pestaña está visible: sin nadie mirando,
  // consumir queries no aporta nada (nadie va a ver el toast). Ahorra
  // ~260k queries/mes con 6 usuarios logueados dejando tabs abiertas.
  // Al volver a estar visible, refetch inmediato para no esperar el próximo ciclo.
  useEffect(() => {
    let interval = null

    function iniciarPolling() {
      fetchPendientes()
      interval = setInterval(fetchPendientes, POLL_MS)
    }
    function detenerPolling() {
      if (interval) { clearInterval(interval); interval = null }
    }
    function handleVisibility() {
      if (document.visibilityState === 'visible') iniciarPolling()
      else detenerPolling()
    }

    if (document.visibilityState === 'visible') iniciarPolling()
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      detenerPolling()
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [fetchPendientes])

  function handleCerrar() {
    setOculto(true)
    snoozeHastaRef.current = Date.now() + SNOOZE_MS
  }

  if (oculto || pendientes.length === 0) return null

  // Mostramos la más próxima (la primera después del orden por hora).
  // Si hay más, indicamos el resto con un contador.
  const [primera, ...resto] = pendientes

  return (
    <>
      <div className="fixed bottom-20 md:bottom-4 right-4 z-40 w-[min(360px,calc(100vw-2rem))] bg-dark-200 border-2 border-red rounded-lg shadow-xl">
        <div className="p-3 flex items-start gap-3">
          <div className="shrink-0 mt-0.5 p-1.5 bg-red rounded">
            <Bell size={16} className="text-gray-100" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-gray-100 text-sm font-semibold">
              Toca enviar una notificación
            </p>
            <p className="text-gray-200 text-xs mt-0.5">
              <span className="text-gray-100 font-medium">{primera.clientes?.nombre ?? '—'}</span>
              {' · '}
              {primera.hora_envio?.slice(0, 5)}
              {resto.length > 0 && (
                <span className="text-gray-300"> · +{resto.length} más</span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCerrar}
            className="shrink-0 p-1 text-gray-300 hover:text-gray-100 transition-colors"
            aria-label="Cerrar aviso"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-3 pb-3">
          <Button
            size="sm"
            className="w-full justify-center"
            onClick={() => setSendingNotif(primera)}
          >
            <MessageCircle size={13} /> Enviar por WhatsApp
          </Button>
        </div>
      </div>

      {sendingNotif && (
        <EnviarWhatsAppModal
          notificacion={sendingNotif}
          onClose={() => setSendingNotif(null)}
        />
      )}
    </>
  )
}
