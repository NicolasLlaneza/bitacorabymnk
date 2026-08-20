// Utilidades para números de teléfono argentinos.

/**
 * Normaliza un teléfono al formato internacional sin '+' ni separadores.
 * Ej: "+54 9 261 234 5678" → "5492612345678"
 *     "0261 234-5678"       → "2612345678"  (sin código de país)
 *
 * Solo quita separadores. Para forzar el prefijo argentino "549" usar
 * normalizarTelefonoAR en su lugar.
 */
export function normalizarTelefono(telefono) {
  if (typeof telefono !== 'string') return ''
  return telefono.replace(/\D/g, '')
}

/**
 * Normaliza un teléfono argentino a formato E.164 sin '+', garantizando
 * el prefijo "549" (código país 54 + móvil 9). Es el formato que espera
 * WhatsApp Business API.
 *
 * Acepta cualquier variante razonable de entrada:
 *   "2612345678"           → "5492612345678"  (agrega 549)
 *   "0261 234-5678"        → "5492612345678"  (saca 0 inicial, agrega 549)
 *   "+54 261 234 5678"     → "5492612345678"  (agrega 9 móvil)
 *   "+54 9 261 234 5678"   → "5492612345678"  (ya venía completo)
 *   "5492612345678"        → "5492612345678"  (idempotente)
 *
 * Si el input es muy corto o vacío, devuelve el string original de dígitos
 * (la validación posterior con esTelefonoArgentinoValido lo rechaza).
 */
export function normalizarTelefonoAR(telefono) {
  const num = normalizarTelefono(telefono)
  if (!num) return ''

  // Aislar el "número local" desarmando prefijos comunes
  let local = num
  if (local.startsWith('0')) local = local.slice(1)  // 0261... → 261...
  if (local.startsWith('54')) local = local.slice(2) // 54... → resto
  if (local.startsWith('9')) local = local.slice(1)  // 9... → resto (móvil)

  // Números demasiado cortos: devolver lo que tenga, la validación luego lo rechazará
  if (local.length < 6) return num

  return '549' + local
}

/**
 * True si el teléfono normalizado parece un número argentino válido
 * (código país 54, 12–14 dígitos).
 */
export function esTelefonoArgentinoValido(telefono) {
  const num = normalizarTelefono(telefono)
  if (num.length < 12 || num.length > 14) return false
  return num.startsWith('54')
}

/**
 * Formatea un teléfono para mostrar visualmente en pantalla.
 * Ej: "5492612345678" → "+54 9 261 234 5678"
 * Si el input no es reconocible, devuelve el original.
 */
export function formatearTelefonoDisplay(telefono) {
  const num = normalizarTelefono(telefono)
  if (!num.startsWith('54') || num.length < 12) return telefono
  // 54 + 9 (móvil) + 3 (área) + 4 + 4  → +54 9 XXX XXX XXXX
  const pais = num.slice(0, 2)
  const movil = num[2]
  if (movil !== '9') {
    return `+${pais} ${num.slice(2, 5)} ${num.slice(5, 9)}-${num.slice(9)}`
  }
  const area = num.slice(3, 6)
  const parte1 = num.slice(6, 9)
  const parte2 = num.slice(9)
  return `+${pais} ${movil} ${area} ${parte1} ${parte2}`
}
