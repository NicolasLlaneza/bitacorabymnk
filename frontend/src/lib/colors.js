// Paleta semántica compartida entre JS/JSX y tailwind.config.cjs.
//
// Los estilos que aplican colores por className usan los tokens de Tailwind
// (`bg-warning`, `text-success`, etc.) definidos en tailwind.config.cjs.
// Los estilos inline (que a veces necesitan valor hex con opacidad en JS)
// y las tablas semánticas (badges.js, gráficos) importan de acá.
//
// Los colores de marca (red / redBright) los toma de tenant.config.json,
// el resto de la paleta es común a todos los tenants.

import tenant from '../../../tenant.config.json'

export const COLORS = {
  // Marca (por tenant)
  red:       tenant.colores.primario,
  redBright: tenant.colores.primarioBright,

  // Semánticos (estado)
  success:  '#16a34a',    // verde — OK, enviada, cobrado
  warning:  '#d97706',    // ámbar — próximo, pendiente
  danger:   tenant.colores.primario,    // rojo — urgente, fallida (usa el rojo de marca)
  neutral:  '#666666',    // gris — nuevo
  muted:    '#555555',    // gris más oscuro — cancelada

  // Fondos / superficies (matchear con tailwind.config.cjs colors.dark)
  dark:     '#0d0d0d',
  darkPanel:'#1a1a1a',    // dark-200
  darkBorder:'#2a2a2a',   // dark-400

  // Texto
  textPrimary:   '#f5f5f5', // gray-100
  textSecondary: '#b8b8b8', // gray-200
}
