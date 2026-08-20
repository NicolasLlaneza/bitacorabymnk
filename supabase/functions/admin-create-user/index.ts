// ─────────────────────────────────────────────────────────────────────────────
// admin-create-user
// Crea un usuario nuevo (auth + perfil) con contraseña temporal.
// Solo callable por un superadmin activo.
//
// El alta de usuarios requiere la Admin API de Supabase, que necesita el
// service role key. Como esa key nunca puede vivir en el frontend, el
// alta pasa por esta función.
//
// Body: { email, password, nombre, rol }
// Auth: Authorization Bearer <JWT del superadmin>
// ─────────────────────────────────────────────────────────────────────────────

import { serve }        from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { jsonResponse, preflight } from '../_shared/cors.ts'

const ROLES_VALIDOS = ['admin', 'superadmin']
// Mínimo de caracteres para la contraseña temporal generada por el
// superadmin al crear el usuario. TIENE QUE COINCIDIR con:
//   - frontend/src/lib/passwordRules.js  (MIN_PASSWORD)
//   - la migración cambiar_mi_password más reciente (018)
//   - "Minimum password length" en Supabase Dashboard → Auth → Providers → Email
// Si difieren, hay flujos que rechazan contraseñas que otro flujo aceptó.
const MIN_PASSWORD  = 8

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return preflight(req)

  const json = (data: unknown, status = 200) => jsonResponse(req, data, status)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // ── Auth: solo superadmins activos ──
  const authHeader = req.headers.get('Authorization') ?? ''
  const jwt = authHeader.replace('Bearer ', '')
  const { data: { user } } = await supabase.auth.getUser(jwt)
  if (!user) return json({ error: 'No autorizado' }, 401)

  const { data: caller } = await supabase
    .from('profiles')
    .select('rol, activo')
    .eq('id', user.id)
    .single()

  if (!caller?.activo || caller.rol !== 'superadmin') {
    return json({ error: 'Solo un superadmin activo puede crear usuarios' }, 403)
  }

  // ── Validación del body ──
  const { email, password, nombre, rol } = await req.json().catch(() => ({}))

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return json({ error: 'Email inválido' }, 400)
  }
  if (!password || typeof password !== 'string' || password.length < MIN_PASSWORD) {
    return json({ error: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres` }, 400)
  }
  if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
    return json({ error: 'El nombre es requerido' }, 400)
  }
  if (!ROLES_VALIDOS.includes(rol)) {
    return json({ error: 'Rol inválido' }, 400)
  }

  // ── Crear el usuario ──
  // El trigger handle_new_user crea el perfil leyendo user_metadata.
  // debe_cambiar_password fuerza al dueño de la cuenta a elegir su propia
  // contraseña en el primer ingreso — la temporal la conoce quien crea el
  // usuario, así que no puede quedar vigente.
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email:         email.trim().toLowerCase(),
    password,
    email_confirm: true,   // sin verificación por mail: el alta es presencial
    user_metadata: {
      nombre: nombre.trim(),
      rol,
      debe_cambiar_password: true,
    },
  })

  if (createError) {
    const msg = createError.message ?? 'No se pudo crear el usuario'
    // Mensaje amigable para el caso más común
    if (msg.toLowerCase().includes('already')) {
      return json({ error: 'Ya existe un usuario con ese email' }, 409)
    }
    return json({ error: msg }, 400)
  }

  return json({
    success: true,
    user: {
      id:     created.user.id,
      email:  created.user.email,
      nombre: nombre.trim(),
      rol,
    },
  })
})
