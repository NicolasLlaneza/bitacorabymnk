// Utilidades para abrir WhatsApp Web / la app con un mensaje pre-cargado.
//
// Formato oficial de Meta: https://wa.me/<numero_internacional_sin_+>?text=<url_encoded>
// En desktop abre WhatsApp Web; en mobile intenta abrir la app y cae a web
// si no está instalada.

import { normalizarTelefono } from './telefono'

/** Base URL del deep-link oficial de WhatsApp (Meta). */
export const WHATSAPP_BASE_URL = 'https://wa.me'

/**
 * Arma la URL de wa.me con el mensaje pre-cargado.
 * Devuelve null si el teléfono no se puede normalizar (evita abrir
 * WhatsApp con un número basura).
 */
export function waMeUrl(telefono, mensaje) {
  const num = normalizarTelefono(telefono)
  if (!num) return null
  const texto = encodeURIComponent(mensaje ?? '')
  return `${WHATSAPP_BASE_URL}/${num}?text=${texto}`
}

/**
 * Abre wa.me en una nueva pestaña. Devuelve true si se abrió,
 * false si el navegador la bloqueó (típicamente por popup blocker
 * cuando no fue disparada por un click directo del usuario).
 */
export function abrirWhatsApp(telefono, mensaje) {
  const url = waMeUrl(telefono, mensaje)
  if (!url) return false
  const win = window.open(url, '_blank', 'noopener,noreferrer')
  return !!win
}
