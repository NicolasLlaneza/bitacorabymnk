// Labels textuales de la UI que cambian según el rubro del tenant.
//
// El sistema en la BD guarda todo alrededor de "vehículos" (por origen
// histórico — nació para talleres), pero los rótulos que ve el usuario los
// controla tenant.config.json. Un tenant de consultoría muestra "Proyecto"
// donde otro de veterinaria muestra "Mascota", sin cambiar el schema.
//
// Solo la UI cambia. Los endpoints, tablas y URL de rutas quedan igual —
// /vehiculos es una URL interna, se puede refactorear después.

import tenant from '../../../tenant.config.json'

// Fallbacks: si el tenant no definió labels, asumimos el vertical "taller"
// que es el default histórico.
const DEFAULT_LABELS = {
  objeto: {
    singular:             'Vehículo',
    plural:               'Vehículos',
    articulo:             'el',
    identificador:        'Patente',
    identificadorEjemplo: 'AB123CD',
    identificadorAyuda:   'Ingresá la patente sin guiones ni espacios.',
  },
  consultaPublica: {
    titulo:      'Consulta de historial',
    subtitulo:   'Ingresá la patente de tu vehículo para ver sus servicios',
    botonBuscar: 'Buscar',
  },
}

const l = tenant.labels ?? {}

export const OBJETO = {
  singular:             l.objeto?.singular             ?? DEFAULT_LABELS.objeto.singular,
  plural:               l.objeto?.plural               ?? DEFAULT_LABELS.objeto.plural,
  articulo:             l.objeto?.articulo             ?? DEFAULT_LABELS.objeto.articulo,
  identificador:        l.objeto?.identificador        ?? DEFAULT_LABELS.objeto.identificador,
  identificadorEjemplo: l.objeto?.identificadorEjemplo ?? DEFAULT_LABELS.objeto.identificadorEjemplo,
  identificadorAyuda:   l.objeto?.identificadorAyuda   ?? DEFAULT_LABELS.objeto.identificadorAyuda,
}

export const CONSULTA_PUBLICA = {
  titulo:      l.consultaPublica?.titulo      ?? DEFAULT_LABELS.consultaPublica.titulo,
  subtitulo:   l.consultaPublica?.subtitulo   ?? DEFAULT_LABELS.consultaPublica.subtitulo,
  botonBuscar: l.consultaPublica?.botonBuscar ?? DEFAULT_LABELS.consultaPublica.botonBuscar,
}
