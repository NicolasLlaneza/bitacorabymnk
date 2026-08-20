import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Logo from '@/components/Logo'
import { NOMBRE_MARCA, NOMBRE_LEGAL, EMAIL_CONTACTO } from '@/lib/empresa'

export default function PrivacidadPage() {
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
          Política de Privacidad
        </h1>
        <p className="text-gray-300 text-xs mb-8">Última actualización: {new Date().toLocaleDateString('es-AR')}</p>

        <div className="text-gray-200 text-sm space-y-6 leading-relaxed">

          <section>
            <h2 className="text-gray-100 text-base font-semibold uppercase tracking-wider mb-2">1. Responsable del tratamiento</h2>
            <p>
              {NOMBRE_MARCA} (razón social: {NOMBRE_LEGAL}) es responsable del tratamiento de los datos
              personales que se cargan y gestionan a través de esta aplicación, conforme a la
              Ley N° 25.326 de Protección de Datos Personales de la República Argentina.
            </p>
            <p className="mt-2">
              Contacto:{' '}
              <a href={`mailto:${EMAIL_CONTACTO}`} className="text-red hover:text-red-bright">
                {EMAIL_CONTACTO}
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-gray-100 text-base font-semibold uppercase tracking-wider mb-2">2. Qué datos recolectamos</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Nombre y apellido o razón social</li>
              <li>Número de teléfono</li>
              <li>Correo electrónico (opcional)</li>
              <li>Documento de identidad (opcional, DNI o CUIT)</li>
              <li>Datos del vehículo: patente, marca, modelo, año, kilometraje</li>
              <li>Historial de servicios realizados</li>
              <li>Fotografías del vehículo o del servicio (evidencia)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-gray-100 text-base font-semibold uppercase tracking-wider mb-2">3. Para qué usamos tus datos</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Gestionar la relación comercial post-venta con el taller</li>
              <li>Enviar recordatorios de mantenimiento por WhatsApp (solo con consentimiento explícito)</li>
              <li>Permitir al titular consultar su propio historial mediante la patente</li>
              <li>Cumplir obligaciones legales, contables e impositivas</li>
            </ul>
          </section>

          <section>
            <h2 className="text-gray-100 text-base font-semibold uppercase tracking-wider mb-2">4. Consentimiento para WhatsApp</h2>
            <p>
              El envío de notificaciones por WhatsApp requiere consentimiento explícito del titular.
              Este consentimiento se registra al momento de dar de alta el cliente y puede revocarse
              en cualquier momento contactando al taller.
            </p>
          </section>

          <section>
            <h2 className="text-gray-100 text-base font-semibold uppercase tracking-wider mb-2">5. Derechos del titular (ARCO)</h2>
            <p>Podés ejercer los siguientes derechos sin costo:</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li><strong className="text-gray-100">Acceso:</strong> conocer qué datos tuyos tenemos.</li>
              <li><strong className="text-gray-100">Rectificación:</strong> corregir datos inexactos.</li>
              <li><strong className="text-gray-100">Cancelación / supresión:</strong> pedir que borremos tus datos.</li>
              <li><strong className="text-gray-100">Oposición:</strong> negarte a que usemos tus datos con fines específicos (por ejemplo, recibir notificaciones).</li>
            </ul>
            <p className="mt-2">
              Para ejercerlos, contactanos por email o WhatsApp. Tenemos 10 días hábiles para responder.
            </p>
          </section>

          <section>
            <h2 className="text-gray-100 text-base font-semibold uppercase tracking-wider mb-2">6. Compartir información con terceros</h2>
            <p>
              No vendemos ni cedemos tus datos a terceros con fines comerciales. Utilizamos
              proveedores de servicios técnicos que actúan como procesadores de datos por cuenta nuestra:
            </p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li><strong>Supabase</strong> (almacenamiento de base de datos, EE.UU./Europa)</li>
              <li><strong>Cloudflare</strong> (hosting del sitio web y protección anti-bot)</li>
              <li><strong>Meta / WhatsApp Business</strong> (envío de notificaciones, solo con consentimiento)</li>
              <li><strong>GitHub</strong> (resguardo de copias de seguridad en repositorio privado, acceso limitado al personal técnico autorizado)</li>
              <li><strong>Sentry</strong> (monitoreo de errores técnicos; está configurado para no recibir datos personales)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-gray-100 text-base font-semibold uppercase tracking-wider mb-2">7. Retención de datos</h2>
            <p>
              Conservamos tus datos mientras exista relación comercial. Si pedís la baja, los eliminamos
              en un plazo máximo de 30 días, salvo aquellos que la ley nos obligue a conservar
              (por ejemplo, comprobantes fiscales por 10 años).
            </p>
          </section>

          <section>
            <h2 className="text-gray-100 text-base font-semibold uppercase tracking-wider mb-2">8. Seguridad</h2>
            <p>
              Implementamos medidas técnicas y organizativas para proteger tus datos: cifrado en tránsito
              (HTTPS), aislamiento de datos por usuario a nivel de base (RLS), auditoría de accesos,
              y verificación anti-bot en las consultas públicas.
            </p>
          </section>

          <section>
            <h2 className="text-gray-100 text-base font-semibold uppercase tracking-wider mb-2">9. Registro AAIP</h2>
            <p>
              Esta base de datos se encuentra inscripta ante la Agencia de Acceso a la Información Pública
              (AAIP), autoridad de aplicación de la Ley 25.326.
            </p>
            <p className="text-xs text-gray-300 italic mt-2">
              Número de registro: en trámite.
            </p>
          </section>

          <section>
            <h2 className="text-gray-100 text-base font-semibold uppercase tracking-wider mb-2">10. Cambios en esta política</h2>
            <p>
              Podemos actualizar esta política. La versión vigente siempre está disponible en esta URL,
              con fecha de última actualización visible arriba.
            </p>
          </section>

        </div>

      </div>
    </div>
  )
}
