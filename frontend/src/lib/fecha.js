// Utilidades para trabajar con fechas en formato argentino.
//
// El formato ISO YYYY-MM-DD se guarda en la BD como string sin timezone.
// Nunca usar new Date('2026-07-13') para parsear fechas locales — el navegador
// asume UTC y en Argentina (UTC-3) queda como "12/07/2026". Usar split.

/**
 * Convierte 'YYYY-MM-DD' → 'DD/MM/YYYY'.
 */
export function formatFechaAR(iso) {
  if (typeof iso !== 'string' || !iso.includes('-')) return iso
  return iso.split('-').reverse().join('/')
}

/**
 * Fecha de hoy en formato 'YYYY-MM-DD' (hora Argentina UTC-3).
 * Útil para inputs type="date" y comparaciones en la BD.
 */
export function fechaHoyAR() {
  const now = new Date()
  now.setHours(now.getHours() - 3)
  return now.toISOString().split('T')[0]
}

/**
 * Hora actual en formato 'HH:MM' hora Argentina.
 * Útil para comparar con notificaciones.hora_envio (que se guarda en horario local).
 */
export function horaActualAR() {
  const now = new Date()
  now.setHours(now.getHours() - 3)
  return now.toISOString().slice(11, 16)
}

/**
 * True si una notificación con fecha_envio (date) + hora_envio (HH:MM:SS)
 * cae dentro de las próximas N horas desde ahora en hora Argentina.
 * Incluye notificaciones ya vencidas si aún están pendientes.
 */
export function estaDentroDeLasProximas(fechaISO, horaHHMMSS, horas = 24) {
  if (!fechaISO || !horaHHMMSS) return false
  // Interpretamos fecha+hora como hora local Argentina.
  const objetivo = new Date(`${fechaISO}T${horaHHMMSS.slice(0, 5)}:00-03:00`)
  if (isNaN(objetivo.getTime())) return false
  const ahora = new Date()
  const diffMs = objetivo.getTime() - ahora.getTime()
  // Cae dentro de la ventana si ya pasó (diffMs <= 0) o si falta menos que N horas
  return diffMs <= horas * 60 * 60 * 1000
}

/**
 * True si la notificación ya venció (hora programada <= ahora) o
 * está a punto de vencer (dentro de los próximos minutosAntes).
 */
export function estaProntoAVencer(fechaISO, horaHHMMSS, minutosAntes = 10) {
  if (!fechaISO || !horaHHMMSS) return false
  const objetivo = new Date(`${fechaISO}T${horaHHMMSS.slice(0, 5)}:00-03:00`)
  if (isNaN(objetivo.getTime())) return false
  const diffMs = objetivo.getTime() - Date.now()
  return diffMs <= minutosAntes * 60 * 1000
}

/**
 * Formatea un timestamp ISO a 'DD/MM/YYYY HH:MM' (hora Argentina).
 * Ej: '2026-07-13T18:30:00Z' → '13/07/2026 15:30'
 */
export function formatFechaHoraAR(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    hour12: false,
  })
}
