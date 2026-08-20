import { useEffect, useState } from 'react'

// Carga el SDK oficial de Facebook de forma lazy (solo cuando se necesita).
// Retorna { ready, error, appId } — ready es true cuando FB está listo para usar.
export function useFacebookSdk() {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(null)

  const appId = import.meta.env.VITE_FB_APP_ID

  useEffect(() => {
    if (!appId) {
      setError('VITE_FB_APP_ID no está configurado en las variables de entorno')
      return
    }

    if (window.FB) { setReady(true); return }

    // Callback global que dispara Facebook cuando el SDK termina de cargar
    window.fbAsyncInit = function () {
      window.FB.init({
        appId,
        cookie:  true,
        xfbml:   false,
        version: 'v19.0',
      })
      setReady(true)
    }

    // Insertar el script del SDK (patrón oficial de Meta)
    const scriptId = 'facebook-jssdk'
    if (document.getElementById(scriptId)) return

    const script = document.createElement('script')
    script.id  = scriptId
    script.src = 'https://connect.facebook.net/es_LA/sdk.js'
    script.async  = true
    script.defer  = true
    script.crossOrigin = 'anonymous'
    script.onerror = () => setError('No se pudo cargar el SDK de Facebook')

    document.body.appendChild(script)
  }, [appId])

  return { ready, error, appId }
}
