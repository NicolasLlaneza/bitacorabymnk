// Reglas de composición de contraseñas — un solo lugar para todo el frontend.
//
// Si cambiás MIN_PASSWORD acá, actualizá también:
//   - supabase/functions/admin-create-user/index.ts (constante MIN_PASSWORD)
//   - la migración SQL más reciente de cambiar_mi_password (mínimo actual: 018)
//   - la política "Minimum password length" en Supabase Dashboard →
//     Authentication → Providers → Email
// Las cuatro tienen que coincidir; si difieren, hay flujos que rechazan
// contraseñas que otro flujo aceptó.

export const MIN_PASSWORD = 8
