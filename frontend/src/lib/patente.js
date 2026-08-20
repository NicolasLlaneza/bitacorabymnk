// Utilidades para trabajar con patentes argentinas
//
// Formatos vigentes:
//   - auto-viejo:  ABC123      (3 letras + 3 números)
//   - auto-nuevo:  AB123CD     (2 letras + 3 números + 2 letras) — Mercosur
//   - moto-nueva:  A123BC      (1 letra + 3 números + 2 letras)

// El formato más largo es AB123CD (7 caracteres). Se usa en los <input>
// como maxLength para cortar de raíz cualquier ingreso más largo.
export const MAX_LEN_PATENTE = 7

// Labels amigables para el tipo de patente detectado. Dos variantes:
//  - short → pantallas internas del taller ('Auto' / 'Moto')
//  - long  → consulta pública, más formal ('Automóvil' / 'Motocicleta')
export const tipoLabelsCortos = {
  'auto-viejo': 'Auto',
  'auto-nuevo': 'Auto',
  'moto-nueva': 'Moto',
}
export const tipoLabelsLargos = {
  'auto-viejo': 'Automóvil',
  'auto-nuevo': 'Automóvil',
  'moto-nueva': 'Motocicleta',
}

const REGEX = {
  'auto-nuevo':  /^[A-Z]{2}\d{3}[A-Z]{2}$/,
  'auto-viejo':  /^[A-Z]{3}\d{3}$/,
  'moto-nueva':  /^[A-Z]\d{3}[A-Z]{2}$/,
}

/**
 * Normaliza una patente: mayúsculas y sin espacios.
 * Ej: "ab 123 cd" → "AB123CD"
 */
export function normalizarPatente(patente) {
  if (typeof patente !== 'string') return ''
  return patente.replace(/\s/g, '').toUpperCase()
}

/**
 * Detecta el tipo de patente. Devuelve el tipo o '' si no coincide con ninguno.
 */
export function detectarTipoPatente(patente) {
  const p = normalizarPatente(patente)
  for (const [tipo, regex] of Object.entries(REGEX)) {
    if (regex.test(p)) return tipo
  }
  return ''
}

/**
 * True si la patente tiene un formato válido (cualquiera de los 3 tipos).
 */
export function esPatenteValida(patente) {
  return detectarTipoPatente(patente) !== ''
}
