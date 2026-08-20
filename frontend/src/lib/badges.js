// Configuración de badges y colores semánticos usados en varias páginas.
//
// Centralizado acá para no tener labels/colores duplicados y para que
// cambiar la paleta sea un solo lugar.
//
// Los colores vienen de lib/colors.js — no hardcodear hex acá.

import { COLORS } from './colors'

export const estadoCliente = {
  nuevo:   { label: 'Nuevo',   color: COLORS.neutral },
  ok:      { label: 'OK',      color: COLORS.success },
  proximo: { label: 'Próximo', color: COLORS.warning },
  urgente: { label: 'Urgente', color: COLORS.danger },
}

export const estadoNotificacion = {
  pendiente: { label: 'Pendiente', color: COLORS.warning },
  enviada:   { label: 'Enviada',   color: COLORS.success },
  fallida:   { label: 'Fallida',   color: COLORS.danger },
  cancelada: { label: 'Cancelada', color: COLORS.muted },
}
