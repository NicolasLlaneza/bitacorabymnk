# Bitácora

Sistema de gestión post-venta para negocios con relación recurrente al
cliente. Un solo lugar para ver clientes, historial de servicios,
recordatorios automáticos y consulta pública.

Desarrollado por **MNK Labs**.

## Rubros a los que aplica

El core sirve a cualquier negocio donde el cliente vuelve para servicios
recurrentes:

- Talleres de neumáticos, mecánica, electricidad automotor
- Clínicas veterinarias
- Consultorios médicos y odontológicos
- Ópticas
- Servicio técnico de electrodomésticos / aires acondicionados
- Mantenimiento de piscinas
- Emprendedores con follow-up de ventas

## Instalar para un cliente nuevo

Ver [`docs/SETUP_NEW_CLIENT.md`](docs/SETUP_NEW_CLIENT.md) — 30 minutos
end-to-end si tenés Supabase y Cloudflare Pages a mano.

## Personalización

Toda la personalización por cliente vive en **un solo archivo**:
[`tenant.config.json`](tenant.config.json).

Ese archivo controla:

- Nombre de marca, razón social, email de contacto
- Teléfono, WhatsApp, dirección y horarios (para la consulta pública)
- Colores primarios (Tailwind + estilos inline)
- Tipos de servicio pre-cargados en el catálogo
- Título de la pestaña del navegador
- Dominio dedicado para la consulta pública (opcional)

Los secretos (Supabase keys, Turnstile keys, token de WhatsApp Business API)
NO van en `tenant.config.json` — se configuran como variables de entorno en
Supabase y Cloudflare Pages.

## Stack

- Frontend: React 18 + Vite + Tailwind + React Router 6
- Backend: Supabase (Postgres + Auth + Edge Functions Deno) + pg_cron
- Deploy: Cloudflare Pages (frontend) + GitHub Actions (edge functions)
- CAPTCHA: Cloudflare Turnstile en la consulta pública
- Mensajería: WhatsApp Business Cloud API (Meta)
