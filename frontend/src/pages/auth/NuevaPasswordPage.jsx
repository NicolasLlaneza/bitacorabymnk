import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { CheckCircle, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import logger from '@/lib/logger'
import { MIN_PASSWORD } from '@/lib/passwordRules'
import { ROUTES } from '@/lib/routes'
import Logo from '@/components/Logo'
import Button from '@/components/Button'

export default function NuevaPasswordPage() {
  const navigate = useNavigate()

  const [password, setPassword]   = useState('')
  const [repetir, setRepetir]     = useState('')
  const [guardando, setGuardando] = useState(false)
  const [listo, setListo]         = useState(false)
  const [error, setError]         = useState(null)
  // null = todavía no sabemos; true/false = hay o no sesión de recuperación
  const [sesionValida, setSesionValida] = useState(null)

  // Supabase procesa el token del enlace y emite un evento PASSWORD_RECOVERY.
  // Puede llegar antes o después de montar este componente, así que
  // chequeamos la sesión actual y además escuchamos el evento.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSesionValida(!!session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setSesionValida(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()

    if (password.length < MIN_PASSWORD) {
      setError(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres`)
      return
    }
    if (password !== repetir) {
      setError('Las contraseñas no coinciden')
      return
    }

    setGuardando(true)
    setError(null)

    const { error } = await supabase.auth.updateUser({ password })
    setGuardando(false)

    if (error) {
      logger.error(error)
      setError(error.message ?? 'No se pudo actualizar la contraseña')
      return
    }

    setListo(true)
    setTimeout(() => navigate(ROUTES.INICIO, { replace: true }), 2500)
  }

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="flex justify-center mb-10">
          <Logo className="w-44" />
        </div>

        <div className="bg-dark-200 border border-dark-400 rounded-lg p-8">

          {listo ? (
            <div className="space-y-4 text-center">
              <CheckCircle size={32} className="text-green-500 mx-auto" />
              <h1 className="text-gray-100 text-sm font-bold uppercase tracking-widest">
                Contraseña actualizada
              </h1>
              <p className="text-gray-200 text-sm">
                Te llevamos al sistema en un momento.
              </p>
            </div>

          ) : sesionValida === false ? (
            <div className="space-y-4 text-center">
              <AlertTriangle size={32} className="text-yellow-500 mx-auto" />
              <h1 className="text-gray-100 text-sm font-bold uppercase tracking-widest">
                Enlace inválido o vencido
              </h1>
              <p className="text-gray-200 text-sm">
                Los enlaces de recuperación duran una hora y se pueden usar una sola vez.
              </p>
              <Link
                to={ROUTES.RECUPERAR_PASSWORD}
                className="inline-block text-xs text-red hover:text-red-bright transition-colors font-semibold uppercase tracking-wider pt-2"
              >
                Pedir uno nuevo
              </Link>
            </div>

          ) : sesionValida === null ? (
            <p className="text-gray-200 text-sm text-center">Verificando enlace...</p>

          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <p className="text-gray-200 text-xs uppercase tracking-widest mb-2">
                  Nueva contraseña
                </p>
                <p className="text-gray-300 text-xs">
                  Mínimo {MIN_PASSWORD} caracteres.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-200 text-xs uppercase tracking-wider">
                  Contraseña
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(null) }}
                  required
                  autoComplete="new-password"
                  autoFocus
                  className="w-full bg-dark-300 border border-dark-400 text-gray-100 text-sm rounded px-3 py-2.5 outline-none focus:border-red transition-colors placeholder:text-gray-300"
                  placeholder="••••••••••••"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-200 text-xs uppercase tracking-wider">
                  Repetir contraseña
                </label>
                <input
                  type="password"
                  value={repetir}
                  onChange={e => { setRepetir(e.target.value); setError(null) }}
                  required
                  autoComplete="new-password"
                  className="w-full bg-dark-300 border border-dark-400 text-gray-100 text-sm rounded px-3 py-2.5 outline-none focus:border-red transition-colors placeholder:text-gray-300"
                  placeholder="••••••••••••"
                />
              </div>

              {error && <p className="text-red-bright text-xs">{error}</p>}

              <Button type="submit" loading={guardando} className="w-full justify-center">
                Guardar contraseña
              </Button>
            </form>
          )}

        </div>

      </div>
    </div>
  )
}
