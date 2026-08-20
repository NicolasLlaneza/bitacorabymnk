import { describe, it, expect } from 'vitest'
import { normalizarPatente, detectarTipoPatente, esPatenteValida } from './patente'

describe('normalizarPatente', () => {
  it('convierte a mayúsculas', () => {
    expect(normalizarPatente('ab123cd')).toBe('AB123CD')
  })

  it('elimina espacios', () => {
    expect(normalizarPatente('ab 123 cd')).toBe('AB123CD')
  })

  it('elimina espacios al inicio y al final', () => {
    expect(normalizarPatente('  AB123CD  ')).toBe('AB123CD')
  })

  it('devuelve string vacío si el input no es string', () => {
    expect(normalizarPatente(null)).toBe('')
    expect(normalizarPatente(undefined)).toBe('')
    expect(normalizarPatente(123)).toBe('')
  })
})

describe('detectarTipoPatente', () => {
  it('detecta el formato auto-viejo (ABC123)', () => {
    expect(detectarTipoPatente('ABC123')).toBe('auto-viejo')
    expect(detectarTipoPatente('xyz789')).toBe('auto-viejo')
  })

  it('detecta el formato auto-nuevo Mercosur (AB123CD)', () => {
    expect(detectarTipoPatente('AB123CD')).toBe('auto-nuevo')
    expect(detectarTipoPatente('xy999zz')).toBe('auto-nuevo')
  })

  it('detecta el formato moto-nueva (A123BC)', () => {
    expect(detectarTipoPatente('A123BC')).toBe('moto-nueva')
    expect(detectarTipoPatente('z999xy')).toBe('moto-nueva')
  })

  it('normaliza antes de detectar (maneja mayúsculas/espacios)', () => {
    expect(detectarTipoPatente('ab 123 cd')).toBe('auto-nuevo')
    expect(detectarTipoPatente(' abc 123 ')).toBe('auto-viejo')
  })

  it('devuelve "" para formatos inválidos', () => {
    expect(detectarTipoPatente('AB123')).toBe('')       // corto
    expect(detectarTipoPatente('AB123CDE')).toBe('')    // largo
    expect(detectarTipoPatente('12345A')).toBe('')      // arranca con número
    expect(detectarTipoPatente('AB-123-CD')).toBe('')   // guiones no normalizados
    expect(detectarTipoPatente('')).toBe('')
    expect(detectarTipoPatente(null)).toBe('')
  })
})

describe('esPatenteValida', () => {
  it('true para patentes válidas de los 3 tipos', () => {
    expect(esPatenteValida('ABC123')).toBe(true)
    expect(esPatenteValida('AB123CD')).toBe(true)
    expect(esPatenteValida('A123BC')).toBe(true)
  })

  it('false para inválidas', () => {
    expect(esPatenteValida('')).toBe(false)
    expect(esPatenteValida('AB123')).toBe(false)
    expect(esPatenteValida('123456')).toBe(false)
  })
})
