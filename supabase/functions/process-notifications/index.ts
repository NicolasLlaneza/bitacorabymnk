// ─────────────────────────────────────────────────────────────────────────────
// process-notifications
// Busca todas las notificaciones pendientes cuya fecha/hora de envío ya pasó
// y dispara send-notification para cada una.
//
// Se ejecuta cada 5 minutos vía cron de Supabase.
// Configurar en: Dashboard → Edge Functions → process-notifications → Schedule
// Expresión cron: */5 * * * *
//
// Variables de entorno requeridas:
//   INTERNAL_SECRET  — Secret compartido con send-notification
// ─────────────────────────────────────────────────────────────────────────────

import { serve }        from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const INTERNAL_SECRET = Deno.env.get('INTERNAL_SECRET')!
const SUPABASE_URL    = Deno.env.get('SUPABASE_URL')!

serve(async () => {
  const supabase = createClient(
    SUPABASE_URL,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Buscar notificaciones pendientes cuya fecha+hora de envío ya llegó,
  // filtrando solo clientes que aceptaron recibir WhatsApp (Ley 25.326).
  // Considera zona horaria Argentina (UTC-3).
  const { data: pendientes, error } = await supabase
    .from('notificaciones')
    .select('id, clientes!inner(acepta_whatsapp)')
    .eq('estado', 'pendiente')
    .eq('clientes.acepta_whatsapp', true)
    .or(
      // Fecha anterior a hoy → enviar sin importar la hora
      `fecha_envio.lt.${today()},` +
      // Fecha de hoy → enviar solo si la hora ya pasó
      `and(fecha_envio.eq.${today()},hora_envio.lte.${currentTime()})`
    )

  if (error) {
    console.error('Error buscando notificaciones pendientes:', error)
    return json({ error: error.message }, 500)
  }

  if (!pendientes || pendientes.length === 0) {
    return json({ procesadas: 0 })
  }

  // Disparar send-notification para cada una en paralelo
  const resultados = await Promise.allSettled(
    pendientes.map(({ id }) =>
      fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
        method:  'POST',
        headers: {
          'Content-Type':      'application/json',
          'x-internal-secret': INTERNAL_SECRET,
        },
        body: JSON.stringify({ notificacion_id: id }),
      })
    )
  )

  const exitosas = resultados.filter(r => r.status === 'fulfilled').length
  const fallidas = resultados.filter(r => r.status === 'rejected').length

  return json({ procesadas: pendientes.length, exitosas, fallidas })
})

// Fecha de hoy en formato YYYY-MM-DD (hora Argentina UTC-3)
function today(): string {
  const now = new Date()
  now.setHours(now.getHours() - 3)
  return now.toISOString().split('T')[0]
}

// Hora actual en formato HH:MM (hora Argentina UTC-3)
function currentTime(): string {
  const now = new Date()
  now.setHours(now.getHours() - 3)
  return now.toTimeString().slice(0, 5)
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
