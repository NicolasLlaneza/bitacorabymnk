// Utilidades para números de teléfono argentinos.
//
// Espejo del helper en frontend/src/lib/telefono.js — Deno no puede importar
// del bundle del frontend, así que la lógica vive duplicada acá. Si cambia
// una, actualizar la otra en el mismo commit para evitar que el mismo
// número se normalice distinto según el flujo (frontend vs edge function).

/**
 * Normaliza un teléfono al formato internacional sin '+' ni separadores.
 * Solo quita caracteres no numéricos. Para forzar el prefijo argentino
 * "549" usar normalizarTelefonoAR.
 */
export function normalizarTelefono(telefono: string | null | undefined): string {
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
 */
export function normalizarTelefonoAR(telefono: string | null | undefined): string {
  const num = normalizarTelefono(telefono)
  if (!num) return ''

  let local = num
  if (local.startsWith('0')) local = local.slice(1)
  if (local.startsWith('54')) local = local.slice(2)
  if (local.startsWith('9')) local = local.slice(1)

  if (local.length < 6) return num

  return '549' + local
}
