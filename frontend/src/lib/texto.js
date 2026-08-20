// Utilidades para normalizar entradas de texto libre.
//
// El objetivo es que los datos se guarden de forma consistente aunque los
// operadores escriban de maneras distintas (todo en mayúsculas, todo en
// minúsculas, con espacios extra, etc.). Se aplica al guardar; el usuario
// puede editar el resultado si necesita un caso especial.

/**
 * Normaliza un nombre propio o razón social a Title Case:
 *   "juan garcía"      → "Juan García"
 *   "JUAN GARCÍA"      → "Juan García"
 *   "  juan  garcía  " → "Juan García"
 *   ""                 → ""
 *
 * No trata de ser inteligente con partículas ("de", "la", "del") ni con
 * siglas ("S.A.", "SRL"). Si el usuario necesita ese formato, edita
 * después. Buscamos consistencia > perfección lingüística.
 */
export function normalizarNombre(texto) {
  if (typeof texto !== 'string') return ''
  const limpio = texto.trim().replace(/\s+/g, ' ')
  if (!limpio) return ''
  return limpio
    .split(' ')
    .map(p => p[0].toUpperCase() + p.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Normaliza un email: minúsculas y sin espacios.
 * Devuelve '' si el input está vacío o no es string.
 */
export function normalizarEmail(email) {
  if (typeof email !== 'string') return ''
  return email.trim().toLowerCase()
}
