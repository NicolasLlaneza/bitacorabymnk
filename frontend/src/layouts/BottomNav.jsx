import { NavLink } from 'react-router-dom'
import { Users, Car, Wrench, Bell, LayoutDashboard, UserCog } from 'lucide-react'
import { ROUTES } from '@/lib/routes'
import { OBJETO } from '@/lib/labels'

const navItems = [
  { to: ROUTES.INICIO,          icon: LayoutDashboard, label: 'Inicio'      },
  { to: ROUTES.CLIENTES,        icon: Users,           label: 'Clientes'    },
  { to: ROUTES.VEHICULOS,       icon: Car,             label: OBJETO.plural },
  { to: ROUTES.SERVICIOS,       icon: Wrench,          label: 'Servicios'   },
  { to: ROUTES.NOTIFICACIONES,  icon: Bell,            label: 'Notifs.'     },
  { to: ROUTES.CONFIG_USUARIOS, icon: UserCog,         label: 'Cuenta'      },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-dark-100 border-t border-dark-400 flex md:hidden z-20">
      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${
              isActive ? 'text-red' : 'text-gray-200 hover:text-gray-100'
            }`
          }
        >
          <Icon size={20} />
          <span className="text-xs">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
