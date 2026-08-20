import { useState } from 'react'
import { MessageCircle, ExternalLink, Check, X, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import logger from '@/lib/logger'
import { abrirWhatsApp } from '@/lib/whatsapp'
import { emitirNotifActualizada } from '@/lib/eventos'
import { notificar } from '@/lib/notificar'
import Modal from '@/components/Modal'
import Button from '@/components/Button'

/**
 * Modal de dos pasos para enviar una notificación por WhatsApp Web:
 *
 *   Paso 1 (instrucciones): explica qué va a pasar. Botón "Abrir WhatsApp"
 *          abre wa.me en una nueva pestaña y pasa al paso 2.
 *   Paso 2 (confirmación): pregunta si se envió. Si sí, marca la
 *          notificación como enviada y cierra. Si no, cancela sin cambios.
 *
 * Se separa el "abrir" del "confirmar" para no dar falsos positivos:
 * si el empleado abre la pestaña, se distrae y cierra sin enviar,
 * la notificación queda pendiente y la vuelve a ver en la lista.
 */
export default function EnviarWhatsAppModal({ notificacion, onEnviada, onClose }) {
  const [paso, setPaso]         = useState('instrucciones') // 'instrucciones' | 'confirmar'
  const [guardando, setGuardando] = useState(false)
  const [error, setError]       = useState(null)

  const cliente  = notificacion.clientes
  const telefono = cliente?.telefono ?? ''
  const nombre   = cliente?.nombre ?? '—'

  function handleAbrirWhatsApp() {
    const abrio = abrirWhatsApp(telefono, notificacion.mensaje)
    if (!abrio) {
      setError('No se pudo abrir WhatsApp. Revisá que el navegador no esté bloqueando pop-ups.')
      return
    }
    setError(null)
    setPaso('confirmar')
  }

  async function handleConfirmarEnviado() {
    setGuardando(true)
    const { error } = await supabase
      .from('notificaciones')
      .update({
        estado:     'enviada',
        enviado_at: new Date().toISOString(),
        error_msg:  null,
      })
      .eq('id', notificacion.id)
    setGuardando(false)

    if (error) {
      logger.error(error)
      setError('No se pudo marcar como enviada: ' + error.message)
      return
    }
    // Notificamos globalmente: cualquier vista abierta (tabla, toast,
    // widget de inicio) puede actualizar sin refetch completo.
    emitirNotifActualizada({
      id:     notificacion.id,
      estado: 'enviada',
    })
    notificar.exito(`Recordatorio enviado a ${nombre}`)
    onEnviada?.()
    onClose()
  }

  // ── Paso 2: confirmación ─────────────────────────────────────────
  if (paso === 'confirmar') {
    return (
      <Modal title="¿Enviaste el mensaje?" onClose={onClose}>
        <div className="space-y-5">
          <p className="text-gray-200 text-sm">
            Abrimos WhatsApp con el mensaje para <strong className="text-gray-100">{nombre}</strong>.
            Confirmá qué pasó:
          </p>

          <div className="bg-dark-300 border border-dark-400 rounded p-3 space-y-2 text-xs text-gray-300">
            <p className="font-semibold text-gray-200 uppercase tracking-wider">Cómo confirmar</p>
            <p>
              <strong className="text-gray-100">Sí, ya lo envié:</strong> si tocaste el botón
              verde en WhatsApp y viste que el mensaje salió. Marcamos como enviada.
            </p>
            <p>
              <strong className="text-gray-100">No, todavía no:</strong> si cerraste sin enviar
              o querés dejarlo para después. Queda pendiente y aparece de nuevo en la lista.
            </p>
          </div>

          {error && <p className="text-red-bright text-sm">{error}</p>}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="ghost"
              className="flex-1 justify-center"
              onClick={onClose}
            >
              <X size={15} />
              No, todavía no
            </Button>
            <Button
              type="button"
              className="flex-1 justify-center"
              loading={guardando}
              onClick={handleConfirmarEnviado}
            >
              <Check size={15} />
              Sí, ya lo envié
            </Button>
          </div>
        </div>
      </Modal>
    )
  }

  // ── Paso 1: instrucciones ────────────────────────────────────────
  const puedeEnviar = !!telefono

  return (
    <Modal title="Enviar por WhatsApp" onClose={onClose}>
      <div className="space-y-5">

        <div className="bg-dark-300 border border-dark-400 rounded p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-200">Cliente</span>
            <span className="text-gray-100 font-medium">{nombre}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-200">Teléfono</span>
            <span className="text-gray-100 font-mono">{telefono || '—'}</span>
          </div>
        </div>

        <div>
          <p className="text-gray-200 text-xs uppercase tracking-wider font-semibold mb-2">
            Mensaje que se va a enviar
          </p>
          <div className="bg-dark-300 border border-dark-400 rounded p-3 text-sm text-gray-100 whitespace-pre-wrap max-h-40 overflow-y-auto">
            {notificacion.mensaje}
          </div>
        </div>

        <div className="bg-dark-300 border border-dark-400 rounded p-3 space-y-2 text-xs text-gray-300">
          <p className="font-semibold text-gray-200 uppercase tracking-wider">Cómo funciona</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Tocás el botón de abajo. Se abre WhatsApp Web (o la app en el celular) en otra pestaña.</li>
            <li>El mensaje ya viene escrito. Tocás el botón verde para enviarlo.</li>
            <li>Volvés a esta pestaña y confirmás si lo enviaste.</li>
          </ol>
        </div>

        {!puedeEnviar && (
          <div className="flex items-start gap-3 p-3 border border-yellow-500/40 bg-yellow-500/10 rounded">
            <AlertTriangle size={18} className="text-yellow-500 shrink-0 mt-0.5" />
            <p className="text-sm text-gray-100">
              Este cliente no tiene teléfono cargado. Editá el cliente y agregá uno.
            </p>
          </div>
        )}

        {error && <p className="text-red-bright text-sm">{error}</p>}

        <div className="flex gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="flex-1 justify-center"
            onClick={handleAbrirWhatsApp}
            disabled={!puedeEnviar}
          >
            <MessageCircle size={15} />
            Abrir WhatsApp
            <ExternalLink size={13} />
          </Button>
        </div>
      </div>
    </Modal>
  )
}
