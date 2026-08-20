// Catálogos de valores enumerados que la app manda a la BD y compara.
//
// Los valores string tienen que coincidir exactamente con los check
// constraints de las migraciones SQL. Si cambia uno, actualizar la
// migración correspondiente en el mismo commit.

import tenant from '../../../tenant.config.json'

// Roles de perfiles. Coincide con el check constraint de public.profiles.rol
// (migración 001) y con ROLES_VALIDOS en supabase/functions/admin-create-user.
export const ROLES = {
  ADMIN:      'admin',
  SUPERADMIN: 'superadmin',
}
export const ROLES_LIST = Object.values(ROLES)

// Canales preferidos de contacto del cliente. Coincide con el check constraint
// de public.clientes.canal_preferido (migración 001) y con los inserts de
// migración 294.
export const CANALES = {
  WHATSAPP: 'WhatsApp',
  EMAIL:    'Email',
  AMBOS:    'Ambos',
}
export const CANALES_LIST = Object.values(CANALES)

// Tipos de servicio pre-cargados por el cliente en tenant.config.json.
// 'Otro' habilita un input de texto libre — se asume que siempre está en
// la lista, así que si el tenant lo omitió lo agregamos al final.
const TIPOS_TENANT = tenant.tiposServicio ?? []
export const TIPOS_SERVICIO = TIPOS_TENANT.includes('Otro')
  ? TIPOS_TENANT
  : [...TIPOS_TENANT, 'Otro']
