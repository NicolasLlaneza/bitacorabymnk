import { createClient } from '@supabase/supabase-js'
import { DEMO } from './demo'
import { crearClienteDemo } from '@/demo/mockSupabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// En modo demo (lib/demo.js) la app no toca Supabase: usa un cliente
// falso con datos ficticios en el navegador.
export const supabase = DEMO
  ? crearClienteDemo()
  : createClient(supabaseUrl, supabaseAnonKey)
