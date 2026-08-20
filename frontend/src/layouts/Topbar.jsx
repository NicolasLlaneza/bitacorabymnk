import { useLocation, useNavigate, Link } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { ROUTES } from '@/lib/routes'
import Logo from '@/components/Logo'

const titles = {
  [ROUTES.INICIO]:          'Inicio',
  [ROUTES.CLIENTES]:        'Clientes',
  [ROUTES.VEHICULOS]:       'Vehículos',
  [ROUTES.SERVICIOS]:       'Servicios',
  [ROUTES.NOTIFICACIONES]:  'Notificaciones',
  [ROUTES.CONFIG_USUARIOS]: 'Usuarios',
}

export default function Topbar() {
  const { pathname } = useLocation()
  const { profile }  = useAuth()
  const navigate     = useNavigate()

  const title = titles[pathname] ?? 'Panel'

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate(ROUTES.LOGIN, { replace: true })
  }

  return (
    <header className="fixed top-0 left-0 md:left-56 right-0 h-14 bg-dark-100 border-b border-dark-400 flex items-center justify-between px-4 md:px-6 z-10">

      {/* Mobile: Logo compact | Desktop: título de página */}
      <Logo compact className="md:hidden" />
      <h1 className="hidden md:block text-sm font-bold uppercase tracking-widest text-gray-100">
        {title}
      </h1>

      <div className="flex items-center gap-3">
        {/* Desktop: nombre del perfil clickeable → cuenta */}
        <Link
          to={ROUTES.CONFIG_USUARIOS}
          className="hidden md:block text-xs text-gray-200 hover:text-gray-100 transition-colors"
          title="Mi cuenta"
        >
          {profile?.nombre ?? ''}
        </Link>
        {/* Mobile: ícono de logout */}
        <button
          onClick={handleLogout}
          className="md:hidden p-1.5 text-gray-200 hover:text-red transition-colors"
          aria-label="Cerrar sesión"
        >
          <LogOut size={18} />
        </button>
      </div>

    </header>
  )
}
