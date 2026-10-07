# Demo comercial

El mismo código del producto, compilado en "modo demo": corre entero en el
navegador, sin Supabase, con un taller ficticio y datos inventados. Sirve
para mostrar Bitácora a un prospecto sin instalar nada ni tocar datos de
ningún cliente.

## Cómo funciona

| | Producto (cliente real) | Demo |
|---|---|---|
| Comando | `npm run build` | `npm run build:demo` |
| Personalización | `tenant.config.json` | `tenant.demo.json` |
| Archivos públicos (logo, íconos) | `frontend/public/` | `frontend/public-demo/` |
| Backend | Supabase del cliente | Simulado en el navegador (`src/demo/`) |
| Variables de entorno | Las de `docs/ENV_VARIABLES.md` | Ninguna (`.env.demo` solo activa el modo) |

Como la demo es el mismo código, cada mejora del producto aparece en la
demo en el próximo deploy.

## Correrla

```bash
cd frontend
npm run dev:demo      # local, en http://localhost:5173
npm run build:demo    # build para publicar (carpeta dist/)
```

## Publicarla (Cloudflare Pages)

Un proyecto de Pages propio, apuntando a este repo:

- Build command: `npm run build:demo`
- Build output directory: `dist`
- Root directory: `frontend`
- Sin variables de entorno

## Qué muestra

- Login precargado: se entra con un clic.
- Unos 25 clientes, 30 vehículos y un año de servicios, con fechas relativas
  a hoy: el panel siempre tiene cobros pendientes, clientes sin volver,
  recordatorios del día y una notificación fallida.
- Consulta pública sin captcha, con patentes de ejemplo para tocar (algunas
  con fotos).
- Se puede crear, editar y borrar de todo. Los cambios quedan en el
  navegador de quien la usa; **Reiniciar datos** vuelve al estado inicial.

## Límites

- No envía WhatsApp: "Enviar" abre WhatsApp con el mensaje cargado pero sin
  destinatario, para no escribirle a números inventados.
- Las fotos que se suben se pierden al recargar.
- Los datos de ejemplo son de un taller (vehículos y patentes). Para mostrar
  otro rubro hay que ajustar `tenant.demo.json` (labels, tipos de servicio)
  y `src/demo/seed.js`.

## Dónde está el código

- `src/lib/demo.js` — interruptor del modo demo y credenciales precargadas.
- `src/demo/seed.js` — datos ficticios.
- `src/demo/mockSupabase.js` — reemplazo de Supabase (consultas, RPC, Edge
  Functions, auth y storage) guardado en localStorage.
- `src/components/DemoBanner.jsx` — franja "Modo demo" con reinicio.
- `vite.config.js` — elige tenant y carpeta pública según el modo.
