import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { ROUTES } from '@/lib/routes'

// Ruta a la que se manda al usuario que todavía usa la contraseña temporal.
// Es la misma pestaña donde vive el form de cambio, así que no hay pantalla
// dedicada: entrás ahí, cambiás, y podés seguir navegando normalmente.
const RUTA_CAMBIO_PASSWORD = ROUTES.CONFIG_USUARIOS

export default function ProtectedRoute({ children }) {
  const { session, profile, loading } = useAuth()
  const { pathname } = useLocation()

  if (loading) return (
    <div className="min-h-screen bg-dark flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-red border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!session) return <Navigate to={ROUTES.LOGIN} replace />

  // Perfil inactivo: sesión válida pero admin dado de baja
  if (profile && !profile.activo) return <Navigate to={ROUTES.LOGIN} replace />

  // Contraseña temporal: forzamos ir al form de cambio.
  // Si ya está en esa ruta lo dejamos ahí para que pueda usarla.
  if (
    profile?.debe_cambiar_password &&
    pathname !== RUTA_CAMBIO_PASSWORD
  ) {
    return <Navigate to={RUTA_CAMBIO_PASSWORD} replace />
  }

  return children
}
