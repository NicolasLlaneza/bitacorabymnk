import { Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import ProtectedRoute from '@/routes/ProtectedRoute'
import AppLayout from '@/layouts/AppLayout'
import { lazyWithRetry } from '@/lib/lazyWithRetry'
import { ROUTES } from '@/lib/routes'
import tenant from '../../tenant.config.json'

// Dominio dedicado a la consulta pública (opcional). Si el tenant configuró
// uno, al entrar por ese hostname cae directo al buscador de patente en vez
// del login. Ej: 'consulta.miempresa.com' → /consulta.
const DOMINIO_CONSULTA = tenant.app?.dominioConsultaPublica ?? null

// El login se carga siempre (es la primera pantalla), así que va directo.
import LoginPage from '@/pages/auth/LoginPage'

// El resto se parte en chunks: nadie necesita bajar el código de
// Servicios (que arrastra la librería de compresión de imágenes) solo
// para entrar al login. Importa sobre todo en los celulares del taller.
// lazyWithRetry maneja el "chunk load error" que aparece cuando un
// usuario tiene la app abierta y nosotros deployamos una versión nueva.
const RecuperarPasswordPage = lazyWithRetry(() => import('@/pages/auth/RecuperarPasswordPage'))
const NuevaPasswordPage     = lazyWithRetry(() => import('@/pages/auth/NuevaPasswordPage'))
const ConsultaPublicaPage   = lazyWithRetry(() => import('@/pages/consulta-publica/ConsultaPublicaPage'))
const ClientesPage          = lazyWithRetry(() => import('@/pages/clientes/ClientesPage'))
const VehiculosPage         = lazyWithRetry(() => import('@/pages/vehiculos/VehiculosPage'))
const ServiciosPage         = lazyWithRetry(() => import('@/pages/servicios/ServiciosPage'))
const NotificacionesPage    = lazyWithRetry(() => import('@/pages/notificaciones/NotificacionesPage'))
// ConfigWhatsappPage se deja importable pero sin ruta activa:
// requiere Embedded Signup aprobado y hoy Meta lo bloquea.
// const ConfigWhatsappPage = lazyWithRetry(() => import('@/pages/config/ConfigWhatsappPage'))
const UsuariosPage          = lazyWithRetry(() => import('@/pages/config/UsuariosPage'))
const InicioPage            = lazyWithRetry(() => import('@/pages/inicio/InicioPage'))
const PrivacidadPage        = lazyWithRetry(() => import('@/pages/legal/PrivacidadPage'))
const TerminosPage          = lazyWithRetry(() => import('@/pages/legal/TerminosPage'))

function Cargando() {
  return (
    <div className="min-h-screen bg-dark flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-red border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<Cargando />}>
          <Routes>
            {/* Rutas públicas */}
            <Route path={ROUTES.LOGIN} element={<LoginPage />} />
            <Route path={ROUTES.RECUPERAR_PASSWORD} element={<RecuperarPasswordPage />} />
            <Route path={ROUTES.NUEVA_PASSWORD} element={<NuevaPasswordPage />} />
            <Route path={ROUTES.CONSULTA} element={<ConsultaPublicaPage />} />
            <Route path={ROUTES.PRIVACIDAD} element={<PrivacidadPage />} />
            <Route path={ROUTES.TERMINOS} element={<TerminosPage />} />

            {/* Rutas protegidas con layout */}
            <Route path={ROUTES.INICIO} element={
              <ProtectedRoute><AppLayout><InicioPage /></AppLayout></ProtectedRoute>
            } />
            <Route path={ROUTES.CLIENTES} element={
              <ProtectedRoute><AppLayout><ClientesPage /></AppLayout></ProtectedRoute>
            } />
            <Route path={ROUTES.VEHICULOS} element={
              <ProtectedRoute><AppLayout><VehiculosPage /></AppLayout></ProtectedRoute>
            } />
            <Route path={ROUTES.SERVICIOS} element={
              <ProtectedRoute><AppLayout><ServiciosPage /></AppLayout></ProtectedRoute>
            } />
            <Route path={ROUTES.NOTIFICACIONES} element={
              <ProtectedRoute><AppLayout><NotificacionesPage /></AppLayout></ProtectedRoute>
            } />
            <Route path={ROUTES.CONFIG_USUARIOS} element={
              <ProtectedRoute><AppLayout><UsuariosPage /></AppLayout></ProtectedRoute>
            } />

            {/* Raíz → redirige según el host.
                Si el tenant configuró un dominio dedicado para la consulta
                pública (tenant.app.dominioConsultaPublica), al entrar por ese
                hostname mandamos directo a /consulta. El resto va al panel. */}
            <Route path="/" element={
              typeof window !== 'undefined' && DOMINIO_CONSULTA && window.location.hostname === DOMINIO_CONSULTA
                ? <Navigate to={ROUTES.CONSULTA} replace />
                : <Navigate to={ROUTES.INICIO} replace />
            } />
            {/* Catch-all: cualquier URL no reconocida vuelve a la raíz */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}
