# Instalar Bitácora para un cliente nuevo

Guía end-to-end para dejar operativa una instalación desde cero. Tiempo
aproximado: 30 minutos si nunca lo hiciste, 15 la segunda vez.

## Requisitos previos

- Cuenta de GitHub (para forkear este repo)
- Cuenta de Supabase (plan free alcanza para arrancar)
- Cuenta de Cloudflare (Pages es gratis; el dominio custom es opcional)
- Cuenta de Cloudflare Turnstile (gratis, sirve para el CAPTCHA de la consulta pública)
- Logo del cliente en PNG (idealmente 512×512 con fondo transparente)

## 1. Preparar el repo del cliente

```bash
# Forkeá o cloná este repo con un nombre por cliente
gh repo create mnk-labs/bitacora-<cliente> --template NicolasLlaneza/bitacorabymnk --private
```

O manual: fork desde la UI de GitHub y cloná localmente.

## 2. Editar `tenant.config.json`

Único archivo que cambia por cliente. Editá los valores:

```json
{
  "marca": {
    "nombre":        "Nombre visible del cliente",
    "razonSocial":   "Razón social legal",
    "emailContacto": "contacto@cliente.com"
  },
  "contacto": {
    "telefono":  "+54 9 XXX XXX-XXXX",
    "whatsapp":  "549XXXXXXXXXX",
    "direccion": "Dirección de la sede principal",
    "horarios":  "Lunes a viernes de 9 a 18 hs"
  },
  "colores": {
    "primario":       "#910000",
    "primarioBright": "#ff0000"
  },
  "tiposServicio": [
    "Tipo de servicio 1",
    "Tipo de servicio 2",
    "Otro"
  ],
  "app": {
    "titulo":                "Nombre del cliente | Bitácora",
    "dominioConsultaPublica": "consulta.cliente.com"
  }
}
```

Notas:

- `whatsapp` va sin `+` y sin espacios (formato E.164, empieza con `549`).
- `dominioConsultaPublica` es opcional. Si el cliente NO tiene un
  subdominio dedicado para la consulta pública, poné `null`.
- Si querés más de 4 tipos de servicio, sumá strings al array.
- 'Otro' se agrega automáticamente si no está listado, así que no hace
  falta ponerlo a mano.

## 3. Poner los logos

Copiar 3 archivos a `frontend/public/`:

- `logo.png` — logo principal (512×512 sugerido)
- `favicon.png` — ícono de pestaña (32×32 mínimo)
- `apple-touch-icon.png` — ícono iOS (180×180)

Podés usar el mismo archivo con distintos tamaños si no tenés variantes.

## 4. Crear el proyecto de Supabase

1. En https://supabase.com/dashboard/new creá un proyecto nuevo.
2. Guardá el **project ref** (aparece en la URL, tipo `abcdefghijklmnop`).
3. En **Dashboard → Settings → API**, guardate:
   - **Project URL** (`https://<project_ref>.supabase.co`)
   - **anon public** key (el JWT largo)

### 4.1. Editar `003_schedule_notifications_cron.sql`

Antes de aplicar las migraciones, abrí
`supabase/migrations/003_schedule_notifications_cron.sql` y reemplazá los
dos placeholders con los valores reales:

- `SUPABASE_URL_PLACEHOLDER` → tu Project URL (sin barra final).
- `SUPABASE_ANON_KEY_PLACEHOLDER` → tu anon public key.

Si te olvidás, la migración se aplica igual pero el cron dispara requests
contra un dominio inexistente y las notificaciones nunca se envían.

### 4.2. Aplicar migraciones

```bash
cd supabase
supabase link --project-ref <PROJECT_REF>
supabase db push
```

Si no tenés la CLI de Supabase instalada:

```bash
brew install supabase/tap/supabase   # o npm i -g supabase
```

## 5. Setear secrets en Supabase

En `Dashboard → Edge Functions → Manage secrets` cargar:

```
ALLOWED_ORIGINS = https://<subdominio>.pages.dev,https://*.<subdominio>.pages.dev,http://localhost:5173
TURNSTILE_ALLOWED_HOSTNAMES = <subdominio>.pages.dev,*.<subdominio>.pages.dev,localhost
TURNSTILE_SECRET_KEY = <secret_key_de_turnstile>
INTERNAL_SECRET = <string_random_para_llamadas_internas>
```

Solo si el cliente usa WhatsApp Business API:

```
WHATSAPP_ACCESS_TOKEN = <token_permanente>
WHATSAPP_PHONE_NUMBER_ID = <phone_id>
```

## 6. Crear un site en Cloudflare Turnstile

1. En https://dash.cloudflare.com/?to=/:account/turnstile creá un site nuevo.
2. Agregá los hostnames que vas a usar (el `.pages.dev` inicial + el dominio propio si aplica).
3. Copiá el **Site Key** (público) y el **Secret Key** (privado, va en Supabase).

## 7. Deploy en Cloudflare Pages

1. En https://dash.cloudflare.com/?to=/:account/pages tocar "Create a project".
2. Conectar la cuenta de GitHub y seleccionar el repo del cliente.
3. Config de build:
   - Framework preset: **None**
   - Build command: `cd frontend && npm install && npm run build`
   - Build output directory: `frontend/dist`
   - Root directory: `/`
4. Variables de entorno (Production y Preview):

```
VITE_SUPABASE_URL       = https://<project_ref>.supabase.co
VITE_SUPABASE_ANON_KEY  = <anon_key_de_supabase>
VITE_TURNSTILE_SITE_KEY = <site_key_de_turnstile>
```

Guardar y deployar.

## 8. Configurar los secrets del workflow

En el repo del cliente, en GitHub → Settings → Secrets → Actions, agregar:

```
SUPABASE_ACCESS_TOKEN = <token_personal_de_supabase>
SUPABASE_PROJECT_REF  = <project_ref>
```

Con eso, cada push a `master` que toque `supabase/functions/**` deploya
automáticamente las Edge Functions.

## 9. Crear el primer superadmin

En Supabase → Authentication → Users → **Add user** → *Create new user*:

- Email: el que vaya a usar la persona para entrar.
- Password: una que elijas vos (esta NO es temporal — la vas a usar tal cual).
- Tildá **Auto Confirm User** para saltear la verificación por mail.

El trigger `handle_new_user` (migración 002/012/015) crea la fila en
`public.profiles` automáticamente, con `rol = 'admin'`. Sólo falta
promoverla a superadmin desde el **SQL Editor**:

```sql
update public.profiles
   set rol    = 'superadmin',
       nombre = 'Nombre Apellido',
       activo = true
 where email = '<el_email_creado>';
```

Verificá que haya afectado una fila:

```sql
select email, nombre, rol, activo, debe_cambiar_password
  from public.profiles;
```

> No uses `insert` acá: la fila ya existe por el trigger y el insert
> rebota por clave duplicada. El primer superadmin queda con
> `debe_cambiar_password = false` porque la contraseña la eligió su
> propio dueño en el dashboard. Los usuarios que ese superadmin cree
> después desde la app sí arrancan con el flag en true y el sistema
> les fuerza el cambio en el primer ingreso.

## 10. Verificar

- Entrá al preview URL de Cloudflare Pages con las credenciales del superadmin.
- Cambiá la contraseña temporal (te lo pide al primer login).
- Cargá un cliente, un vehículo, un servicio de prueba.
- Probá la consulta pública en `<preview_url>/consulta`.

## Dominio custom (opcional)

En Cloudflare Pages → tu proyecto → Custom domains, agregar
`bitacora.cliente.com` o similar. Si el DNS del cliente NO está en
Cloudflare, sumar un CNAME en el proveedor apuntando a
`<subdominio>.pages.dev`.

Para la consulta pública dedicada (`consulta.cliente.com`), sumar otro
custom domain y ese hostname también en Turnstile + Supabase
`ALLOWED_ORIGINS`.

## Problemas frecuentes

- **CORS error en consulta pública**: falta agregar el hostname a
  `ALLOWED_ORIGINS` en Supabase.
- **"Origen no autorizado" en consulta pública**: falta agregar el hostname
  a `TURNSTILE_ALLOWED_HOSTNAMES` en Supabase.
- **"Captcha inválido"**: `VITE_TURNSTILE_SITE_KEY` y
  `TURNSTILE_SECRET_KEY` no son del mismo par.
- **Build de Pages falla con "file > 25 MB"**: alguien subió un asset
  pesado a `frontend/public/`. Sacalo o comprimí.
