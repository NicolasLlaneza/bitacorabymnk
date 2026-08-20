import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, MailCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import logger from '@/lib/logger'
import Logo from '@/components/Logo'
import Button from '@/components/Button'
import { ROUTES } from '@/lib/routes'

export default function RecuperarPasswordPage() {
  const [email, setEmail]       = useState('')
  const [enviado, setEnviado]   = useState(false)
  const [sending, setSending]   = useState(false)
  const [error, setError]       = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim()) return

    setSending(true)
    setError(null)

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/nueva-password`,
    })

    setSending(false)

    if (error) {
      logger.error(error)
      // No revelamos si el email existe o no: eso permitiría enumerar cuentas.
      // Solo cortamos ante errores de red o rate limit.
      if (error.message?.toLowerCase().includes('rate')) {
        setError('Demasiados intentos. Esperá unos minutos.')
        return
      }
    }

    setEnviado(true)
  }

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="flex justify-center mb-10">
          <Logo className="w-44" />
        </div>

        <div className="bg-dark-200 border border-dark-400 rounded-lg p-8">
          {enviado ? (
            <div className="space-y-4 text-center">
              <MailCheck size={32} className="text-green-500 mx-auto" />
              <h1 className="text-gray-100 text-sm font-bold uppercase tracking-widest">
                Revisá tu correo
              </h1>
              <p className="text-gray-200 text-sm">
                Si <span className="text-gray-100">{email}</span> corresponde a una
                cuenta activa, te llega un enlace para elegir una contraseña nueva.
              </p>
              <p className="text-gray-300 text-xs">
                El enlace vence en una hora. Si no lo ves, mirá en spam.
              </p>
              <Link
                to={ROUTES.LOGIN}
                className="inline-flex items-center gap-2 text-xs text-gray-200 hover:text-gray-100 transition-colors pt-2"
              >
                <ArrowLeft size={14} /> Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <p className="text-gray-200 text-xs uppercase tracking-widest mb-2">
                  Recuperar contraseña
                </p>
                <p className="text-gray-300 text-xs">
                  Ingresá tu email y te mandamos un enlace para elegir una nueva.
                </p>
              </div>

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
                  autoFocus
                  className="w-full bg-dark-300 border border-dark-400 text-gray-100 text-sm rounded px-3 py-2.5 outline-none focus:border-red transition-colors placeholder:text-gray-300"
                  placeholder="tu@email.com"
                />
              </div>

              {error && <p className="text-red-bright text-xs">{error}</p>}

              <Button type="submit" loading={sending} className="w-full justify-center">
                Enviar enlace
              </Button>

              <Link
                to={ROUTES.LOGIN}
                className="flex items-center justify-center gap-2 text-xs text-gray-200 hover:text-gray-100 transition-colors"
              >
                <ArrowLeft size={14} /> Volver al inicio de sesión
              </Link>
            </form>
          )}
        </div>

      </div>
    </div>
  )
}
