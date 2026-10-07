# Notificaciones automáticas por WhatsApp — análisis e implementación

Estado al 7/10/2026. Qué impide hoy que los recordatorios salgan solos, qué hay
que cambiar y dónde se hace cada cosa (Meta, Supabase o código).

> Las condiciones de Meta salen de su documentación pública y de guías de
> socios oficiales (ver Fuentes al final). Meta cambia reglas y precios
> seguido: confirmar en la consola antes de cada trámite.

---

## 1. Diagnóstico

El circuito técnico existe y funciona: un cron (`pg_cron`, cada 5 minutos)
llama a `process-notifications`, que busca notificaciones pendientes y vencidas
y le pide a `send-notification` que las envíe por la API de WhatsApp (Cloud API).

Lo que impide que funcione en producción:

| # | Problema | Dónde está | Gravedad |
|---|----------|-----------|----------|
| 1 | Se envía **texto libre** (`type: 'text'`). WhatsApp solo lo acepta dentro de las 24 h posteriores a un mensaje del cliente. Un recordatorio meses después **exige una plantilla aprobada**; si no, Meta lo rechaza con el error 131047. | `send-notification/index.ts` | Bloqueante |
| 2 | La notificación se marca `enviada` cuando Meta **acepta** el pedido, no cuando llega. Los rechazos como el 131047 llegan después, por webhook, y hoy nadie los escucha: la app muestra "enviada" aunque el mensaje nunca llegue. | No hay webhook | Bloqueante |
| 3 | Cuenta de Meta: si la app de Meta pertenece a un portfolio distinto del dueño de la cuenta de WhatsApp (por ejemplo, app de MNK y número de Calper), los permisos estándar no alcanzan y Meta pide App Review. Es probablemente el bloqueo que se documentó en Neu+. | Configuración de Meta | Bloqueante (a verificar) |
| 4 | La API se llama con la **versión v19.0**, que Meta dio de baja el 21/5/2026. Hoy la última es v26.0. | `send-notification/index.ts` | Alta |
| 5 | Dos ejecuciones del cron que se pisan pueden **enviar dos veces** la misma notificación: se lee `pendiente` y se actualiza después del envío, sin bloqueo. | `send-notification/index.ts` | Media |
| 6 | Las notificaciones **se cargan a mano**, con mensaje libre. Que salgan "automáticas" hoy significa solo que se envían a la hora programada; nadie las genera a partir de un servicio. | Frontend | Media (es la feature) |
| 7 | `process-notifications` no verifica quién lo llama: cualquiera con la clave pública puede dispararlo. Solo procesa lo que ya venció, pero conviene protegerlo. | `process-notifications/index.ts` | Baja |
| 8 | El alta de clientes con Embedded Signup (pantalla oculta `ConfigWhatsappPage`) usa la **versión 3**, que Meta da de baja el **15/10/2026**. | `ConfigWhatsappPage.jsx` | Solo para vender a muchos talleres |

---

## 2. Dos caminos según el caso

### A. Un negocio que envía desde su propia cuenta (Neu+, o cada instalación de Bitácora)

No necesita App Review ni Embedded Signup, siempre que **la app de Meta, la
cuenta de WhatsApp (WABA) y el usuario de sistema estén en el mismo portfolio
del negocio**. Es el camino corto y el que destraba Neu+.

- Sin verificar el negocio: hasta **250 clientes distintos por día** en
  mensajes iniciados por el negocio, hasta 2 números y 250 plantillas. Para
  un taller sobra: **la verificación no es requisito para empezar**.
- Verificado: el límite sube solo por niveles (1.000 → 10.000 → 100.000 →
  ilimitado). Conviene tramitarlo en paralelo, pero no frena el arranque.

### B. MNK Labs conectando muchos talleres desde una sola app (escalar Bitácora)

Hace falta ser **Tech Provider**:

1. Verificar el negocio de **MNK Labs** (no el de cada cliente).
2. App Review con dos videos: un mensaje creado en la app y recibido en
   WhatsApp, y la creación de una plantilla desde la app.
3. Acceso avanzado a `whatsapp_business_messaging` y
   `whatsapp_business_management`. La verificación de acceso adicional ya no
   se exige.
4. Embedded Signup **versión 4** para que cada taller conecte su número en
   minutos. Con Coexistence el taller sigue usando WhatsApp Business en el
   celular.

**Recomendación:** arrancar con A (destraba Neu+ ahora y sirve para las
primeras ventas, configurando cada cliente a mano) y tramitar B en paralelo.

---

## 3. Qué hacer y desde dónde

### 3.1 Meta — Configuración del negocio (business.facebook.com)

Con el portfolio **del cliente** (Calper para Neu+):

1. **Cuentas → Apps:** confirmar que la app de WhatsApp pertenece a este
   portfolio. Si es de otro (el de MNK o uno personal), crear una app nueva
   dentro del portfolio del cliente. Es más simple que mover la existente.
2. **Usuarios → Usuarios del sistema:** usuario de sistema (ya existe
   `neumasbot`) con la app, la cuenta de WhatsApp y el número asignados con
   control total. Token **sin vencimiento** con `whatsapp_business_messaging`
   y `whatsapp_business_management`.
3. **Centro de seguridad → Verificación del negocio:** iniciarla (CUIT,
   constancia de AFIP, factura de servicio). Tarda de 3 a 14 días.
4. **Medio de pago:** cargar una tarjeta en la cuenta de WhatsApp (WhatsApp
   Manager → Configuración de pagos), con moneda y zona horaria definidas.
   Los mensajes de plantilla se cobran: sin medio de pago Meta los rechaza
   con el error 131042.

### 3.2 Meta — WhatsApp Manager

1. **Número:** que esté registrado, con nombre visible aprobado y calidad
   "alta".
2. **Plantillas → Crear:** categoría **Utilidad**, idioma **Español
   (Argentina)** (`es_AR`). Propuesta:

   **`recordatorio_servicio`**
   ```
   Hola {{1}}, te escribimos de {{2}}.
   Tu {{3}} ({{4}}) ya está para {{5}}. El último servicio fue el {{6}}.
   Respondé este mensaje si querés coordinar un turno.
   Si no querés recibir más avisos, respondé BAJA.
   ```
   Variables: nombre del cliente, marca del taller, vehículo, patente,
   servicio, fecha del último servicio.

   **`aviso_general`** (para los avisos que hoy se escriben a mano)
   ```
   Hola {{1}}, te escribimos de {{2}}: {{3}}
   ```
   Ojo: Meta puede rechazar o pasar a "Marketing" una plantilla tan abierta.
   Probarla; si la rechaza, se trabaja solo con plantillas específicas.

   Cuidado: sin descuentos, promociones ni "aprovechá". Si Meta la considera
   **Marketing**, la cambia de categoría y cuesta más del doble.
   Precio aproximado en Argentina desde el 1/10/2026: Utilidad **USD 0,026**
   por mensaje entregado, Marketing **USD 0,062**.

### 3.3 Meta — Panel de la app (developers.facebook.com)

1. **App en modo Live** (requiere URL de política de privacidad: ya está
   publicada en `/privacidad`). En modo desarrollo algunos webhooks no llegan.
2. **WhatsApp → Configuración → Webhook:**
   - URL: `https://<proyecto>.supabase.co/functions/v1/whatsapp-webhook`
   - Token de verificación: el valor de `WHATSAPP_VERIFY_TOKEN` (nuevo)
   - Suscribir el campo **`messages`** (trae estados y respuestas).

### 3.4 Supabase — Secrets

```bash
npx supabase secrets set WHATSAPP_ACCESS_TOKEN=<token del usuario de sistema>
npx supabase secrets set WHATSAPP_PHONE_NUMBER_ID=<id del número real>
npx supabase secrets set WHATSAPP_VERIFY_TOKEN=<texto aleatorio>
npx supabase secrets set FB_APP_SECRET=<app secret>   # ya existe; lo usa el webhook para validar firmas
```

### 3.5 Código

**Fase 1 — que salgan (bloqueante).**

- `supabase/functions/_shared/whatsapp.ts` (nuevo): versión de la API en un
  solo lugar (`v26.0`) y armado del pedido de plantilla:
  ```json
  {
    "messaging_product": "whatsapp",
    "to": "549...",
    "type": "template",
    "template": {
      "name": "recordatorio_servicio",
      "language": { "code": "es_AR" },
      "components": [{ "type": "body", "parameters": [
        { "type": "text", "text": "Juan" }, "..."
      ]}]
    }
  }
  ```
- Migración `019_notificaciones_plantillas.sql`:
  - `notificaciones`: columnas `plantilla text`, `parametros jsonb`,
    `wa_message_id text` (único), `entregada_at`, `leida_at`; estado nuevo
    `enviando`.
  - Función `tomar_notificacion(id)`: pasa de `pendiente` a `enviando` en
    una sola operación y devuelve la fila solo si la tomó. Evita los envíos
    dobles.
- `send-notification`: tomar la notificación con `tomar_notificacion`, enviar
  la plantilla y guardar `wa_message_id`. Con el pedido aceptado queda
  `enviada` (Meta lo recibió); si Meta lo rechaza en el momento, `fallida`.
- `process-notifications`: exigir `x-internal-secret` y respetar un tope por
  ejecución (250 por día sin verificación).

**Fase 2 — saber qué pasó (bloqueante para confiar en el estado).**

- `supabase/functions/whatsapp-webhook` (nueva):
  - `GET`: responde el `hub.challenge` si `hub.verify_token` coincide.
  - `POST`: valida la firma `X-Hub-Signature-256` con `FB_APP_SECRET`.
    Procesa los estados por `wa_message_id`: `delivered` → `entregada_at`,
    `read` → `leida_at`, `failed` → estado `fallida` con el código y el
    motivo de Meta.
  - Mensajes entrantes con "BAJA": `acepta_whatsapp = false` en el cliente
    y cancelar sus pendientes. Meta exige respetar la baja.
  - Responder 200 rápido: Meta reintenta si no.
- `config.toml`: `verify_jwt = false` para esta función (Meta no manda JWT).
- Pantalla de Notificaciones: mostrar enviada / entregada / leída / fallida
  con el motivo.

**Fase 3 — que se generen solas (la feature).**

- `tenant.config.json`: sección nueva con cada cuánto se repite cada servicio.
  ```json
  "recordatorios": {
    "plantilla": "recordatorio_servicio",
    "hora": "10:00",
    "porServicio": {
      "Alineación y Balanceo": { "meses": 6 },
      "Rotación de Neumáticos": { "meses": 6 },
      "Cambio de filtros y aceite": { "meses": 6 }
    }
  }
  ```
- Al guardar un servicio (`crear_servicio_completo`), programar el recordatorio
  si el tipo tiene intervalo y el cliente aceptó WhatsApp. Si ya había uno
  pendiente para ese vehículo y tipo, cancelarlo: el cliente volvió antes.
- `NotificacionesPage`: elegir plantilla en lugar de escribir texto libre, con
  vista previa del mensaje armado.
- Ajuste de horario: los recordatorios salen en horario comercial (ya existe la
  restricción `HORA_MIN` / `HORA_MAX`).

**Fase 4 — vender a muchos talleres (camino B).**

- `ConfigWhatsappPage`: pasar a Embedded Signup v4 y volver a mostrarla.
- Crear las plantillas por API al conectar un taller
  (`POST /{waba_id}/message_templates`), para no cargarlas a mano en cada
  cliente.
- Un token por cliente (lo devuelve el Embedded Signup) en lugar de uno global.

---

## 4. Orden sugerido

| Paso | Quién | Dónde | Destraba |
|------|-------|-------|----------|
| Revisar a qué portfolio pertenece la app | Vos con el cliente | Configuración del negocio | Saber si hace falta app nueva |
| Crear plantillas y esperar aprobación | Vos | WhatsApp Manager | Fase 1 |
| Fase 1 en código | Desarrollo | Repo + deploy de funciones | Envío real |
| App en Live + webhook | Vos | Panel de la app | Fase 2 |
| Fase 2 en código | Desarrollo | Repo | Estados confiables |
| Verificación del negocio | El cliente | Centro de seguridad | Más de 250 por día |
| Fase 3 | Desarrollo | Repo | Recordatorios automáticos |
| Tech Provider + Fase 4 | MNK Labs | Panel de la app + repo | Venta a escala |

Implementar en este repo (`bitacorabymnk`) y llevar los cambios a Neu+, que
comparte el mismo código de funciones.

---

## Fuentes

- [Become a Tech Provider — Meta](https://developers.facebook.com/documentation/business-messaging/whatsapp/solution-providers/get-started-for-tech-providers)
- [WhatsApp app review — Meta](https://developers.facebook.com/documentation/business-messaging/whatsapp/solution-providers/app-review)
- [Embedded Signup v4 — Meta blog](https://developers.facebook.com/blog/post/2026/05/14/embedded-signup-v4/)
- [Graph API v19.0 changelog — Meta](https://developers.facebook.com/docs/graph-api/changelog/version19.0/)
- [Graph API v26 — Meta blog](https://developers.facebook.com/blog/post/2026/07/29/introducing-graph-api-v26-and-marketing-api-v26/)
- [Supported template languages — Meta](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/supported-languages/)
- [Webhooks overview — Meta](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview)
- [WhatsApp webhooks guide — Hookdeck](https://hookdeck.com/webhooks/platforms/guide-to-whatsapp-webhooks-features-and-best-practices)
- [Messaging limits 2026 — Chatarmin](https://chatarmin.com/en/blog/whats-app-messaging-limits)
- [Template compliance — Infobip](https://www.infobip.com/docs/whatsapp/compliance/template-compliance)
- [Pricing 2026 — DragApp](https://www.dragapp.com/blog/whatsapp-business-api-pricing/)
- [Argentina pricing — Ominiflow](https://ominiflow.com/whatsapp-api-pricing/argentina)
- [Error 131047 — eGrow](https://help.egrow.com/es/article/whatsapp-business-api-message-errors)
- [Error 131042 (pago) — 360dialog](https://docs.360dialog.com/api/api-error-message-list)
- [API sin verificación — Blueticks](https://blueticks.co/blog/whatsapp-api-without-meta-verification)
