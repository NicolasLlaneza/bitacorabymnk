// Formatos numéricos localizados. Todos los importes, kilometrajes y
// distancias muestran la misma convención (Argentina, es-AR) sin decimales
// para importes y con separador de miles (85.400 km).

export const LOCALE_AR = 'es-AR'

/** '$85.400' — importes en pesos, sin decimales. */
export function formatearARS(n) {
  return `$${Number(n ?? 0).toLocaleString(LOCALE_AR, { maximumFractionDigits: 0 })}`
}

/** '85.400 km' — kilometraje con separador de miles. Devuelve '' si es null/undefined. */
export function formatearKm(n) {
  if (n == null) return ''
  return `${Number(n).toLocaleString(LOCALE_AR)} km`
}
