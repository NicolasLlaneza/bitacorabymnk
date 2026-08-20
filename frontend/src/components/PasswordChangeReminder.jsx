import { useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { ROUTES } from '@/lib/routes'

// Cuando el usuario logueado sigue usando la contraseña temporal, la app lo
// obliga a cambiarla:
//   - ProtectedRoute lo redirige a /config/usuarios (hard guard).
//   - Este componente muestra un toast persistente con un CTA visible.
//
// El toast se dispara una sola vez por sesión de flag activo. Cuando el
// usuario cambia la contraseña, refreshProfile en el contexto apaga
// debe_cambiar_password y el toast se descarta desde acá.
const TOAST_ID = 'password-change-reminder'

export default function PasswordChangeReminder() {
  const { profile } = useAuth()
  const navigate    = useNavigate()
  const location    = useLocation()
  const mostradoRef = useRef(false)

  useEffect(() => {
    if (profile?.debe_cambiar_password) {
      if (mostradoRef.current) return
      mostradoRef.current = true
      toast.warning('Tenés que cambiar la contraseña temporal para poder operar.', {
        id:       TOAST_ID,
        duration: Infinity,
        action:   {
          label:   'Cambiar ahora',
          onClick: () => navigate(ROUTES.CONFIG_USUARIOS),
        },
      })
    } else if (mostradoRef.current) {
      // Ya cambió la contraseña: cerramos el toast y quedamos listos para
      // volver a mostrarlo si en algún momento el flag se vuelve a prender.
      toast.dismiss(TOAST_ID)
      mostradoRef.current = false
    }
  }, [profile?.debe_cambiar_password, navigate])

  // Escondemos el toast mientras el usuario está en la ruta de cambio, así
  // no compite visualmente con el banner amarillo del propio formulario.
  useEffect(() => {
    if (!profile?.debe_cambiar_password) return
    if (location.pathname === ROUTES.CONFIG_USUARIOS) {
      toast.dismiss(TOAST_ID)
      mostradoRef.current = false
    }
  }, [location.pathname, profile?.debe_cambiar_password])

  return null
}
