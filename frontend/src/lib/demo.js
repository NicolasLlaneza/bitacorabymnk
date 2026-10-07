// Modo demo comercial.
//
// Con VITE_DEMO_MODE=true (ver .env.demo y `npm run build:demo`) la app
// corre entera en el navegador: no habla con Supabase, usa datos ficticios
// guardados en localStorage y muestra una marca genérica en vez de la del
// cliente. Sirve para mostrar el producto a otros talleres sin exponer
// datos reales ni depender de la base de producción.
//
// Es una constante de build: en el bundle normal se reemplaza por `false`
// y las ramas de demo quedan muertas.

export const DEMO = import.meta.env.VITE_DEMO_MODE === 'true'

// Credenciales que se precargan en el login de la demo. Cualquier
// email/contraseña entra igual; estas son solo para no tipear.
export const DEMO_CREDENCIALES = {
  email:    'demo@bitacora.app',
  password: 'demo1234',
}
