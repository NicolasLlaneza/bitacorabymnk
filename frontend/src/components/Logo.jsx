// Logo oficial NEU+ Neumáticos.
// La versión "full" usa el arte con brillos del manual de marca
// (recortado sin anotaciones desde pagina_02.png → logo.png). Se sirve
// desde /public para que Vite no lo procese como asset y quede
// referenciable con path absoluto.
// La versión "compact" queda como texto para conservar legibilidad en el
// topbar mobile, respetando la tipografía Montserrat del manual.

import { COLORS } from '@/lib/colors'
import { NOMBRE_MARCA } from '@/lib/empresa'

const LOGO_URL = '/logo.png'

export default function Logo({ className = '', compact = false }) {
  // Compact: una línea, sin subtítulo, ideal para topbar mobile
  if (compact) {
    return (
      <div
        className={className}
        style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 900, letterSpacing: '0.05em', lineHeight: 1 }}
      >
        <span style={{ color: COLORS.textPrimary, fontSize: '1.5rem' }}>NEU</span>
        <span style={{ color: COLORS.red, fontSize: '1.5rem' }}>+</span>
      </div>
    )
  }

  // Full: arte oficial con brillos, para login y consulta pública
  return (
    <img
      src={LOGO_URL}
      alt={NOMBRE_MARCA}
      className={`w-40 sm:w-48 h-auto ${className}`}
      draggable={false}
    />
  )
}
