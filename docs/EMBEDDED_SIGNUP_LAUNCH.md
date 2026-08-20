# Checklist para el lunes — Embedded Signup y deploy definitivo

Guía paso a paso de lo que hay que hacer en la oficina del cliente el lunes para pasar a producción.

**Prerequisito**: haber leído esto antes, y tener el token permanente del System User `neumasbot` ya configurado en Supabase Secrets (`WHATSAPP_ACCESS_TOKEN`).

---

## Fase 1 — Confirmar dominio con el cliente (5 min)

**Datos a pedir:**
1. ¿Qué dominios tienen en DonWeb?
2. ¿Cuál van a usar para NEU+? Ej: `neumas.com.ar` o subdominio `app.neumas.com.ar`
3. ¿Podés acceder a la configuración DNS de DonWeb? (o hay que pedir credenciales)

**Decisión a tomar con el cliente:**

| Opción | Recomendación |
|--------|---------------|
| `neumas.com.ar` (raíz) | Si el dominio es exclusivo para la app |
| `app.neumas.com.ar` (subdominio) | Si el dominio raíz tiene otro sitio (landing, etc.) — **más común** |

---

## Fase 2 — Deploy en hosting definitivo (30 min)

Vercel Hobby (free) prohíbe uso comercial. Migramos a un hosting apto.

### Recomendación: Cloudflare Pages
- Gratis, sin restricciones comerciales
- Deploy automático desde GitHub (igual que Vercel)
- CDN global optimizado para LATAM
- HTTPS + certificado SSL automáticos

### Alternativa: Vercel Pro
- USD $20/mes por usuario
- Misma experiencia que Vercel Hobby pero para uso comercial
- Puede tener sentido si prefieren continuidad

### Pasos con Cloudflare Pages
1. Entrar a [dash.cloudflare.com](https://dash.cloudflare.com)
2. **Workers & Pages → Create → Pages → Connect to Git**
3. Autorizar acceso a GitHub → seleccionar repo `NicolasLlaneza/Neu-`
4. Config del build:
   - Framework preset: **Vite**
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: `frontend`
5. **Environment variables** (mismas que en `.env`):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_TURNSTILE_SITE_KEY` (dejar la de test hasta que compremos la real)
   - `VITE_FB_APP_ID` (viene de Fase 4)
   - `VITE_FB_CONFIG_ID` (viene de Fase 4)
6. **Save and Deploy**
7. Anotar la URL provisoria: `neu-plus.pages.dev` (o similar)

---

## Fase 3 — Configurar DNS en DonWeb (15 min + propagación)

1. Entrar al panel de DonWeb → sección **Dominios → DNS**
2. Elegir el dominio (ej: `neumas.com.ar`)
3. Agregar registro:
   - **Para dominio raíz** (`neumas.com.ar`):
     - Tipo: `CNAME` (Cloudflare acepta CNAME en apex, es la magia de Cloudflare)
     - Nombre: `@`
     - Valor: `neu-plus.pages.dev` (la URL provisoria)
   - **Para subdominio** (`app.neumas.com.ar`):
     - Tipo: `CNAME`
     - Nombre: `app`
     - Valor: `neu-plus.pages.dev`
4. Guardar cambios
5. En Cloudflare Pages → tu proyecto → **Custom domains → Set up a custom domain**
   - Agregar el dominio elegido
   - Cloudflare autoconfigura el certificado SSL
6. **Esperar propagación DNS**: 5 min a 24 hs (usualmente 15-30 min)

**Verificación:** `nslookup neumas.com.ar` desde una terminal — debería apuntar a Cloudflare.

---

## Fase 4 — Configurar Meta con el dominio real (30 min)

### 4.1 — Verificar dominio en Meta Business

1. [business.facebook.com](https://business.facebook.com) → **Configuración del negocio → Seguridad de marca → Dominios**
2. **Agregar** → el dominio elegido (sin http/https, ej: `neumas.com.ar`)
3. Meta te da un **meta-tag** o **archivo DNS TXT**
4. Elegir método **DNS TXT** (más rápido):
   - Volver a DonWeb → agregar registro TXT con el valor que dio Meta
   - Esperar 5-10 min
   - Volver a Meta → **Verificar**
5. Confirmar estado **"Verificado"**

### 4.2 — Anotar App ID + App Secret

1. [developers.facebook.com](https://developers.facebook.com) → tu App "Neu+ post venta"
2. **Settings → Basic**
3. Copiar:
   - **App ID** → va a ser `VITE_FB_APP_ID` (público, en Cloudflare)
   - **App Secret** → va a ser `FB_APP_SECRET` (privado, en Supabase Secrets)

### 4.3 — Configurar dominios OAuth

1. Misma pantalla **Settings → Basic**
2. **App Domains**: agregar el dominio real (ej: `neumas.com.ar` o `app.neumas.com.ar`)
3. **Guardar**

### 4.4 — Crear el Embedded Signup flow

1. **WhatsApp → Configuration → Embedded Signup**
2. **Create configuration**
3. Config:
   - **Feature Type**: `whatsapp_business_app_onboarding` (Coexistence)
   - **Solution Type**: `direct_business_solution`
   - **Business assets**: seleccionar el WABA "NEU+ NEUMÁTICOS"
4. Guardar
5. Copiar el **Config ID** → va a ser `VITE_FB_CONFIG_ID` (público, en Cloudflare)

### 4.5 — Agregar dueño del taller como Tester

Sin App Review, solo Testers pueden completar el flujo de Embedded Signup.

1. **App Roles → Testers → Add People**
2. Agregar la cuenta de Facebook del dueño del taller
3. El dueño va a recibir invitación → tiene que aceptar desde su Facebook

---

## Fase 5 — Configurar variables en Cloudflare + Supabase (10 min)

### En Cloudflare Pages → tu proyecto → Settings → Environment variables:

```
VITE_FB_APP_ID=<App ID copiado en 4.2>
VITE_FB_CONFIG_ID=<Config ID copiado en 4.4>
```

Redeploy para que tome las variables nuevas.

### En Supabase → terminal local:

```bash
cd D:\Neu+
npx supabase secrets set FB_APP_SECRET=<App Secret copiado en 4.2>
```

---

## Fase 6 — Probar Embedded Signup end-to-end (15 min)

1. **Entrar a la URL definitiva**: `https://neumas.com.ar` (o el subdominio)
2. Login como admin
3. **Configuración → WhatsApp** en el menú lateral
4. Click **"Conectar WhatsApp Business"**
5. Se abre popup de Facebook
6. Login con la cuenta del dueño del taller (que ya es Tester)
7. Seleccionar el Business Portfolio de NEU+
8. Meta detecta el número en WhatsApp Business App → ofrece **Coexistence**
9. Confirmar
10. El popup se cierra → volvemos a NEU+
11. La página muestra **"Cuenta conectada"** con los datos del número
12. **Verificar en Supabase Table Editor** → tabla `configuracion_whatsapp` → hay una fila con `waba_id` + `phone_number_id`

## Fase 7 — Probar envío end-to-end

1. Ir a **Notificaciones**
2. Crear una notificación de prueba (destinatario: tu propio número)
3. **"Enviar ahora"**
4. Confirmar que llega el mensaje al WhatsApp
5. Confirmar que WhatsApp Business en el celular del taller **sigue funcionando** (Coexistence activo)

## Fase 8 — Dar de baja el deploy anterior (5 min)

1. Confirmado que todo funciona en el dominio nuevo
2. Vercel → proyecto anterior → **Settings → Delete Project**
3. Confirmar

---

## Rollback plan (por si algo sale mal)

**Si Embedded Signup falla en la Fase 6:**
- Verificar App ID + Config ID + App Secret en las 3 ubicaciones (frontend, backend, Meta)
- Verificar que el dueño del taller aceptó la invitación de Tester
- Verificar que el dominio esté "Verificado" en Meta Business
- Consola del navegador (F12) → capturar el error exacto

**Si el envío falla en Fase 7:**
- Verificar que la fila en `configuracion_whatsapp` tenga los IDs correctos
- Verificar `WHATSAPP_ACCESS_TOKEN` en Supabase Secrets (que sea el del System User, no un temporal viejo)
- Consultar logs: `npx supabase functions logs send-notification --tail`

**Si el DNS no propaga:**
- Es lo más común. Esperar más (hasta 24 hs)
- Mientras, se puede probar el flujo en `neu-plus.pages.dev` (la URL provisoria) — Meta acepta cualquier dominio ya verificado

---

## Checklist final antes de irte de la oficina

- [ ] Dominio propio activo con HTTPS
- [ ] Cloudflare Pages deployando desde GitHub automáticamente
- [ ] Vercel Hobby dado de baja
- [ ] Dominio verificado en Meta Business
- [ ] Facebook Login funcionando (Embedded Signup completo)
- [ ] Coexistence activo (verificar mandando WhatsApp manual desde el celular del taller — debe funcionar)
- [ ] Envío desde NEU+ funcionando
- [ ] Todos los secrets/env vars en su lugar
- [ ] Documentación actualizada en `docs/` con los IDs reales (NO commitear secrets)
- [ ] Backup de la BD de Supabase (por las dudas)
