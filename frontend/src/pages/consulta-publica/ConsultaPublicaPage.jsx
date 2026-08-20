import { useState, useRef, useEffect, useMemo } from 'react'
import { Search, CheckCircle, XCircle, ChevronDown, Phone, MessageCircle, MapPin, Clock } from 'lucide-react'
import { Turnstile } from '@marsidev/react-turnstile'
import { supabase } from '@/lib/supabase'
import { MAX_LEN_PATENTE, tipoLabelsLargos as tipoLabels } from '@/lib/patente'
import { formatearKm } from '@/lib/formato'
import { WHATSAPP_BASE_URL } from '@/lib/whatsapp'
import { CONTACTO_TALLER } from '@/lib/empresa'
import { ROUTES } from '@/lib/routes'
import Logo from '@/components/Logo'
import Button from '@/components/Button'

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY


// step: 'search' → 'confirm' → 'results'

export default function ConsultaPublicaPage() {
  const [patente, setPatente]       = useState('')
  const [step, setStep]             = useState('search')
  const [resultado, setResultado]   = useState(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)
  const [captchaToken, setCaptchaToken] = useState(null)
  const [preview, setPreview]       = useState(null)  // URL de foto en vista ampliada
  const [expandidos, setExpandidos] = useState(new Set()) // servicios abiertos (índices)
  const [busqueda, setBusqueda]     = useState('')       // filtro del historial
  const turnstileRef = useRef(null)

  // Al llegar resultados nuevos, arrancamos todos colapsados — la vista queda
  // corta y el cliente elige qué servicio abrir. Con muchos servicios evita
  // el "chorizo" visual del scroll infinito.
  useEffect(() => {
    if (resultado) {
      setExpandidos(new Set())
      setBusqueda('')
    }
  }, [resultado])

  // Servicios filtrados por búsqueda (tipo, producto, observaciones).
  // Mantiene el índice original en `i` para que expandir siga funcionando
  // aunque el orden visual cambie.
  const serviciosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    const todos = (resultado?.servicios ?? []).map((s, i) => ({ ...s, __i: i }))
    if (!q) return todos
    return todos.filter(s =>
      (s.tipo ?? '').toLowerCase().includes(q) ||
      (s.producto ?? '').toLowerCase().includes(q) ||
      (s.observaciones ?? '').toLowerCase().includes(q) ||
      (s.fecha ?? '').includes(q)
    )
  }, [resultado, busqueda])

  function toggleServicio(i) {
    setExpandidos(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  async function handleBuscar(e) {
    e.preventDefault()
    if (!patente.trim()) return
    if (!captchaToken) { setError('Completá la verificación primero.'); return }

    setLoading(true)
    setError(null)

    // Llamamos a la Edge Function que verifica el CAPTCHA server-side
    // antes de exponer los datos del vehículo.
    const { data, error } = await supabase.functions.invoke('consulta-publica', {
      body: {
        patente:         patente.trim(),
        turnstile_token: captchaToken,
      },
    })

    // Cada búsqueda "gasta" el token. Reseteamos para la siguiente.
    turnstileRef.current?.reset()
    setCaptchaToken(null)

    if (error || data?.error) {
      const msg = data?.error ?? 'Ocurrió un error al consultar. Intentá de nuevo.'
      setError(msg)
    } else if (!data) {
      setError(`No encontramos ningún vehículo con la patente ${patente}.`)
    } else {
      setResultado(data)
      setStep('confirm')
    }
    setLoading(false)
  }

  function handleConfirmar() {
    setStep('results')
  }

  function handleRechazar() {
    setResultado(null)
    setStep('search')
    setPatente('')
    setCaptchaToken(null)
    turnstileRef.current?.reset()
  }

  return (
    <div className="min-h-screen bg-dark px-4 py-12 md:py-16">
      <div className="max-w-xl md:max-w-3xl mx-auto">

        {/* Logo */}
        <div className="flex justify-center mb-10">
          <Logo />
        </div>

        {/* Título */}
        <div className="text-center mb-8 md:mb-10">
          <h2 className="text-gray-100 text-lg md:text-2xl font-bold uppercase tracking-widest mb-2">
            Consulta de historial
          </h2>
          <p className="text-gray-200 text-sm md:text-base">
            Ingresá la patente de tu vehículo para ver sus servicios
          </p>
        </div>

        {/* ── STEP: SEARCH ── */}
        {step === 'search' && (
          <div className="space-y-4">
            <form onSubmit={handleBuscar} className="flex gap-3">
              <input
                value={patente}
                onChange={e => {
                  setPatente(e.target.value.toUpperCase().replace(/\s/g, ''))
                  setError(null)
                }}
                placeholder="Ej: AB123CD"
                maxLength={MAX_LEN_PATENTE}
                className="flex-1 bg-dark-200 border border-dark-400 text-gray-100 text-sm rounded px-4 py-2.5 outline-none focus:border-red transition-colors placeholder:text-gray-300 font-mono tracking-widest uppercase"
              />
              <Button type="submit" loading={loading} disabled={!captchaToken}>
                <Search size={15} />
                Buscar
              </Button>
            </form>

            {/* Captcha */}
            <div className="flex justify-center">
              <Turnstile
                ref={turnstileRef}
                siteKey={SITE_KEY}
                onSuccess={token => { setCaptchaToken(token); setError(null) }}
                onExpire={() => setCaptchaToken(null)}
                onError={() => { setCaptchaToken(null); setError('Error en la verificación. Recargá la página.') }}
                options={{ theme: 'dark', language: 'es' }}
              />
            </div>

            {error && (
              <p className="text-red-bright text-sm text-center">{error}</p>
            )}
          </div>
        )}

        {/* ── STEP: CONFIRM ── */}
        {step === 'confirm' && resultado && (
          <div className="bg-dark-200 border border-dark-400 rounded-lg p-6 space-y-5">
            <p className="text-gray-200 text-sm text-center">
              Encontramos el siguiente vehículo. ¿Es el tuyo?
            </p>

            <div className="bg-dark-300 rounded-lg p-4 text-center space-y-1">
              <p className="text-gray-100 text-2xl font-black font-mono tracking-widest">
                {resultado.patente}
              </p>
              <p className="text-gray-100 text-base font-semibold">
                {resultado.marca} {resultado.modelo}
                {resultado.anio && <span className="text-gray-200 font-normal"> · {resultado.anio}</span>}
              </p>
              <p className="text-gray-200 text-sm">
                {tipoLabels[resultado.tipo_patente] ?? resultado.tipo_patente}
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="danger"
                className="flex-1 justify-center"
                onClick={handleRechazar}
              >
                <XCircle size={15} />
                No es mi vehículo
              </Button>
              <Button
                className="flex-1 justify-center"
                onClick={handleConfirmar}
              >
                <CheckCircle size={15} />
                Sí, ver historial
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP: RESULTS ── */}
        {step === 'results' && resultado && (
          <div className="space-y-5">

            {/* Ficha del vehículo */}
            <div className="bg-dark-200 border border-dark-400 rounded-lg p-5 md:p-7">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-gray-100 text-2xl md:text-4xl font-black font-mono tracking-widest">
                    {resultado.patente}
                  </p>
                  <p className="text-gray-100 text-base md:text-xl font-medium mt-2">
                    {resultado.marca} {resultado.modelo}
                    {resultado.anio && <span className="text-gray-200 font-normal"> · {resultado.anio}</span>}
                  </p>
                </div>
                <span className="text-xs uppercase tracking-wider text-gray-200 bg-dark-400 px-2.5 py-1 rounded shrink-0">
                  {tipoLabels[resultado.tipo_patente] ?? resultado.tipo_patente}
                </span>
              </div>
            </div>

            {/* Historial */}
            <div className="bg-dark-200 border border-dark-400 rounded-lg overflow-hidden">
              <div className="px-5 md:px-7 py-3.5 border-b border-dark-400 flex items-baseline justify-between gap-3">
                <h3 className="text-xs md:text-sm uppercase tracking-widest text-gray-100 font-semibold">
                  Historial de servicios
                </h3>
                <span className="text-xs md:text-sm text-gray-200 tabular-nums">
                  {busqueda.trim()
                    ? `${serviciosFiltrados.length} de ${resultado.servicios.length}`
                    : `${resultado.servicios.length} ${resultado.servicios.length === 1 ? 'servicio' : 'servicios'}`}
                </span>
              </div>

              {/* Barra de búsqueda: solo si hay al menos 3 servicios, sino no aporta */}
              {resultado.servicios.length >= 3 && (
                <div className="px-5 md:px-7 py-3 border-b border-dark-400 bg-dark-300">
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                    <input
                      type="text"
                      value={busqueda}
                      onChange={e => setBusqueda(e.target.value)}
                      placeholder="Buscar por tipo, producto o fecha..."
                      className="w-full bg-dark-200 border border-dark-400 text-gray-100 text-sm md:text-base rounded pl-9 pr-8 py-2 outline-none focus:border-red transition-colors placeholder:text-gray-300"
                    />
                    {busqueda && (
                      <button
                        type="button"
                        onClick={() => setBusqueda('')}
                        aria-label="Limpiar búsqueda"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-100 transition-colors p-1"
                      >
                        <XCircle size={14} />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {resultado.servicios.length === 0 ? (
                <p className="px-5 py-8 text-gray-200 text-sm md:text-base text-center">Sin servicios registrados.</p>
              ) : serviciosFiltrados.length === 0 ? (
                <p className="px-5 py-8 text-gray-200 text-sm md:text-base text-center">
                  Sin resultados para "{busqueda}". Probá con otra palabra.
                </p>
              ) : (
                <div className="divide-y divide-dark-400">
                  {serviciosFiltrados.map((s) => {
                    const i = s.__i
                    const abierto = expandidos.has(i)
                    return (
                      <div key={i}>
                        {/* Encabezado clickeable */}
                        <button
                          type="button"
                          onClick={() => toggleServicio(i)}
                          aria-expanded={abierto}
                          className="w-full px-5 md:px-7 py-4 md:py-5 flex items-center justify-between gap-4 hover:bg-dark-300 transition-colors text-left"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-100 text-base md:text-lg font-semibold leading-tight">
                              {s.tipo}
                            </p>
                            <p className="text-gray-200 text-sm md:text-base mt-1 tabular-nums">
                              {s.fecha.split('-').reverse().join('/')}
                              {s.km != null && (
                                <span className="text-gray-300"> · {formatearKm(s.km)}</span>
                              )}
                            </p>
                          </div>
                          <ChevronDown
                            size={20}
                            className={`text-gray-200 shrink-0 transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`}
                          />
                        </button>

                        {/* Contenido expandido */}
                        {abierto && (
                          <div className="px-5 md:px-7 pb-6 pt-1 space-y-5">
                            {s.producto && (
                              <div>
                                <p className="text-xs uppercase tracking-widest text-gray-300 font-semibold mb-2">
                                  Producto
                                </p>
                                <p className="text-gray-100 text-sm md:text-base leading-relaxed whitespace-pre-line">
                                  {s.producto}
                                </p>
                              </div>
                            )}
                            {s.observaciones && (
                              <div>
                                <p className="text-xs uppercase tracking-widest text-gray-300 font-semibold mb-2">
                                  Detalle
                                </p>
                                <p className="text-gray-100 text-sm md:text-base leading-relaxed whitespace-pre-line">
                                  {s.observaciones}
                                </p>
                              </div>
                            )}
                            {Array.isArray(s.fotos) && s.fotos.length > 0 && (
                              <div>
                                <p className="text-xs uppercase tracking-widest text-gray-300 font-semibold mb-3">
                                  Fotos
                                </p>
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                                  {s.fotos.map((url, j) => (
                                    <button
                                      key={j}
                                      type="button"
                                      onClick={() => setPreview(url)}
                                      className="relative aspect-square bg-dark-300 rounded overflow-hidden border border-dark-400 hover:border-red transition-colors group"
                                    >
                                      <img
                                        src={url}
                                        alt={`Foto ${j + 1}`}
                                        className="w-full h-full object-cover cursor-zoom-in"
                                        loading="lazy"
                                        decoding="async"
                                      />
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Bloque de contacto del taller */}
            {(CONTACTO_TALLER.telefono || CONTACTO_TALLER.whatsapp || CONTACTO_TALLER.direccion) && (
              <div className="bg-dark-200 border border-dark-400 rounded-lg overflow-hidden">
                <div className="px-5 md:px-7 py-3.5 border-b border-dark-400">
                  <h3 className="text-xs md:text-sm uppercase tracking-widest text-gray-100 font-semibold">
                    Contactanos
                  </h3>
                </div>
                <div className="px-5 md:px-7 py-4 md:py-5 space-y-3">
                  {CONTACTO_TALLER.telefono && (
                    <a
                      href={`tel:${CONTACTO_TALLER.telefono.replace(/\s/g, '')}`}
                      className="flex items-center gap-3 text-gray-100 hover:text-red-bright transition-colors"
                    >
                      <Phone size={16} className="text-gray-200 shrink-0" />
                      <span className="text-sm md:text-base">{CONTACTO_TALLER.telefono}</span>
                    </a>
                  )}
                  {CONTACTO_TALLER.whatsapp && (
                    <a
                      href={`${WHATSAPP_BASE_URL}/${CONTACTO_TALLER.whatsapp}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-gray-100 hover:text-red-bright transition-colors"
                    >
                      <MessageCircle size={16} className="text-gray-200 shrink-0" />
                      <span className="text-sm md:text-base">Escribinos por WhatsApp</span>
                    </a>
                  )}
                  {CONTACTO_TALLER.direccion && (
                    <div className="flex items-start gap-3 text-gray-100">
                      <MapPin size={16} className="text-gray-200 shrink-0 mt-0.5" />
                      <span className="text-sm md:text-base">{CONTACTO_TALLER.direccion}</span>
                    </div>
                  )}
                  {CONTACTO_TALLER.horarios && (
                    <div className="flex items-start gap-3 text-gray-200">
                      <Clock size={16} className="text-gray-300 shrink-0 mt-0.5" />
                      <span className="text-xs md:text-sm">{CONTACTO_TALLER.horarios}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={handleRechazar}
              className="text-sm text-gray-200 hover:text-gray-100 transition-colors mx-auto block py-2"
            >
              ← Nueva consulta
            </button>
          </div>
        )}

        {/* Footer legal */}
        <div className="flex items-center justify-center gap-4 mt-8 text-xs text-gray-300">
          <a href={ROUTES.PRIVACIDAD} className="hover:text-gray-100 transition-colors">Privacidad</a>
          <span>·</span>
          <a href={ROUTES.TERMINOS} className="hover:text-gray-100 transition-colors">Términos</a>
        </div>

      </div>

      {/* Preview de foto en tamaño grande */}
      {preview && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setPreview(null)}
        >
          <img
            src={preview}
            alt=""
            className="max-w-full max-h-full object-contain"
            onClick={e => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setPreview(null)}
            className="absolute top-4 right-4 p-2 bg-dark-100 hover:bg-dark-200 text-gray-100 rounded transition-colors"
            aria-label="Cerrar"
          >
            <XCircle size={20} />
          </button>
        </div>
      )}
    </div>
  )
}
