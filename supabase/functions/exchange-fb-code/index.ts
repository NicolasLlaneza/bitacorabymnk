// ─────────────────────────────────────────────────────────────────────────────
// exchange-fb-code
// Intercambia el "code" devuelto por Facebook Embedded Signup por un
// user access token de larga duración (60 días).
//
// Este endpoint se llama desde el frontend después de que el admin del taller
// completa el flujo de conexión de WhatsApp Business.
//
// NOTA: aunque técnicamente enviamos mensajes con el token del System User
// (neumasbot, permanente), el intercambio del code es parte estándar del
// protocolo de Embedded Signup y confirma que el flujo se completó correctamente.
//
// Body esperado: { code: string }
// Auth: Authorization Bearer <JWT del admin activo>
//
// Variables de entorno requeridas:
//   FB_APP_ID       — ID de la App de Meta
//   FB_APP_SECRET   — App Secret de Meta (NUNCA exponer al frontend)
// ─────────────────────────────────────────────────────────────────────────────

import { serve }        from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { jsonResponse, preflight } from '../_shared/cors.ts'

const FB_APP_ID     = Deno.env.get('FB_APP_ID')!
const FB_APP_SECRET = Deno.env.get('FB_APP_SECRET')!

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return preflight(req)

  const json = (data: unknown, status = 200) => jsonResponse(req, data, status)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Auth: solo admins activos
  const authHeader = req.headers.get('Authorization') ?? ''
  const jwt = authHeader.replace('Bearer ', '')
  const { data: { user } } = await supabase.auth.getUser(jwt)
  if (!user) return json({ error: 'No autorizado' }, 401)

  const { data: profile } = await supabase
    .from('profiles')
    .select('activo')
    .eq('id', user.id)
    .single()

  if (!profile?.activo) return json({ error: 'Solo admins activos' }, 403)

  // Body
  const { code } = await req.json()
  if (!code) return json({ error: 'code requerido' }, 400)

  if (!FB_APP_ID || !FB_APP_SECRET) {
    return json({ error: 'FB_APP_ID o FB_APP_SECRET no configurados en secrets' }, 500)
  }

  // Intercambio del code por user access token
  const params = new URLSearchParams({
    client_id:     FB_APP_ID,
    client_secret: FB_APP_SECRET,
    code,
  })

  const url = `https://graph.facebook.com/v19.0/oauth/access_token?${params.toString()}`

  try {
    const response = await fetch(url, { method: 'GET' })
    const result   = await response.json()

    if (!response.ok || result.error) {
      const message = result.error?.message ?? JSON.stringify(result)
      return json({ error: `Meta rechazó el intercambio: ${message}` }, 400)
    }

    return json({
      success:      true,
      access_token: result.access_token,
      token_type:   result.token_type,
      expires_in:   result.expires_in,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return json({ error: `Error de red al llamar a Meta: ${message}` }, 500)
  }
})
