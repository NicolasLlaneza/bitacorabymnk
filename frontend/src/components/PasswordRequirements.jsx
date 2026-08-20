import { Check, Circle } from 'lucide-react'
import { MIN_PASSWORD } from '@/lib/passwordRules'

// Reglas de composición de contraseña. Se usan en el form de "Mi contraseña"
// y en el modal de alta de usuarios para dar feedback en vivo mientras la
// persona tipea, y para bloquear el guardado si alguna no se cumple.
//
// Coinciden con lo que genera generarPassword() en UsuariosPage: mayúsculas
// sin I/O, minúsculas sin l/o, dígitos sin 0/1, símbolos del set !@#$%&*.
// Ese overlap garantiza que la contraseña temporal auto-generada siempre
// cumple todas las reglas de este componente.
export const REGLAS = [
  { id: 'largo',    label: `Al menos ${MIN_PASSWORD} caracteres`, test: p => (p ?? '').length >= MIN_PASSWORD },
  { id: 'mayus',    label: 'Una mayúscula (A-Z)',    test: p => /[A-Z]/.test(p ?? '')    },
  { id: 'minus',    label: 'Una minúscula (a-z)',    test: p => /[a-z]/.test(p ?? '')    },
  { id: 'numero',   label: 'Un número (0-9)',        test: p => /[0-9]/.test(p ?? '')    },
  { id: 'simbolo',  label: 'Un símbolo (!@#$%&*)',   test: p => /[!@#$%&*]/.test(p ?? '') },
]

// Devuelve el primer mensaje de regla incumplida, o null si todas pasan.
// Se usa desde los handleSubmit para mostrar un error específico si la
// persona intenta guardar antes de cumplir todo.
export function primerErrorPassword(password) {
  const rota = REGLAS.find(r => !r.test(password))
  return rota ? rota.label : null
}

export default function PasswordRequirements({ password, className = '' }) {
  return (
    <ul className={`space-y-1 text-xs ${className}`}>
      {REGLAS.map(regla => {
        const ok = regla.test(password)
        return (
          <li key={regla.id} className="flex items-center gap-2">
            {ok
              ? <Check size={13} className="text-green-500 shrink-0" />
              : <Circle size={13} className="text-gray-300 shrink-0" />
            }
            <span className={ok ? 'text-gray-100' : 'text-gray-300'}>
              {regla.label}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
