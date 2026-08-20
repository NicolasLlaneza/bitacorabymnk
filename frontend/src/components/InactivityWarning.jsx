import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import Button from '@/components/Button'

export default function InactivityWarning({ onExtend, onLogout }) {
  const [segundos, setSegundos] = useState(60)

  useEffect(() => {
    const interval = setInterval(() => {
      setSegundos(s => {
        if (s <= 1) { clearInterval(interval); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Modal */}
      <div className="relative bg-dark-200 border border-dark-400 rounded-lg p-6 w-full max-w-sm space-y-4 shadow-xl">
        <div className="flex items-center gap-3">
          <AlertTriangle size={20} className="text-yellow-500 shrink-0" />
          <h2 className="text-gray-100 text-sm font-bold uppercase tracking-wider">
            Sesión por expirar
          </h2>
        </div>

        <p className="text-gray-200 text-sm">
          Tu sesión se cerrará automáticamente por inactividad en{' '}
          <span className="text-gray-100 font-bold tabular-nums">{segundos}s</span>.
        </p>

        <div className="flex gap-3 pt-1">
          <Button variant="ghost" className="flex-1 justify-center" onClick={onLogout}>
            Cerrar sesión
          </Button>
          <Button className="flex-1 justify-center" onClick={onExtend}>
            Seguir usando
          </Button>
        </div>
      </div>
    </div>
  )
}
