import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { ROUTES } from '@/lib/routes'
import Logo from '@/components/Logo'

export default function LoginPage() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Si ya hay sesión activa, ir directo al panel
  useEffect(() => {
    if (!loading && session) navigate(ROUTES.CLIENTES, { replace: true })
  }, [session, loading])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email o contraseña incorrectos.')
      setSubmitting(false)
    }
    // Si no hay error, onAuthStateChange en AuthContext actualiza la sesión
    // y el useEffect de arriba redirige a /clientes
  }

  if (loading) return null

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex justify-center mb-10">
          <Logo className="w-44" />
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-dark-200 border border-dark-400 rounded-lg p-8 space-y-5"
        >
          <p className="text-gray-200 text-xs uppercase tracking-widest mb-2">
            Acceso al sistema
          </p>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-gray-200 text-xs uppercase tracking-wider">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full bg-dark-300 border border-dark-400 text-gray-100 text-sm rounded px-3 py-2.5 outline-none focus:border-red transition-colors placeholder:text-gray-300"
              placeholder="nombre@neumasneumaticos.com.ar"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-gray-200 text-xs uppercase tracking-wider">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full bg-dark-300 border border-dark-400 text-gray-100 text-sm rounded px-3 py-2.5 outline-none focus:border-red transition-colors placeholder:text-gray-300"
              placeholder="••••••••"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-red-bright text-xs">{error}</p>
          )}

          {/* Botón */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-red text-gray-100 text-sm font-bold uppercase tracking-widest py-2.5 rounded hover:bg-red-bright transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {submitting ? 'Ingresando...' : 'Ingresar'}
          </button>

          <a
            href={ROUTES.RECUPERAR_PASSWORD}
            className="block text-center text-xs text-gray-200 hover:text-gray-100 transition-colors"
          >
            Olvidé mi contraseña
          </a>
        </form>

        {/* Footer legal */}
        <div className="flex items-center justify-center gap-4 mt-6 text-xs text-gray-300">
          <a href={ROUTES.PRIVACIDAD} className="hover:text-gray-100 transition-colors">Privacidad</a>
          <span>·</span>
          <a href={ROUTES.TERMINOS} className="hover:text-gray-100 transition-colors">Términos</a>
        </div>

      </div>
    </div>
  )
}
