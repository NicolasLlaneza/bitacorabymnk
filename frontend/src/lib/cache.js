// Cache global en memoria para consultas de la app.
//
// El problema que resuelve:
//   React Router desmonta las páginas al navegar. Sin cache, cada
//   navegación arranca con spinner + fetch aunque los datos no hayan
//   cambiado. Además, si una acción en /servicios afecta a los KPIs
//   de /inicio, el usuario no ve la actualización hasta el próximo
//   fetch — y si el fetch fue rapidísimo, ni se entera.
//
// Estrategia:
//   - Los datos viven en un Map indexado por clave.
//   - Cada entrada tiene timestamp: se considera stale después del TTL.
//   - stale-while-revalidate: si hay datos aunque sean viejos, se
//     devuelven al toque; el consumidor decide si refetchea en background.
//   - invalidate(clave) fuerza que la próxima lectura devuelva null.
//   - invalidateAll() se usa al hacer logout (o al iniciar sesión con
//     otro usuario) para no filtrar datos entre sesiones.

const TTL_MS_DEFAULT = 30 * 1000  // 30 segundos

const store       = new Map()  // clave → data
const timestamps  = new Map()  // clave → timestamp de última escritura

/**
 * Devuelve los datos cacheados si existen, o null si nunca se cachearon
 * ni se invalidaron. NO chequea TTL — el consumidor decide qué hacer
 * con datos viejos (mostrarlos igual + refetch, o descartarlos).
 */
export function getCached(clave) {
  return store.has(clave) ? store.get(clave) : null
}

/**
 * True si los datos existen y están dentro del TTL.
 * Útil para decidir si vale la pena refetchear en background.
 */
export function isFresh(clave, ttlMs = TTL_MS_DEFAULT) {
  const ts = timestamps.get(clave)
  return ts !== undefined && (Date.now() - ts) < ttlMs
}

/** Guarda datos y marca el timestamp actual. */
export function setCached(clave, data) {
  store.set(clave, data)
  timestamps.set(clave, Date.now())
}

/** Descarta una clave específica. La próxima lectura devuelve null. */
export function invalidate(clave) {
  store.delete(clave)
  timestamps.delete(clave)
}

/** Descarta todas las claves que empiezan con el prefijo. */
export function invalidatePrefix(prefijo) {
  for (const clave of store.keys()) {
    if (clave.startsWith(prefijo)) invalidate(clave)
  }
}

/** Vacía todo. Se usa en logout. */
export function invalidateAll() {
  store.clear()
  timestamps.clear()
}
