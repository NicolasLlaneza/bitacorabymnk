import { useEffect } from 'react'
import { X } from 'lucide-react'

// El modal ocupa el alto disponible con margen top/bottom y hace scroll
// interno del contenido — esencial para forms largos en pantallas chicas
// (mobile del taller) donde el ServicioModal se salía por debajo.
const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}

export default function Modal({ title, children, onClose, size = 'md' }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const widthClass = SIZES[size] ?? SIZES.md

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="fixed inset-0 bg-black/70" onClick={onClose} />
      <div className={`relative w-full ${widthClass} my-4 sm:my-8 bg-dark-200 border border-dark-400 rounded-lg shadow-xl flex flex-col max-h-[calc(100vh-2rem)]`}>
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-dark-400 shrink-0">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-100">{title}</h2>
          <button onClick={onClose} className="text-gray-200 hover:text-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="px-4 sm:px-6 py-5 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
