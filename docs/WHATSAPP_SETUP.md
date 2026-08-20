# WhatsApp Business API — Setup en la oficina del cliente

Guía práctica para configurar la integración de producción de WhatsApp en NEU+.

---

## Objetivo

Pasar de token temporal de prueba (dura 24h) a un **token permanente** usando un **System User** del Business Portfolio. Esto sobrevive a cambios de personal.

---

## Estado actual del proyecto

**Ya funciona:**
- Edge Functions deployadas en Supabase: `send-notification`, `process-notifications`
- Cron job cada 5 min vía pg_cron
- Botón "Enviar ahora" en el frontend
- Envío end-to-end verificado con token temporal

**Falta:**
- Token permanente vía System User
- Verificación del negocio ante Meta (si van a mandar a números no autorizados)
- Aprobar plantillas de mensajes para casos fuera de sesión de 24h

---

## Pre-requisitos antes de arrancar

1. Estar logueado en Meta con una cuenta que tenga **acceso al Business Portfolio de NEU+** con rol **Admin**
2. Idealmente: **pedir al cliente que agregue a Nicolas Llaneza** al portfolio con rol Admin, para no depender del acceso del empleado que pueda irse

---

## Paso 1 — Crear System User

Un System User es un "usuario robot" que pertenece al Business Portfolio, no a una persona. Sobrevive a cambios de personal.

1. Ir a [business.facebook.com](https://business.facebook.com)
2. Seleccionar el **Business Portfolio de NEU+**
3. **Configuración del negocio** (arriba a la izquierda, ícono ⚙️)
4. Menú lateral: **Usuarios → Usuarios del sistema**
5. Click **"Agregar"**
6. Nombre: `neuplus-api-bot`
7. Rol: **Admin**
8. Crear

---

## Paso 2 — Asignar activos

Con el System User seleccionado en la lista:

1. Click **"Asignar activos"**
2. Seleccionar cada uno de estos activos (uno por uno):
   - **App** de Meta for Developers (la que tiene WhatsApp configurado)
   - **Cuenta de WhatsApp Business** (WABA)
   - **Número de teléfono** (si aparece como activo separado)
3. Para cada uno, marcar **"Control total"**
4. Guardar cambios

---

## Paso 3 — Generar token permanente

Con el System User seleccionado:

1. Click **"Generar token"** (botón verde arriba a la derecha)
2. Seleccionar la App de NEU+
3. **Caducidad: "Sin vencimiento"** (crítico — si eligen 60 días, se rompe todo en 60 días)
4. Permisos a activar:
   - `whatsapp_business_messaging` — para enviar mensajes
   - `whatsapp_business_management` — para gestionar plantillas y config
5. Click **"Generar token"**
6. **⚠️ COPIAR EL TOKEN AHORA** — solo se muestra una vez. Guardarlo en un lugar seguro (no en git).

---

## Paso 4 — Actualizar Supabase con el token permanente

Desde una terminal con acceso al repo:

```bash
cd D:\Neu+
npx supabase secrets set WHATSAPP_ACCESS_TOKEN=<pegar_token_aqui>
```

Verificar que se seteó:
```bash
npx supabase secrets list
```

Debería listar `WHATSAPP_ACCESS_TOKEN` (el valor sale enmascarado).

---

## Paso 5 — Verificar que el Phone Number ID sigue siendo el correcto

En Meta for Developers → tu App → **WhatsApp → API Setup**:

- **From**: acá aparece un número, y debajo el **Phone number ID**
- Compararlo con el que está seteado en Supabase (default: `1108581319013608`)

Si cambió (por ejemplo si movieron el número a otra app):

```bash
npx supabase secrets set WHATSAPP_PHONE_NUMBER_ID=<nuevo_id>
```

---

## Paso 6 — Probar el envío end-to-end

Desde la app (frontend) — la forma más simple:

1. Login como admin
2. Ir a **Notificaciones → Nueva notificación**
3. Cliente con teléfono verificado (formato `+54911...` sin espacios)
4. Fecha: hoy — Hora: en 1 minuto
5. Mensaje corto de prueba
6. Guardar
7. Click **"Enviar ahora"** en la fila creada
8. Debería llegar al WhatsApp del cliente en pocos segundos

Si falla, ver sección **Troubleshooting** más abajo.

---

## (Opcional) Paso 7 — Verificación del negocio

Si van a **enviar a clientes que nunca escribieron primero al taller**, Meta exige verificar el negocio. Sin verificación solo se puede responder en ventanas de 24h después de que el cliente escribió.

Ubicación: **Meta Business Suite → Configuración del negocio → Información del negocio → Verificación**.

Documentos que suelen pedir en Argentina:
- Constancia de AFIP (CUIT)
- Factura de servicios reciente a nombre del negocio
- Documentos de identidad de los responsables

Puede tardar 3-14 días hábiles.

---

## (Opcional) Paso 8 — Aprobar plantillas de mensajes

Para mensajes fuera de la ventana de 24h (que es el caso de recordatorios), Meta exige usar **plantillas pre-aprobadas**. Esto NO está implementado todavía en la app — está en el roadmap.

Ubicación: **Meta Business Suite → WhatsApp Manager → Plantillas de mensajes → Crear plantilla**.

Categorías útiles para NEU+:
- **Utility**: recordatorios de servicio, confirmaciones. Precio bajo.
- **Marketing**: promociones. Más caras.

Ejemplo de plantilla utility:
```
Hola {{1}}! 👋 Te recordamos desde *NEU+ Neumáticos* que
tu vehículo {{2}} tiene {{3}} pendiente. ¿Coordinamos turno?
```

Los `{{1}}`, `{{2}}`, `{{3}}` son variables que se rellenan al enviar.

Aprobación: 2-5 días hábiles.

---

## Troubleshooting

### "Recipient phone number not in allowed list"
- **En modo test**: agregar el número en Meta for Developers → WhatsApp → API Setup → Manage phone number list
- **En producción**: hay que verificar el negocio y usar plantillas pre-aprobadas

### "Object with ID 'X' does not exist"
- El Phone Number ID configurado no coincide con el que ve el token, o el token no tiene permisos sobre ese número
- Verificar Paso 5 (Phone Number ID) y que el System User tenga "Control total" del número

### "Access token has expired"
- El token temporal duró 24h y venció
- Solución permanente: generar token con Sistem User (Paso 3) con caducidad "Sin vencimiento"

### La API responde `success` pero no llega el mensaje
- Ventana de 24h cerrada — el cliente tiene que haber escrito al número en las últimas 24h
- Solución para siempre: verificar negocio + plantillas aprobadas

### Error de CORS al llamar desde el frontend
- Ya está resuelto en producción, pero si aparece de nuevo, verificar que la Edge Function tenga los headers CORS y que Vercel deployó la última versión

---

## Comandos útiles

```bash
# Ver logs de la Edge Function send-notification
npx supabase functions logs send-notification --tail

# Ver logs de process-notifications
npx supabase functions logs process-notifications --tail

# Ver todos los secrets seteados
npx supabase secrets list

# Re-deployar send-notification después de cambios
npx supabase functions deploy send-notification

# Ver historial del cron
# (correr esto en SQL Editor del dashboard)
select start_time, status, return_message
from cron.job_run_details
order by start_time desc limit 10;

# Ver respuestas HTTP del cron a la edge function
select id, status_code, error_msg, created
from net._http_response
order by created desc limit 10;
```

---

## Datos que NO están en este archivo (por seguridad)

Ninguna credencial va acá. Los valores actuales:
- `WHATSAPP_ACCESS_TOKEN`: seteado en Supabase Secrets
- `WHATSAPP_PHONE_NUMBER_ID`: seteado en Supabase Secrets (`1108581319013608` en test)
- `INTERNAL_SECRET`: seteado en Supabase Secrets

Para verlos (enmascarados):
```bash
npx supabase secrets list
```

Para consultar los valores reales: Dashboard de Supabase → Project Settings → Edge Functions → Secrets.
