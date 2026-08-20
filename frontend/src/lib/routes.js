// Rutas de la app en un solo lugar.
//
// Renombrar/mover una ruta ahora es un cambio de un valor acá y arrastra a
// <Route path>, <Navigate to>, useNavigate(), <Link to>, y a los mapas de
// títulos de topbar / nav. Antes era hacer grep en 12+ archivos y esperar
// no olvidarse ninguno.
//
// Convención: los valores son paths absolutos con '/' inicial. Los usos
// llaman ROUTES.INICIO en lugar de la string cruda '/inicio'.

export const ROUTES = {
  // Públicas
  LOGIN:               '/login',
  RECUPERAR_PASSWORD:  '/recuperar-password',
  NUEVA_PASSWORD:      '/nueva-password',
  CONSULTA:            '/consulta',
  PRIVACIDAD:          '/privacidad',
  TERMINOS:            '/terminos',

  // Privadas (bajo ProtectedRoute)
  INICIO:              '/inicio',
  CLIENTES:            '/clientes',
  VEHICULOS:           '/vehiculos',
  SERVICIOS:           '/servicios',
  NOTIFICACIONES:      '/notificaciones',
  CONFIG_USUARIOS:     '/config/usuarios',
}
