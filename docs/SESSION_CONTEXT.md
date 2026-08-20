# Contexto de sesión — NEU+

Este archivo resume el estado técnico completo del proyecto NEU+ para que cualquier sesión de Claude Code (nueva) pueda continuar sin fricción.

**Instrucciones:** copiá este archivo entero como primer mensaje de contexto en una nueva sesión.

---

## Qué es NEU+

Aplicación web de seguimiento post-venta para un taller de neumáticos. Permite gestionar clientes, vehículos, servicios, notificaciones automáticas por WhatsApp, y consulta pública por patente.

- **Repo**: https://github.com/NicolasLlaneza/Neu-
- **Deploy frontend**: Vercel — https://neumas-livid.vercel.app (URL puede variar según último deploy)
- **Backend**: Supabase, proyecto `isswkrbmtklhogfsivce`
- **Region Supabase**: São Paulo (`sa-east-1`)

---

## Stack

- **Frontend**: React 18 + Vite + Tailwind CSS + React Router 6
- **Backend**: Supabase (Postgres + Auth + Edge Functions Deno + pg_cron)
- **Deploy**: Vercel (frontend), Supabase (backend + funciones)
- **WhatsApp**: Meta WhatsApp Business API oficial

---

## Estructura del repo

```
D:\Neu+\
├── frontend/                       # App React
│   ├── src/
│   │   ├── pages/                  # Login, Clientes, Vehiculos, Servicios, Notificaciones, ConsultaPublica
│   │   ├── components/             # Button, Input, Modal, SearchSelect, InactivityWarning, etc.
│   │   ├── layouts/                # AppLayout, Sidebar, Topbar, BottomNav
│   │   ├── contexts/AuthContext.jsx
│   │   ├── hooks/useInactivityTimeout.js
│   │   ├── lib/supabase.js, logger.js
│   │   └── context.md              # Roadmap / features planeadas
│   ├── .env                        # SUPABASE_URL, ANON_KEY, TURNSTILE_SITE_KEY
│   └── vercel.json                 # rewrites SPA
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql  # Tablas + RLS + triggers auditoría
│   │   ├── 002_auto_create_profile.sql
│   │   └── 003_schedule_notifications_cron.sql
│   ├── functions/
│   │   ├── send-notification/index.ts       # envía mensaje WhatsApp
│   │   └── process-notifications/index.ts   # busca pendientes y las dispara
│   ├── config.toml
│   └── seed.sql                    # usuarios de prueba
├── demo/
│   └── speech-entrevista.docx      # Speech de entrevista técnica
└── docs/
    ├── WHATSAPP_SETUP.md           # Setup en oficina del cliente
    └── SESSION_CONTEXT.md          # Este archivo
```

---

## Base de datos

**Tablas principales** (todas con RLS activo):
- `profiles` — extensión de auth.users. Rol: `admin` | `superadmin`. Campo `activo` para soft-delete.
- `clientes` — nombre, teléfono, email, canal_preferido, estado. Soft delete con `activo` + `fecha_baja`.
- `vehiculos` — cliente_id, patente única, tipo_patente (auto-viejo/nuevo/moto), marca, modelo, año, km. Soft delete.
- `servicios` — vehiculo_id, cliente_id (desnorm.), tipo, fecha, km, producto, importe, observaciones.
- `notificaciones` — cliente_id, servicio_id, motivo, canal, mensaje, fecha_envio, hora_envio, estado (pendiente/enviada/fallida/cancelada), error_msg, enviado_at.
- `fotos_servicio` — evidencia (todavía no implementado del lado frontend).

**Funciones SECURITY DEFINER** (para RLS sin recursión):
- `is_active_admin()` — usa en policies para verificar admin activo
- `is_superadmin()`
- `consulta_publica(p_patente)` — retorna historial público SIN nombre del titular (Ley 25.326)

**Triggers de auditoría** (infalsificables desde cliente):
- `set_audit_user()` setea `creado_por` / `registrado_por` / `programado_por` con `auth.uid()` en INSERTs

**Cron**:
- `process-notifications-every-5-min` corre cada 5 min con `pg_cron` + `pg_net`

---

## Edge Functions

### `send-notification`
Envía un mensaje de WhatsApp para una notificación específica.

**Auth (dos formas):**
- Header `x-internal-secret: <INTERNAL_SECRET>` — para llamadas internas del cron
- JWT de admin activo (Authorization Bearer) — para el botón "Enviar ahora" del frontend

**Body**: `{ notificacion_id: string }`

**Comportamiento**:
1. Busca la notificación en estado `pendiente`
2. Normaliza teléfono (saca todos los no-dígitos)
3. Llama a Meta Graph API v19.0
4. Actualiza estado a `enviada` o `fallida` según respuesta
5. **CORS habilitado** para todos los orígenes

### `process-notifications`
Corre cada 5 minutos. Busca notificaciones pendientes cuya fecha+hora ya llegó, dispara `send-notification` por cada una.

**Timezone**: convierte UTC → America/Argentina/Buenos_Aires (UTC-3) para comparar con `fecha_envio` / `hora_envio` guardados como locales.

---

## Secrets configurados en Supabase

```
WHATSAPP_PHONE_NUMBER_ID  = 1108581319013608  (test number Meta)
WHATSAPP_ACCESS_TOKEN     = <token temporal 24h o permanente>
INTERNAL_SECRET           = <hex 32 bytes>
```

Comando para actualizar:
```bash
npx supabase secrets set NOMBRE=valor
```

---

## Seguridad implementada

- **RLS** en todas las tablas — cerrada correctamente después de auditoría (antes había policy abierta en `vehiculos` que exponía todo a anónimos)
- **Triggers de auditoría** — imposible falsificar `creado_por` desde el cliente
- **Logger condicional** — `frontend/src/lib/logger.js` solo loguea en dev (import.meta.env.DEV)
- **Timeout por inactividad** — 30 min con aviso 60s (useInactivityTimeout hook)
- **ProtectedRoute verifica `profile.activo`** — no basta con sesión válida
- **Password mínima 12 chars** configurada en Supabase Auth
- **Consulta pública sin exponer nombre del titular** — Ley 25.326 protección datos personales
- **Turnstile CAPTCHA** en consulta pública (clave de prueba `1x00000000000000000000AA`, pendiente de dominio propio para clave real)

---

## Pendientes conocidos

### Corto plazo
- **Token permanente WhatsApp** (System User) — cuando el cliente dé acceso al Business Portfolio
- **Verificación del negocio ante Meta** (para envíos fuera de ventana 24h)
- **Plantillas de mensajes aprobadas**

### Roadmap del context.md
1. **Sistema de órdenes de trabajo** (mecánicos → admin autoriza → presupuesto)
2. **QR code** para consulta pública (genérico + personalizado por vehículo)
3. **Marco legal**: registro AAIP, política privacidad, términos, etc.
4. **Dominio propio** del cliente para Turnstile en login
5. **Verificación server-side del CAPTCHA** en consulta pública

### Otras ideas mencionadas
- Fotos de servicio (tabla ya existe, falta UI)
- Notificaciones push in-app para admins
- Pantalla de presupuestos con conversión desde orden de trabajo

---

## Historial de la última sesión

**Fecha aproximada**: junio 2026

**Cosas nuevas que se implementaron**:
1. Deploy de las dos Edge Functions a Supabase
2. Configuración de secrets (`WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `INTERNAL_SECRET`)
3. Cron job vía `cron.schedule()` cada 5 minutos
4. Migration 003 con el SQL del cron
5. **`send-notification` acepta doble auth** (INTERNAL_SECRET o JWT admin)
6. **Botón "Enviar ahora"** en la página de Notificaciones
7. **Fix CORS** en `send-notification` (preflight OPTIONS + headers en json())
8. Speech para entrevista técnica (`demo/speech-entrevista.docx`)
9. `WHATSAPP_SETUP.md` — guía para configurar producción en oficina del cliente

**Problemas encontrados y resueltos**:
- Config `schedule = "*/5..."` en config.toml no era válido — se removió y se usa pg_cron
- Token temporal expiraba a las 24h — se documentó la solución con System User
- `Recipient phone number not in allowed list` — se agregaron números en Meta test
- Error CORS en el botón "Enviar ahora" — se agregaron headers CORS al Edge Function
- Un token nuevo generado desde otra App no tenía permiso sobre el phone number ID — se rotó al correcto
- Mensaje aceptado por Meta pero no llegaba — ventana de 24h de WhatsApp Business

**Pendiente al cerrar sesión**:
- Ir a la oficina del cliente a hacer el setup con System User + token permanente
- Pedir acceso al Business Portfolio de NEU+ para Nicolas Llaneza
- Ver `docs/WHATSAPP_SETUP.md` para la guía paso a paso

---

## Comandos frecuentes

```bash
# Ver estado del repo
cd D:\Neu+ && git status

# Correr frontend local
cd D:\Neu+\frontend && npm run dev

# Deploy manual de una Edge Function
cd D:\Neu+ && npx supabase functions deploy send-notification

# Setear secret
cd D:\Neu+ && npx supabase secrets set NOMBRE=valor

# Ver logs de Edge Function en vivo
npx supabase functions logs send-notification --tail

# Correr migraciones nuevas
# (usualmente se hace desde el SQL Editor del dashboard porque hay pocas y son criticas)

# Regenerar el DOCX del speech
cd D:\Neu+\demo && node generate-speech.js
```

---

## Credenciales de prueba (frontend)

De `supabase/seed.sql`:
- Email: `test@neuplus.com` / Password: `Test1234!`
- Email: `test2@neuplus.com` / Password: `Test1234!`

Estos usuarios se crean con trigger automático de `profiles`.
