import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Logo from '@/components/Logo'
import { NOMBRE_MARCA, NOMBRE_LEGAL } from '@/lib/empresa'
import { ROUTES } from '@/lib/routes'

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-dark py-10 px-4">
      <div className="max-w-3xl mx-auto">

        <div className="flex justify-center mb-8">
          <Logo />
        </div>

        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs text-gray-200 hover:text-gray-100 transition-colors mb-6"
        >
          <ArrowLeft size={14} /> Volver al inicio
        </Link>

        <h1 className="text-gray-100 text-2xl font-bold uppercase tracking-widest mb-1">
          Términos de Uso
        </h1>
        <p className="text-gray-300 text-xs mb-8">Última actualización: {new Date().toLocaleDateString('es-AR')}</p>

        <div className="text-gray-200 text-sm space-y-6 leading-relaxed">

          <section>
            <h2 className="text-gray-100 text-base font-semibold uppercase tracking-wider mb-2">1. Objeto</h2>
            <p>
              Estos términos regulan el uso de la aplicación web {NOMBRE_MARCA}, operada por {NOMBRE_LEGAL},
              como herramienta interna de gestión de servicios y comunicación con clientes del taller.
            </p>
          </section>

          <section>
            <h2 className="text-gray-100 text-base font-semibold uppercase tracking-wider mb-2">2. Usuarios</h2>
            <p>La aplicación tiene dos tipos de usuarios:</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li><strong className="text-gray-100">Administradores del taller:</strong> personal autorizado por {NOMBRE_LEGAL} que gestiona clientes, vehículos, servicios y notificaciones.</li>
              <li><strong className="text-gray-100">Clientes finales:</strong> propietarios de vehículos que consultan su historial ingresando la patente en la sección pública.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-gray-100 text-base font-semibold uppercase tracking-wider mb-2">3. Uso de la consulta pública</h2>
            <p>
              La consulta pública por patente muestra únicamente información técnica del vehículo y el historial de servicios realizados en el taller. No expone el nombre ni los datos de contacto del titular.
            </p>
            <p className="mt-2">
              El acceso está protegido con un mecanismo anti-bot (Cloudflare Turnstile). Está prohibido intentar saltear esta protección, hacer scraping automatizado o enumeración de patentes.
            </p>
          </section>

          <section>
            <h2 className="text-gray-100 text-base font-semibold uppercase tracking-wider mb-2">4. Titularidad de la información</h2>
            <p>
              La información técnica de los servicios (tipo, fecha, producto, observaciones, fotos) es propiedad de {NOMBRE_LEGAL} en su calidad de prestador del servicio de reparación y mantenimiento. El titular del vehículo tiene derecho a acceder a esta información conforme a los derechos ARCO detallados en la <Link to={ROUTES.PRIVACIDAD} className="text-red hover:text-red-bright">Política de Privacidad</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-gray-100 text-base font-semibold uppercase tracking-wider mb-2">5. Recordatorios por WhatsApp</h2>
            <p>
              El envío de recordatorios por WhatsApp se realiza únicamente a clientes que dieron consentimiento explícito. El taller no envía comunicaciones comerciales masivas ni publicidad no solicitada.
            </p>
          </section>

          <section>
            <h2 className="text-gray-100 text-base font-semibold uppercase tracking-wider mb-2">6. Limitación de responsabilidad</h2>
            <p>
              La información mostrada en la aplicación es referencial. Las recomendaciones de mantenimiento o cambios de piezas dependen del criterio profesional del taller.
            </p>
            <p className="mt-2">
              {NOMBRE_LEGAL} no garantiza disponibilidad ininterrumpida del servicio ni se hace responsable por interrupciones causadas por proveedores externos (hosting, WhatsApp, redes).
            </p>
          </section>

          <section>
            <h2 className="text-gray-100 text-base font-semibold uppercase tracking-wider mb-2">7. Uso indebido</h2>
            <p>
              Está prohibido:
            </p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Acceder sin autorización a la sección administrativa</li>
              <li>Intentar romper mecanismos de seguridad (CAPTCHA, autenticación, RLS)</li>
              <li>Automatizar consultas o scraping</li>
              <li>Falsificar identidad para acceder al historial de terceros</li>
            </ul>
          </section>

          <section>
            <h2 className="text-gray-100 text-base font-semibold uppercase tracking-wider mb-2">8. Jurisdicción y ley aplicable</h2>
            <p>
              Estos términos se rigen por las leyes de la República Argentina. Cualquier controversia se someterá a los tribunales ordinarios de la ciudad de Mendoza, provincia de Mendoza.
            </p>
          </section>

          <section>
            <h2 className="text-gray-100 text-base font-semibold uppercase tracking-wider mb-2">9. Cambios en los términos</h2>
            <p>
              Estos términos pueden actualizarse. La versión vigente siempre está disponible en esta URL, con fecha de última actualización visible arriba.
            </p>
          </section>

        </div>

      </div>
    </div>
  )
}
