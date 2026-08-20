// Setup global para todos los tests
// Se ejecuta antes de cada archivo de test

import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Limpiar el DOM después de cada test para evitar interferencia
afterEach(() => {
  cleanup()
})

// Mock básico de import.meta.env para tests
// (Vitest lo carga desde vite.config, pero por si algo lo necesita explícito)
vi.stubGlobal('import.meta.env', {
  DEV: true,
  PROD: false,
  MODE: 'test',
})
