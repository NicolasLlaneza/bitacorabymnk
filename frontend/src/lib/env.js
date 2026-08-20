// Validación temprana de variables de entorno.
//
// Sin esto, si falta una variable la app arranca "normalmente" y explota
// cuando alguna feature intenta usarla — con errores confusos tipo
// "supabase URL is undefined". Este módulo valida al inicio y expone
// las variables tipadas.
//
// Se importa desde main.jsx antes de renderizar. Si algo falta y estamos
// en producción, lanza un error que se ve en consola y el ErrorBoundary
// muestra la pantalla de fallback.

const requeridas = {
  VITE_SUPABASE_URL:        import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY:   import.meta.env.VITE_SUPABASE_ANON_KEY,
  VITE_TURNSTILE_SITE_KEY:  import.meta.env.VITE_TURNSTILE_SITE_KEY,
}

// Opcionales: si faltan, la feature específica queda deshabilitada
// pero la app funciona.
const opcionales = {
  VITE_SENTRY_DSN:   import.meta.env.VITE_SENTRY_DSN,
  VITE_FB_APP_ID:    import.meta.env.VITE_FB_APP_ID,
  VITE_FB_CONFIG_ID: import.meta.env.VITE_FB_CONFIG_ID,
}

export function validarEnv() {
  const faltantes = Object.entries(requeridas)
    .filter(([, v]) => !v)
    .map(([k]) => k)

  if (faltantes.length > 0) {
    const msg = `Faltan variables de entorno requeridas: ${faltantes.join(', ')}`
    // eslint-disable-next-line no-console
    console.error(msg)
    throw new Error(msg)
  }
}

export const env = { ...requeridas, ...opcionales }
