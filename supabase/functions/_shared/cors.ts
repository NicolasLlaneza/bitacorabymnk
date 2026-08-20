// ─────────────────────────────────────────────────────────────────────────────
// CORS compartido para todas las Edge Functions
//
// Antes devolvíamos Access-Control-Allow-Origin: * , lo que permitía que
// cualquier sitio invocara nuestras funciones desde el navegador. Ahora
// respondemos solo a los orígenes conocidos.
//
// Se configura con ALLOWED_ORIGINS (separados por coma) para poder sumar
// dominios sin redeployar las funciones. Cada entrada puede ser:
//   - Un origen exacto: https://neumas.pages.dev
//   - Un patrón con wildcard en el subdominio: https://*.neumas.pages.dev
//     (matchea todos los preview deployments de Cloudflare Pages)
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_ORIGINS = [
  'https://neumas.pages.dev',
  'https://*.neumas.pages.dev',       // previews de Cloudflare Pages por rama
  'https://consulta.grupocalper.com', // dominio propio de la consulta pública
  'http://localhost:5173',
].join(',')

const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? DEFAULT_ORIGINS)
  .split(',')
  .map(o => o.trim())
  .filter(Boolean)

// Precomputamos los patrones con wildcard como regex. Convertimos el '*' en
// [^.]+ para que matchee un solo nivel de subdominio (evita que *.foo.com
// coincida con evil.attacker.foo.com.attacker.tld o similares).
const ORIGIN_MATCHERS = ALLOWED_ORIGINS.map(pattern => {
  if (!pattern.includes('*')) return { exact: pattern, regex: null as RegExp | null }
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^.]+')
  return { exact: null as string | null, regex: new RegExp(`^${escaped}$`) }
})

function isOriginAllowed(origin: string): boolean {
  return ORIGIN_MATCHERS.some(m => (m.exact ? m.exact === origin : m.regex!.test(origin)))
}

const BASE_HEADERS = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  // Sin Vary, un caché intermedio podría servir la respuesta de un origen a otro
  'Vary': 'Origin',
}

/**
 * Headers CORS para la request dada. Si el Origin no está en la whitelist
 * devolvemos el primer origen conocido: el navegador bloquea la respuesta,
 * que es exactamente lo que queremos.
 */
export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? ''
  const allowed = isOriginAllowed(origin) ? origin : ALLOWED_ORIGINS[0]
  return { ...BASE_HEADERS, 'Access-Control-Allow-Origin': allowed }
}

/** Respuesta JSON con los headers CORS ya aplicados. */
export function jsonResponse(req: Request, data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(req) },
  })
}

/** Respuesta al preflight OPTIONS. */
export function preflight(req: Request): Response {
  return new Response('ok', { headers: corsHeaders(req) })
}
