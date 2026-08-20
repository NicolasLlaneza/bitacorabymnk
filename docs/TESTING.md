# Testing — Guía práctica

## Stack

- **Vitest** — test runner (integrado con Vite, config cero)
- **React Testing Library** — para tests de componentes
- **jsdom** — DOM virtual en Node para tests que necesitan `document`, `window`, etc.
- **@testing-library/user-event** — simula interacciones de usuario real (clicks, teclado)

## Comandos

```bash
cd frontend

# Modo watch (durante desarrollo — re-corre tests al guardar)
npm test

# Correr una vez (para CI)
npm run test:run

# Interfaz web con dashboard visual
npm run test:ui

# Con coverage
npm run test:coverage
```

## Estructura

```
frontend/src/
├── lib/
│   ├── patente.js
│   ├── patente.test.js       ← test JUNTO al código
│   ├── telefono.js
│   ├── telefono.test.js
│   ├── fecha.js
│   └── fecha.test.js
├── pages/
│   └── clientes/
│       ├── ClientesPage.jsx
│       └── ClientesPage.test.jsx
└── test/
    └── setup.js              ← config global, mocks
```

**Convención**: los tests van en el mismo directorio del archivo que testean, con el sufijo `.test.js` o `.test.jsx`.

## Cómo escribir un test unitario (utilidades puras)

Ejemplo `src/lib/patente.test.js`:

```javascript
import { describe, it, expect } from 'vitest'
import { detectarTipoPatente } from './patente'

describe('detectarTipoPatente', () => {
  it('detecta el formato Mercosur (AB123CD)', () => {
    expect(detectarTipoPatente('AB123CD')).toBe('auto-nuevo')
  })

  it('devuelve "" para formatos inválidos', () => {
    expect(detectarTipoPatente('123456')).toBe('')
    expect(detectarTipoPatente('')).toBe('')
    expect(detectarTipoPatente(null)).toBe('')
  })
})
```

**Reglas de oro:**
- Un `describe` por función/módulo
- Un `it` por comportamiento específico (no por método)
- Casos que testear: happy path + edge cases + errores
- Los tests deben leerse como especificación

## Cómo escribir un test de componente

Ejemplo `src/components/Button.test.jsx`:

```javascript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Button from './Button'

describe('Button', () => {
  it('muestra el texto del children', () => {
    render(<Button>Guardar</Button>)
    expect(screen.getByRole('button', { name: /guardar/i })).toBeInTheDocument()
  })

  it('dispara onClick al hacer click', async () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>OK</Button>)

    await userEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('se muestra deshabilitado con loading=true', () => {
    render(<Button loading>OK</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
```

## Cómo escribir un test de integración (con Supabase)

Para tests que llaman a Supabase, mockear el cliente:

```javascript
import { vi } from 'vitest'

// Mock del módulo de supabase antes de importar el componente
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({
        data: [{ id: '1', nombre: 'Juan' }],
        error: null,
      }),
    })),
  },
}))
```

## Prioridades de qué testear (en tu proyecto)

### ✅ Ya cubierto (30 tests)
- `src/lib/patente.js` — detección de tipo, normalización, validación
- `src/lib/telefono.js` — normalización, validación, formateo
- `src/lib/fecha.js` — formateo AR, fecha de hoy, timestamp

### 🎯 Próximo a agregar (recomendado)

**Componentes atómicos** (fáciles y valiosos):
- `Button` — variantes, loading, disabled, onClick
- `Input` — cambios, error visible, placeholder
- `Modal` — cierra con ESC, con click fuera
- `SearchSelect` — filtra, selecciona, teclado

**Utilidades faltantes**:
- Función que arma el mensaje inicial de notificación con nombre del cliente
- Cálculo de kilometraje próximo para recordatorios

**Flujos críticos (integration)**:
- Crear cliente → aparece en tabla
- Editar cliente → refleja cambios
- Dar de baja → soft delete + filtro
- Enviar notificación → cambia estado

### 🔲 Para más adelante (E2E con Playwright)
- Login → CRUD completo → notificación enviada
- Consulta pública: patente → confirmar → historial

## Meta realista

- **Utilidades puras**: 80-90% cobertura (rápido y de alto valor)
- **Componentes**: 50-60% (los críticos)
- **Total del proyecto**: 40-50% ← número muy respetable

No apuntes a 100%. Es agobiante y los tests muy detallados suelen romper con cada refactor.

## CI/CD

`.github/workflows/test.yml` corre los tests + build en cada push a `master`.

Si algún test falla, GitHub marca el commit con ❌ y (opcionalmente) puede bloquear el merge.

## Debug de tests

```bash
# Correr solo un archivo
npm test -- patente.test.js

# Correr solo un test específico
npm test -- --grep "detectarTipo"

# Ver output detallado
npm test -- --reporter=verbose
```

En la UI web (`npm run test:ui`) también podés ver el árbol, filtrar, y ver cobertura visual archivo por archivo.
