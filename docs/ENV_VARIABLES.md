# Variables de entorno — NEU+

Referencia de todas las variables usadas por el proyecto (frontend y backend).

---

## Frontend (`frontend/.env`)

### Supabase

```
VITE_SUPABASE_URL=https://xxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

### Cloudflare Turnstile (CAPTCHA de la consulta pública)

```
# Dev: 1x00000000000000000000AA (siempre pasa, en cualquier dominio)
# Prod: generar en dash.cloudflare.com/*/turnstile con el dominio real
VITE_TURNSTILE_SITE_KEY=
```

### Facebook Embedded Signup (WhatsApp Business API)

```
# App ID de la App en Meta for Developers
# Ubicación: developers.facebook.com → tu App → Settings → Basic
VITE_FB_APP_ID=

# Config ID del Embedded Signup flow (feature flag específico)
# Ubicación: developers.facebook.com → tu App → WhatsApp
#             → Configuration → Embedded Signup → Create configuration
VITE_FB_CONFIG_ID=
```

### Sentry (monitoreo de errores)

```
# DSN del proyecto en sentry.io → Settings → Client Keys (DSN)
# Solo se usa en producción; en dev el SDK ni se inicializa.
VITE_SENTRY_DSN=
```

---

## Backend — Supabase Edge Functions Secrets

Se setean con `npx supabase secrets set NOMBRE=valor`.

```
# Token del System User "neumasbot" (generado con "Sin vencimiento")
WHATSAPP_ACCESS_TOKEN=EAAG...

# Fallback para el phone_number_id si aún no se completó el Embedded Signup
# (se lee de tabla configuracion_whatsapp cuando esté poblada)
WHATSAPP_PHONE_NUMBER_ID=832435366610262

# Secret compartido entre process-notifications y send-notification
# (generado con: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
INTERNAL_SECRET=

# App Secret de Meta para el intercambio del code por access_token
# Ubicación: developers.facebook.com → tu App → Settings → Basic → App Secret
# ⚠️ NUNCA en el frontend — solo backend
FB_APP_SECRET=

# Secret key de Cloudflare Turnstile (la contraparte del site key)
# Dev/test: 1x0000000000000000000000000000000AA
TURNSTILE_SECRET_KEY=

# Orígenes autorizados para CORS, separados por coma.
# Si no se setea, el default es: https://neumas.pages.dev,http://localhost:5173
ALLOWED_ORIGINS=

# Hostnames desde los que aceptamos tokens de Turnstile, separados por coma.
# Si no se setea, el default es: neumas.pages.dev,localhost
TURNSTILE_ALLOWED_HOSTNAMES=
```

---

## GitHub Actions Secrets

Se setean en el repo → Settings → Secrets and variables → Actions.

```
# Connection string de Postgres para el backup semanal.
# Ubicación: Supabase → Project Settings → Database
#            → Connection string → URI (incluye la contraseña)
SUPABASE_DB_URL=
```

---

## Cómo verificar qué está seteado en Supabase

```bash
cd D:\Neu+
npx supabase secrets list
```

Los valores salen enmascarados (solo primeros y últimos caracteres). Para ver el valor real, entrar al Dashboard → Project Settings → Edge Functions → Secrets.
