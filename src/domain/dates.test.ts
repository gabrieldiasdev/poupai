import { describe, expect, it } from 'vitest'
import { addMonths, daysInMonth, daysLeftInMonth, formatDay, formatMonth, monthRange, todayKey } from './dates'

describe('dates', () => {
  it('builds the local day key', () => {
    expect(todayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })

  it('knows month lengths, leap years included', () => {
    expect(daysInMonth('2026-02')).toBe(28)
    expect(daysInMonth('2028-02')).toBe(29)
    expect(monthRange('2026-11')).toEqual({ start: '2026-11-01', end: '2026-11-30' })
  })

  it('adds months across years', () => {
    expect(addMonths('2026-11', 2)).toBe('2027-01')
    expect(addMonths('2026-01', -1)).toBe('2025-12')
  })

  it('counts the days left with today included', () => {
    expect(daysLeftInMonth('2026-11-30')).toBe(1)
    expect(daysLeftInMonth('2026-11-01')).toBe(30)
  })

  it('names months and days', () => {
    expect(formatMonth('2026-11', '2026-10-30')).toBe('novembro')
    expect(formatMonth('2025-12', '2026-10-30')).toBe('dezembro de 2025')
    expect(formatDay('2026-10-30', '2026-10-30')).toBe('Hoje')
    expect(formatDay('2026-10-29', '2026-10-30')).toBe('Ontem')
    expect(formatDay('2026-10-02', '2026-10-30')).toBe('2 de outubro')
  })
})
