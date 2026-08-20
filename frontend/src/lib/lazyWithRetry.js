// Reemplazo de React.lazy que maneja el "chunk load error".
//
// El problema:
//   Cuando un usuario tiene la app abierta y nosotros deployamos, los
//   assets viejos son reemplazados por otros con hash distinto. Si el
//   usuario después navega a una ruta o abre un modal que dispara un
//   lazy import, el fetch del chunk viejo devuelve 404 y React lanza:
//   "TypeError: Failed to fetch dynamically imported module".
//
// La solución:
//   Detectar ese error específico, marcar la sesión para evitar loops
//   y recargar la página. Al recargar, el navegador baja el HTML nuevo
//   con las referencias a los assets correctos.
//
// El guard con sessionStorage evita el bucle infinito: si el chunk
// falla realmente por otro motivo (red caída, CDN roto), no queremos
// recargar cada segundo. Damos una recarga y si vuelve a fallar,
// dejamos que el error se propague al ErrorBoundary.

import { lazy } from 'react'

const RELOAD_FLAG   = 'neuplus:chunk-reload-at'
const RELOAD_WINDOW = 60 * 1000  // 1 min entre reintentos

function esChunkLoadError(err) {
  const msg = String(err?.message ?? '')
  return (
    err?.name === 'ChunkLoadError' ||
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Loading chunk') ||
    msg.includes('Importing a module script failed')
  )
}

export function lazyWithRetry(importer) {
  return lazy(async () => {
    try {
      return await importer()
    } catch (err) {
      if (!esChunkLoadError(err)) throw err

      const ultimoReload = Number(sessionStorage.getItem(RELOAD_FLAG) ?? 0)
      if (Date.now() - ultimoReload < RELOAD_WINDOW) {
        // Ya intentamos hace poco y volvió a fallar: no es un deploy nuevo,
        // es un problema real. Que lo agarre el ErrorBoundary.
        throw err
      }

      sessionStorage.setItem(RELOAD_FLAG, String(Date.now()))
      window.location.reload()
      // Componente placeholder mientras el navegador ejecuta el reload
      return { default: () => null }
    }
  })
}
