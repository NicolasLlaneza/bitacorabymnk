-- ════════════════════════════════════════════════════════════════════
-- Bloquear acceso público directo a consulta_publica RPC
-- ════════════════════════════════════════════════════════════════════
-- La consulta pública ahora pasa por la Edge Function consulta-publica
-- que verifica el CAPTCHA de Turnstile server-side antes de invocar
-- esta función.
--
-- Revocamos el EXECUTE del rol 'anon' y 'authenticated' para que nadie
-- pueda saltearse la Edge Function llamando al RPC directo con la
-- anon key (que es pública).
--
-- La Edge Function usa SUPABASE_SERVICE_ROLE_KEY (bypasea RLS y
-- permisos), así que sigue funcionando sin cambios.
-- ════════════════════════════════════════════════════════════════════

revoke execute on function public.consulta_publica(text) from anon;
revoke execute on function public.consulta_publica(text) from authenticated;

-- El service_role (usado por la Edge Function) mantiene el permiso implícitamente
-- porque bypasa restricciones. No hace falta grant explícito.
