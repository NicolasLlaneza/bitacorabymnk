// Bus de eventos de la app (usando window CustomEvent).
//
// Se usa cuando dos componentes distantes en el árbol necesitan
// enterarse de que algo cambió, sin acoplarlos con context ni prop
// drilling.
//
// Además el hook useCachedResource los usa para invalidar cache: al
// mutar un servicio, /inicio debe re-cargar los KPIs; al mutar un
// cliente, la lista de "próximas 24hs" puede necesitar refrescarse.

export const EVENTOS = {
  notifActualizada:      'neuplus:notif-actualizada',
  servicioActualizado:   'neuplus:servicio-actualizado',
  clienteActualizado:    'neuplus:cliente-actualizado',
  vehiculoActualizado:   'neuplus:vehiculo-actualizado',
}

export function emitirNotifActualizada(notificacion) {
  window.dispatchEvent(new CustomEvent(EVENTOS.notifActualizada, { detail: notificacion }))
}

export function emitirServicioActualizado(detalle) {
  window.dispatchEvent(new CustomEvent(EVENTOS.servicioActualizado, { detail: detalle }))
}

export function emitirClienteActualizado(detalle) {
  window.dispatchEvent(new CustomEvent(EVENTOS.clienteActualizado, { detail: detalle }))
}

export function emitirVehiculoActualizado(detalle) {
  window.dispatchEvent(new CustomEvent(EVENTOS.vehiculoActualizado, { detail: detalle }))
}

/**
 * Suscribirse a un evento. Devuelve la función de cleanup para usarla
 * directo en el return de un useEffect.
 */
export function suscribirseA(nombreEvento, handler) {
  window.addEventListener(nombreEvento, handler)
  return () => window.removeEventListener(nombreEvento, handler)
}
