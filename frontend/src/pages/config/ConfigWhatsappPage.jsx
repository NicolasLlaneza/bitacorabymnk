import { useState, useEffect, useRef } from 'react'
import { CheckCircle, AlertTriangle, MessageCircle, Unlink } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Button from '@/components/Button'
import logger from '@/lib/logger'
import { useFacebookSdk } from '@/hooks/useFacebookSdk'

const FB_CONFIG_ID = import.meta.env.VITE_FB_CONFIG_ID

export default function ConfigWhatsappPage() {
  const [config, setConfig]         = useState(null)
  const [loading, setLoading]       = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [error, setError]           = useState(null)
  const signupDataRef               = useRef(null)

  const { ready: fbReady, error: fbError } = useFacebookSdk()

  useEffect(() => { fetchConfig() }, [])

  // Escucha el postMessage con los datos que dispara el flujo de Embedded Signup
  useEffect(() => {
    function handleMessage(event) {
      if (!event.origin.endsWith('facebook.com')) return
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
        if (data?.type === 'WA_EMBEDDED_SIGNUP') {
          if (data.event === 'FINISH' || data.event === 'FINISH_ONLY_WABA') {
            signupDataRef.current = data.data
            logger.log('Embedded Signup: datos recibidos', data.data)
          } else if (data.event === 'CANCEL') {
            setError('Conexión cancelada por el usuario')
            setConnecting(false)
          } else if (data.event === 'ERROR') {
            setError('Error en el flujo de conexión: ' + (data.data?.error_message ?? 'desconocido'))
            setConnecting(false)
          }
        }
      } catch { /* mensaje no era JSON, ignorar */ }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  async function fetchConfig() {
    setLoading(true)
    const { data, error } = await supabase
      .from('configuracion_whatsapp')
      .select('*, profiles:conectado_por(nombre)')
      .maybeSingle()
    if (error) logger.error(error)
    setConfig(data)
    setLoading(false)
  }

  async function handleConnect() {
    setError(null)

    if (!fbReady) {
      setError(fbError ?? 'El SDK de Facebook todavía no está listo. Esperá unos segundos y volvé a probar.')
      return
    }
    if (!FB_CONFIG_ID) {
      setError('Falta configurar VITE_FB_CONFIG_ID en las variables de entorno.')
      return
    }

    setConnecting(true)
    signupDataRef.current = null

    // Lanza el Embedded Signup — el listener de postMessage recibe los IDs
    // y el callback recibe el "code" que canjeamos por access_token en el backend.
    // NOTA: el SDK de Facebook NO acepta callbacks async; usamos función normal
    // y envolvemos el trabajo async en una IIFE.
    window.FB.login(
      (response) => {
        (async () => {
          try {
            if (!response.authResponse) {
              setError('No se completó la autorización con Facebook')
              return
            }

            const code = response.authResponse.code
            const signupData = signupDataRef.current

            if (!signupData?.phone_number_id || !signupData?.waba_id) {
              setError('El flujo terminó pero no recibimos los IDs de WhatsApp. Reintentá.')
              return
            }

            // Canjeamos el code por access_token en el backend (edge function)
            const { data: exchangeData, error: exchangeError } = await supabase.functions.invoke(
              'exchange-fb-code',
              { body: { code } }
            )

            if (exchangeError || exchangeData?.error) {
              setError('No se pudo canjear el código: ' + (exchangeData?.error ?? exchangeError.message))
              return
            }

            // Guardamos la config en la BD
            const { error: insertError } = await supabase
              .from('configuracion_whatsapp')
              .insert({
                waba_id:         signupData.waba_id,
                phone_number_id: signupData.phone_number_id,
                display_name:    signupData.business_name ?? null,
                numero_visible:  signupData.phone_number ?? null,
              })

            if (insertError) {
              setError('No se pudo guardar la config: ' + insertError.message)
              return
            }

            await fetchConfig()
          } finally {
            setConnecting(false)
          }
        })()
      },
      {
        config_id:                     FB_CONFIG_ID,
        response_type:                 'code',
        override_default_response_type: true,
        extras: {
          setup:              {},
          featureType:        'whatsapp_business_app_onboarding', // Coexistence
          sessionInfoVersion: '3',
        },
      }
    )
  }

  async function handleDisconnect() {
    if (!config) return
    setDisconnecting(true)
    const { error } = await supabase
      .from('configuracion_whatsapp')
      .delete()
      .eq('id', config.id)
    if (error) {
      logger.error(error)
      setError('No se pudo desconectar. Intentá de nuevo.')
    } else {
      setConfig(null)
    }
    setDisconnecting(false)
  }

  if (loading) return <p className="text-gray-200 text-sm">Cargando...</p>

  return (
    <div className="max-w-2xl">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-gray-100 text-lg font-bold uppercase tracking-widest mb-2">
          WhatsApp Business
        </h1>
        <p className="text-gray-200 text-sm">
          Conectá la cuenta de WhatsApp Business del taller para enviar recordatorios automáticos.
        </p>
      </div>

      {/* Estado NO conectado */}
      {!config && (
        <div className="bg-dark-200 border border-dark-400 rounded-lg p-6 space-y-5">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-yellow-500 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-gray-100 text-sm font-semibold mb-1">
                Sin cuenta conectada
              </h2>
              <p className="text-gray-200 text-sm">
                No se van a enviar recordatorios por WhatsApp hasta que conectes una cuenta.
              </p>
            </div>
          </div>

          <div className="border-t border-dark-400 pt-5 space-y-3">
            <p className="text-gray-200 text-xs uppercase tracking-wider font-semibold">
              Antes de conectar
            </p>
            <ul className="text-gray-200 text-sm space-y-1.5 list-disc list-inside">
              <li>Tener una cuenta de Facebook con acceso admin al portfolio del negocio</li>
              <li>El número que quieras conectar tiene que estar en WhatsApp Business App</li>
              <li>El proceso mantiene la app del celular funcionando (modo Coexistence)</li>
            </ul>
          </div>

          <Button onClick={handleConnect} loading={connecting} className="w-full justify-center">
            <MessageCircle size={16} />
            Conectar WhatsApp Business
          </Button>

          {error && (
            <p className="text-red-bright text-xs text-center">{error}</p>
          )}
        </div>
      )}

      {/* Estado conectado */}
      {config && (
        <div className="bg-dark-200 border border-dark-400 rounded-lg p-6 space-y-5">
          <div className="flex items-start gap-3">
            <CheckCircle size={20} className="text-green-500 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-gray-100 text-sm font-semibold mb-1">
                Cuenta conectada
              </h2>
              <p className="text-gray-200 text-sm">
                Los recordatorios se envían automáticamente desde este número.
              </p>
            </div>
          </div>

          <div className="border-t border-dark-400 pt-5">
            <dl className="space-y-3 text-sm">
              <Row label="Nombre visible"       value={config.display_name ?? '—'} />
              <Row label="Número"               value={config.numero_visible ?? '—'} mono />
              <Row label="Phone Number ID"      value={config.phone_number_id} mono small />
              <Row label="WABA ID"              value={config.waba_id} mono small />
              <Row label="Conectado el"         value={formatDate(config.conectado_at)} />
              <Row label="Conectado por"        value={config.profiles?.nombre ?? '—'} />
            </dl>
          </div>

          <div className="border-t border-dark-400 pt-5">
            <Button
              variant="danger"
              onClick={handleDisconnect}
              loading={disconnecting}
              className="w-full justify-center"
            >
              <Unlink size={16} />
              Desconectar cuenta
            </Button>
            <p className="text-gray-300 text-xs text-center mt-2">
              Los recordatorios dejarán de enviarse hasta reconectar.
            </p>
          </div>

          {error && (
            <p className="text-red-bright text-xs text-center">{error}</p>
          )}
        </div>
      )}
    </div>
  )
}

function Row({ label, value, mono = false, small = false }) {
  return (
    <div className="flex justify-between items-baseline gap-3">
      <dt className="text-gray-200 text-xs uppercase tracking-wider whitespace-nowrap">
        {label}
      </dt>
      <dd className={`text-gray-100 text-right break-all ${mono ? 'font-mono' : ''} ${small ? 'text-xs' : ''}`}>
        {value}
      </dd>
    </div>
  )
}

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
