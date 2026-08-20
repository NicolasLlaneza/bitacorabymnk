// ─────────────────────────────────────────────────────────────────────────────
// Monitoreo de errores en producción
//
// Configurado con criterio de mínima exposición de datos: la app maneja
// datos personales de clientes (nombre, teléfono, patente) y la política
// de privacidad no contempla enviarlos a un tercero. Por eso:
//
//   • No se recolecta información de usuario, headers, cookies ni bodies
//   • Las URLs de Supabase llevan los filtros en el query string
//     (?telefono=eq.+549...), así que se recorta antes de guardar el
//     breadcrumb
//   • Solo se inicializa en producción y si hay DSN configurado
// ─────────────────────────────────────────────────────────────────────────────

import * as Sentry from '@sentry/react'

const DSN = import.meta.env.VITE_SENTRY_DSN

/** Quita el query string de una URL, dejando solo origen + path. */
function sinQueryString(url) {
  if (typeof url !== 'string') return url
  const corte = url.indexOf('?')
  return corte === -1 ? url : url.slice(0, corte) + '?[filtrado]'
}

export function initSentry() {
  if (!import.meta.env.PROD || !DSN) return

  Sentry.init({
    dsn: DSN,
    environment: import.meta.env.MODE,

    // Muestreo: con el volumen de un taller, capturar todo es viable
    // y no llega ni cerca del límite del plan gratuito.
    tracesSampleRate: 0.1,

    // Nada de datos personales.
    dataCollection: {
      userInfo:      false,
      httpBodies:    [],
      httpHeaders:   { deny: ['*'] },
      cookies:       { deny: ['*'] },
      urlQueryParams: { deny: ['*'] },
    },

    // Los breadcrumbs de fetch guardan la URL completa. Las queries de
    // Supabase llevan los filtros ahí, así que las recortamos.
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === 'fetch' || breadcrumb.category === 'xhr') {
        if (breadcrumb.data?.url) {
          breadcrumb.data.url = sinQueryString(breadcrumb.data.url)
        }
      }
      return breadcrumb
    },

    // Misma lógica para la URL de la request que acompaña al evento.
    beforeSend(event) {
      if (event.request?.url) {
        event.request.url = sinQueryString(event.request.url)
      }
      return event
    },
  })
}

export { Sentry }
