# NEU+ — Estado del proyecto

Sistema de seguimiento post-venta para taller de neumáticos (Calper SA).

- **Repo**: github.com/NicolasLlaneza/Neu- (privado)
- **Frontend**: React 18 + Vite + Tailwind, deployado en Cloudflare Pages → `neumas.pages.dev`
- **Backend**: Supabase (Postgres + Auth + Edge Functions + Storage), región São Paulo
- **Usuarios previstos**: 6 (3 superadmins, 3 admins)

---

## Funcionalidad

### Gestión
- CRUD de **clientes** con tipo persona/empresa (labels y campos que cambian según tipo), documento (DNI/CUIT), contacto para empresas, y filtro por pestañas Todos/Personas/Empresas
- CRUD de **vehículos** con detección automática del tipo de patente (viejo `ABC123`, Mercosur `AB123CD`, moto `A123BC`)
- CRUD de **servicios** con tipos predefinidos + libre, importe, kilometraje y marca de **cobrado** (con fecha automática)
- CRUD de **notificaciones** programadas por WhatsApp
- Búsqueda en todas las páginas; soft delete con filtro "ver bajas" en clientes y vehículos

### Alta rápida desde servicios
El modal de servicio permite crear vehículo y cliente sin salir de la pantalla. Detecta clientes duplicados por teléfono (debounce 400 ms) y ofrece reutilizar el existente. Los tres inserts corren en **una transacción SQL** (`crear_servicio_completo`): si algo falla, no quedan registros huérfanos.

### Fotos
Hasta 5 por servicio, comprimidas en el navegador (máx 0,5 MB / 1600 px) antes de subir. Bucket privado con URLs firmadas de 1 hora. Se pueden cargar al crear el servicio (quedan en memoria con badge "Pendiente" y se suben al guardar) o al editarlo.

### Consulta pública
El cliente ingresa su patente y ve marca, modelo, historial de servicios y fotos. **No expone el nombre del titular** (Ley 25.326). Protegida con CAPTCHA verificado del lado del servidor y rate limit por IP.

### Panel de inicio
- **Alertas accionables**: servicios sin cobrar (con monto), clientes sin volver hace 6+ meses, notificaciones fallidas
- **KPIs del mes**: facturado, cantidad de servicios, ticket promedio, clientes nuevos
- **Tablas**: pendientes de cobro y clientes dormidos con acceso directo para contactarlos
- **Ranking** de servicios más frecuentes (últimos 6 meses, barras CSS sin librería)
- **Actividad reciente** (solo superadmin): quién registró qué y cuándo. Es un registro **neutral de volumen operativo**, no un ranking de productividad — decisión deliberada, alineada con el comentario original del schema

### Gestión de usuarios (solo superadmin)
Alta con contraseña temporal generada (sin caracteres ambiguos), pantalla post-alta con credenciales y botón de copiar, cambio de rol inline, baja y reactivación. La propia fila queda bloqueada: un superadmin no puede darse de baja ni quitarse el rol, para que nadie deje al sistema sin administradores.

### Recuperación de contraseña
Flujo por email con enlace de una hora. La pantalla de solicitud **no revela si la cuenta existe** (evita enumeración de usuarios).

---

## Seguridad

| Medida | Detalle |
|---|---|
| Row Level Security | Activo en todas las tablas, con funciones `SECURITY DEFINER` para evitar recursión |
| Auditoría infalsificable | Triggers setean `creado_por` / `registrado_por` / `programado_por` con `auth.uid()`; el valor que mande el cliente se ignora |
| CAPTCHA server-side | Turnstile verificado contra Cloudflare antes de devolver datos; el RPC quedó revocado para `anon` |
| Validación de hostname | El site key es público: se valida que el token venga de un dominio autorizado |
| Rate limit | Máx 30 consultas públicas por IP/hora, con limpieza diaria de los logs |
| CORS restringido | Whitelist de orígenes con `Vary: Origin`, configurable por env var |
| Transaccionalidad | Alta de cliente+vehículo+servicio en una sola transacción |
| Datos personales | La consulta pública no expone al titular; Sentry configurado sin PII |
| Consentimiento WhatsApp | Campo explícito por cliente con fecha; filtrado en el cron y en el envío directo |
| Sesión | Timeout por inactividad (30 min, aviso a los 60 s); `ProtectedRoute` verifica `profile.activo` |
| Auto-lockout | Un superadmin no puede quitarse el rol ni darse de baja |
| Backups | Dump semanal automático (el plan free de Supabase no incluye backups) |
| Monitoreo | Sentry solo en producción, sin datos personales |

---

## Base de datos

**Tablas**: `profiles`, `clientes`, `vehiculos`, `servicios`, `fotos_servicio`, `notificaciones`, `configuracion_whatsapp`, `consulta_publica_log`

**Migrations** (`supabase/migrations/`):

| # | Contenido |
|---|---|
| 001 | Schema inicial, RLS, triggers de auditoría |
| 002 | Auto-creación de perfil al registrar usuario |
| 003 | Cron de notificaciones cada 5 min (pg_cron + pg_net) |
| 004 | `configuracion_whatsapp` (Embedded Signup) |
| 005 | Consentimiento de WhatsApp por cliente |
| 006 | Revoca `consulta_publica` para el rol `anon` |
| 007 | Tipo de cliente persona/empresa |
| 008 | Campo `cobrado` + fecha de cobro |
| 009 | `consulta_publica` devuelve fotos |
| 010 | RPC `crear_servicio_completo` (transaccional) |
| 011 | Rate limit de consulta pública |
| 012 | Auditoría en vehículos, gestión de usuarios, índices del panel |

**Edge Functions** (`supabase/functions/`):
- `send-notification` — envía un WhatsApp; acepta secret interno (cron) o JWT de admin (botón "Enviar ahora")
- `process-notifications` — corre cada 5 min, busca pendientes vencidas y las dispara
- `consulta-publica` — verifica CAPTCHA + rate limit, llama al RPC y firma las URLs de las fotos
- `exchange-fb-code` — intercambia el code del Embedded Signup por access token
- `admin-create-user` — alta de usuario (auth + perfil), solo superadmin
- `_shared/cors.ts` — whitelist de orígenes compartida

---

## Testing y calidad

- **30 tests** con Vitest sobre `src/lib/` (patente, teléfono, fecha)
- **GitHub Action** corre tests + build en cada push a `master`
- **Code splitting** por ruta: bundle inicial 121 KB gzip (la librería de compresión de imágenes, 28 KB, solo baja al entrar a Servicios)
- Guía del patrón de tests en `docs/TESTING.md`

---

## Estado de WhatsApp

Funciona técnicamente end-to-end, pero está **bloqueado por Meta** para producción.

- ✅ Envío verificado con número de prueba
- ✅ System User `neumasbot` con token permanente
- ✅ Cron corriendo cada 5 minutos
- ✅ Coexistence configurado a nivel WABA (el número sigue en el celular del taller)
- ❌ **Embedded Signup bloqueado**: Meta exige Business Verification + App Review para que un Tech Provider registre clientes

**Camino pendiente**: Business Verification (3-14 días, requiere CUIT de AFIP, estatuto de Calper SA, habilitación municipal, factura de servicios) → App Review (1-3 semanas, requiere video del flujo + política de privacidad publicada ✅).

Mientras tanto el sistema queda operativo sin envío automático: se cargan las notificaciones y se envían cuando Meta habilite.

---

## Pendiente

### Configuración (afuera del código)
- 🔲 `VITE_SENTRY_DSN` en Cloudflare Pages
- 🔲 `SUPABASE_DB_URL` como secret del repo (para el backup)
- 🔲 Redirect URLs de recuperación en Supabase Auth (`/nueva-password`)
- 🔲 Registro de la base ante la **AAIP** (obligatorio, gratis, trámite online)
- 🔲 Dominio propio del cliente (DonWeb) → actualizar `ALLOWED_ORIGINS`, `TURNSTILE_ALLOWED_HOSTNAMES` y los dominios en Meta
- 🔲 Claves reales de Turnstile (hoy están las de prueba)
- 🔲 Business Verification + App Review en Meta

### Mejoras identificadas, no bloqueantes
- Exportar a Excel/CSV (contabilidad y seguros siempre lo piden)
- Paginación en tablas (hoy va bien; a los 500+ registros se va a notar)
- 2FA para admins (Supabase Auth soporta TOTP)
- Cifrado del dump de backup (hoy va en claro en un repo privado)
- SMTP propio (el default de Supabase permite 3-4 mails/hora y suele caer en spam)
- Filtros avanzados por fecha/tipo/estado
- Historial de cambios completo (hoy solo se registra quién creó, no quién editó)

### Features planeadas

**Órdenes de trabajo** (mecánicos → admin → presupuesto)
Un mecánico carga desde el celular qué hay que hacerle a un vehículo; el admin autoriza o rechaza; al autorizar se convierte en presupuesto. Requiere rol `mecanico`, tablas `ordenes_trabajo` + `orden_items`, RLS específica y bandeja de autorización. Definir si el mecánico puede adjuntar fotos y si hay vencimiento de la orden.

**QR para consulta pública**
Dos usos complementarios: un QR genérico plotteado en el taller (lleva a `/consulta`) y uno personalizado por vehículo en cada comprobante (`?p=PATENTE`, salta directo al historial). Requiere leer el query param y `qrcode.react`. Si se quiere que los QR no sirvan para siempre, hace falta una tabla de tokens efímeros.

**Módulo de presupuestos**
Con conversión desde orden de trabajo aprobada.

---

## Filosofía de desarrollo
- Entender el "por qué" de cada decisión, no solo el "cómo"
- Calidad sobre velocidad
- Código mantenible y comentado
- Seguridad desde el día uno
