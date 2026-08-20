import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import App from './App.jsx'
import './styles/index.css'
import { initSentry, Sentry } from './lib/sentry'
import { validarEnv } from './lib/env'
import { COLORS } from './lib/colors'

// Validar env vars al inicio, antes de renderizar nada:
// mejor un error explícito acá que fallos oscuros dentro de la app.
validarEnv()
initSentry()

// Pantalla de último recurso: si un error escapa a toda la app, al menos
// el usuario ve algo entendible en vez de una página en blanco.
function ErrorFallback() {
  return (
    <div className="min-h-screen bg-dark flex items-center justify-center px-4">
      <div className="max-w-sm text-center space-y-4">
        <h1 className="text-gray-100 text-sm font-bold uppercase tracking-widest">
          Algo salió mal
        </h1>
        <p className="text-gray-200 text-sm">
          Ocurrió un error inesperado. Recargá la página; si vuelve a pasar,
          avisale al administrador.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-red text-gray-100 text-sm font-bold uppercase tracking-widest px-6 py-2.5 rounded hover:bg-red-bright transition-colors"
        >
          Recargar
        </button>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <App />
      <Toaster
        position="bottom-right"
        theme="dark"
        richColors
        closeButton
        // El toast de notificaciones vencidas ya vive abajo a la derecha
        // sobre bottom-right (fixed bottom-20 en mobile). Sonner queda
        // encima gracias al z-index más alto — no compiten visualmente.
        toastOptions={{
          style: {
            background: COLORS.darkPanel,
            border: `1px solid ${COLORS.darkBorder}`,
            color: COLORS.textPrimary,
          },
        }}
      />
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
