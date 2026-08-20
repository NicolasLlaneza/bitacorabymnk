// Datos institucionales de la empresa.
//
// Este archivo NO define valores hardcoded — los toma de tenant.config.json
// en la raíz del repo, que es el único lugar que se toca al instalar el
// producto en un cliente nuevo.
//
// La vista pública (consulta-publica) también lee CONTACTO_TALLER de acá
// para el bloque del footer.

import tenant from '../../../tenant.config.json'

export const NOMBRE_MARCA   = tenant.marca.nombre
export const NOMBRE_LEGAL   = tenant.marca.razonSocial
export const EMAIL_CONTACTO = tenant.marca.emailContacto

// Datos que se muestran en el pie de la consulta pública.
// Un valor null/'' oculta la fila correspondiente.
export const CONTACTO_TALLER = {
  telefono:  tenant.contacto.telefono,
  whatsapp:  tenant.contacto.whatsapp,
  direccion: tenant.contacto.direccion,
  horarios:  tenant.contacto.horarios,
}
