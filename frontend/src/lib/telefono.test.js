import { describe, it, expect } from 'vitest'
import {
  normalizarTelefono,
  esTelefonoArgentinoValido,
  formatearTelefonoDisplay,
} from './telefono'

describe('normalizarTelefono', () => {
  it('elimina el signo + y espacios', () => {
    expect(normalizarTelefono('+54 9 261 234 5678')).toBe('5492612345678')
  })

  it('elimina guiones y paréntesis', () => {
    expect(normalizarTelefono('(261) 234-5678')).toBe('2612345678')
  })

  it('deja solo dígitos si vienen mezclados', () => {
    expect(normalizarTelefono('+54-9-261-2345678')).toBe('5492612345678')
  })

  it('devuelve string vacío si el input no es string', () => {
    expect(normalizarTelefono(null)).toBe('')
    expect(normalizarTelefono(undefined)).toBe('')
    expect(normalizarTelefono(42)).toBe('')
  })
})

describe('esTelefonoArgentinoValido', () => {
  it('true para móviles argentinos válidos (con código 54)', () => {
    expect(esTelefonoArgentinoValido('+54 9 261 234 5678')).toBe(true)
    expect(esTelefonoArgentinoValido('5492612345678')).toBe(true)
  })

  it('false para números sin código de país', () => {
    expect(esTelefonoArgentinoValido('2612345678')).toBe(false)
  })

  it('false para números demasiado cortos', () => {
    expect(esTelefonoArgentinoValido('+54 999')).toBe(false)
  })

  it('false para números demasiado largos', () => {
    expect(esTelefonoArgentinoValido('549261234567899999')).toBe(false)
  })
})

describe('formatearTelefonoDisplay', () => {
  it('formatea un móvil argentino (+54 9 ...)', () => {
    expect(formatearTelefonoDisplay('5492612345678'))
      .toBe('+54 9 261 234 5678')
  })

  it('formatea un fijo argentino (+54 sin 9)', () => {
    expect(formatearTelefonoDisplay('542612345678'))
      .toBe('+54 261 2345-678')
  })

  it('devuelve el original si el formato es irreconocible', () => {
    expect(formatearTelefonoDisplay('123')).toBe('123')
    expect(formatearTelefonoDisplay('abc')).toBe('abc')
  })
})
