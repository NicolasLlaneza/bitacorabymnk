import { describe, it, expect } from 'vitest'
import { formatFechaAR, fechaHoyAR, formatFechaHoraAR } from './fecha'

describe('formatFechaAR', () => {
  it('convierte YYYY-MM-DD a DD/MM/YYYY', () => {
    expect(formatFechaAR('2026-07-13')).toBe('13/07/2026')
    expect(formatFechaAR('2020-01-05')).toBe('05/01/2020')
  })

  it('devuelve el original si no tiene guiones', () => {
    expect(formatFechaAR('sin fecha')).toBe('sin fecha')
    expect(formatFechaAR('')).toBe('')
  })

  it('devuelve el input si no es string', () => {
    expect(formatFechaAR(null)).toBe(null)
    expect(formatFechaAR(undefined)).toBe(undefined)
  })
})

describe('fechaHoyAR', () => {
  it('devuelve un string en formato YYYY-MM-DD', () => {
    const hoy = fechaHoyAR()
    expect(hoy).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('la fecha corresponde a hoy en Argentina (dentro de 1 día de margen)', () => {
    const hoy = fechaHoyAR()
    const parsed = new Date(hoy + 'T00:00:00-03:00')
    const now = new Date()
    const diff = Math.abs(now.getTime() - parsed.getTime())
    // Máx 26 horas de diferencia (para cubrir el edge del cambio de día)
    expect(diff).toBeLessThan(26 * 60 * 60 * 1000)
  })
})

describe('formatFechaHoraAR', () => {
  it('formatea un ISO timestamp con día/mes/año hora:min', () => {
    const result = formatFechaHoraAR('2026-07-13T18:30:00Z')
    // Depende del timezone del runtime, verificamos el formato general
    expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4},?\s\d{2}:\d{2}$/)
  })

  it('devuelve string vacío para valores nulos', () => {
    expect(formatFechaHoraAR(null)).toBe('')
    expect(formatFechaHoraAR('')).toBe('')
    expect(formatFechaHoraAR(undefined)).toBe('')
  })

  it('devuelve string vacío para fechas inválidas', () => {
    expect(formatFechaHoraAR('no-es-fecha')).toBe('')
  })
})
