// Hook para cargar datos con cache stale-while-revalidate.
//
// Uso típico:
//   const { data, loading, refetch } = useCachedResource(
//     'inicio:panel',
//     () => fetch...,
//     { invalidaEn: [EVENTOS.servicioActualizado] }
//   )
//
// Comportamiento:
//   - Primer render: si hay cache → data poblada, loading=false, refetch en background
//                    si no hay cache → data=null, loading=true, fetch inicial
//   - Al llegar el fetch (fresh o background) actualiza data
//   - Si algún evento suscrito se dispara, invalida y refetchea
//   - visibilitychange: al volver a la pestaña, refetch si los datos están stale

import { useState, useEffect, useCallback, useRef } from 'react'
import { getCached, setCached, isFresh, invalidate } from '@/lib/cache'
import { suscribirseA } from '@/lib/eventos'
import logger from '@/lib/logger'

export function useCachedResource(clave, fetcher, opciones = {}) {
  const { invalidaEn = [], ttlMs } = opciones

  const cached = getCached(clave)
  const [data, setData]       = useState(cached)
  const [loading, setLoading] = useState(cached === null)
  const [error, setError]     = useState(null)

  // Guardamos el fetcher en un ref para que no dispare recargas cuando
  // el consumidor lo recrea en cada render sin memoizar.
  const fetcherRef = useRef(fetcher)
  useEffect(() => { fetcherRef.current = fetcher }, [fetcher])

  const refetch = useCallback(async () => {
    try {
      const fresh = await fetcherRef.current()
      setCached(clave, fresh)
      setData(fresh)
      setError(null)
    } catch (err) {
      logger.error(err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [clave])

  // Carga inicial: si no había cache, fetch. Si había, revalidamos en
  // background solo si están stale (no penalizar navegaciones seguidas).
  useEffect(() => {
    if (cached === null || !isFresh(clave, ttlMs)) {
      refetch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave])

  // Refetch al volver la pestaña a estar visible (siempre que estén stale).
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible' && !isFresh(clave, ttlMs)) {
        refetch()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [clave, refetch, ttlMs])

  // Invalidación por eventos: cuando algo relevante muta, forzamos refetch.
  useEffect(() => {
    if (invalidaEn.length === 0) return
    const cleanups = invalidaEn.map(evento =>
      suscribirseA(evento, () => {
        invalidate(clave)
        refetch()
      })
    )
    return () => cleanups.forEach(fn => fn())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, refetch, invalidaEn.join('|')])

  return { data, loading, error, refetch }
}
