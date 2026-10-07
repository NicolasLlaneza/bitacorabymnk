// Franja que identifica el modo demo (lib/demo.js) y permite volver los
// datos ficticios al estado inicial entre una presentación y otra.

import { RotateCcw } from 'lucide-react'
import { resetDemo } from '@/demo/mockSupabase'

export default function DemoBanner() {
  function handleReiniciar() {
    if (!window.confirm('¿Volver los datos de la demo al estado inicial? Se pierden los cambios hechos.')) return
    resetDemo()
    window.location.reload()
  }

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded border border-red/40 bg-red/10 px-3 py-2 text-xs text-gray-200">
      <span>
        <strong className="text-gray-100 uppercase tracking-widest">Modo demo</strong>
        <span className="mx-2">·</span>
        Datos ficticios, guardados solo en este navegador.
      </span>
      <button
        type="button"
        onClick={handleReiniciar}
        className="inline-flex items-center gap-1.5 rounded px-2 py-1.5 text-gray-100 hover:bg-red/20 transition-colors"
      >
        <RotateCcw size={13} />
        Reiniciar datos
      </button>
    </div>
  )
}
