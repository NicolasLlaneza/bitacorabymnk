// Logo de la marca del tenant.
//
// Dos versiones:
//   • "full"    — el arte de /public/logo.png. Se usa en login y consulta
//                 pública. Se sirve desde /public para que Vite no lo
//                 procese como asset y quede referenciable con path absoluto.
//   • "compact" — texto puro, para el topbar mobile donde el arte no entra
//                 y se necesita legibilidad a 24px.
//
// El texto del compacto sale de tenant.config.json (marca.logoCompacto),
// que parte el nombre en dos tramos para poder pintar el segundo con el
// color primario. Si el tenant no lo define, cae al nombre completo.
//
// Si /logo.png no existe todavía (instalación recién forkeada, logos sin
// subir), el modo full cae al texto en vez de mostrar una imagen rota.

import { useState } from 'react'
import { COLORS } from '@/lib/colors'
import { NOMBRE_MARCA, LOGO_COMPACTO } from '@/lib/empresa'

const LOGO_URL = '/logo.png'

// Texto de dos tonos: base en color de texto, acento en color de marca.
function LogoTexto({ className = '', fontSize = '1.5rem' }) {
  return (
    <div
      className={className}
      style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 900, letterSpacing: '0.05em', lineHeight: 1 }}
    >
      <span style={{ color: COLORS.textPrimary, fontSize }}>{LOGO_COMPACTO.base}</span>
      {LOGO_COMPACTO.acento && (
        <span style={{ color: COLORS.red, fontSize }}>{LOGO_COMPACTO.acento}</span>
      )}
    </div>
  )
}

export default function Logo({ className = '', compact = false }) {
  const [sinImagen, setSinImagen] = useState(false)

  // Compact: una línea, sin subtítulo, ideal para topbar mobile
  if (compact) {
    return <LogoTexto className={className} fontSize="1.5rem" />
  }

  // Full sin logo.png disponible: caemos al texto en tamaño grande
  if (sinImagen) {
    return <LogoTexto className={className} fontSize="2.25rem" />
  }

  // Full: arte de la marca, para login y consulta pública
  return (
    <img
      src={LOGO_URL}
      alt={NOMBRE_MARCA}
      className={`w-40 sm:w-48 h-auto ${className}`}
      draggable={false}
      onError={() => setSinImagen(true)}
    />
  )
}
