// Wrapper delgado sobre sonner para tener un punto único de disparo
// y evitar que cada archivo tenga que conocer la API específica.
//
// Uso:
//   notificar.exito('Cliente creado')
//   notificar.error('No se pudo guardar', supabaseError)   // el 2do arg es opcional; si viene se loguea con logger
//
// Ventajas:
//   - Consistencia visual y de mensajes en toda la app.
//   - Un solo lugar donde cambiar sonner por otra librería si hiciera falta.
//   - Los mensajes técnicos van a Sentry via logger.error, no al usuario final.

import { toast } from 'sonner'
import logger from './logger'

export const notificar = {
  exito(mensaje) {
    toast.success(mensaje)
  },

  error(mensaje, detalle) {
    if (detalle) logger.error(detalle)
    toast.error(mensaje)
  },

  info(mensaje) {
    toast(mensaje)
  },

  // Para acciones optimistas con posibilidad de deshacer.
  promesa(promesa, mensajes) {
    return toast.promise(promesa, mensajes)
  },
}
