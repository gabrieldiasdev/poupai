import { describe, expect, it } from 'vitest'
import { amountToInput, formatMoney, parseAmount, toEur } from './money'

describe('parseAmount', () => {
  it.each([
    ['12', 1200],
    ['12,5', 1250],
    ['12,50', 1250],
    ['12.50', 1250],
    ['0,99', 99],
    ['1.234,56', 123456],
    ['1,234.56', 123456],
    ['1 234,56', 123456],
    ['1.234', 123400],
    ['12 €', 1200],
    ['R$ 44,90', 4490],
  ])('reads %s as %i cents', (text, cents) => {
    expect(parseAmount(text)).toBe(cents)
  })

  it.each(['', 'abc', '0', '0,00', '-5', '12,5a'])('rejects %j', (text) => {
    expect(parseAmount(text)).toBeNull()
  })
})

describe('formatMoney', () => {
  it('formats euros the Portuguese way and reais the Brazilian way', () => {
    expect(formatMoney(1250, 'EUR')).toBe('12,50 €')
    expect(formatMoney(4490, 'BRL')).toBe('R$ 44,90')
  })

  it('drops the cents when compact', () => {
    expect(formatMoney(145_000, 'EUR', { compact: true })).toMatch(/^1\s?450 €$/)
  })

  it('shows negative amounts', () => {
    expect(formatMoney(-500, 'EUR')).toBe('-5,00 €')
  })
})

describe('amountToInput', () => {
  it('round-trips with parseAmount', () => {
    expect(amountToInput(1250)).toBe('12,50')
    expect(parseAmount(amountToInput(123456))).toBe(123456)
  })
})

describe('toEur', () => {
  it('keeps euros and converts reais at the given rate', () => {
    expect(toEur(1000, 'EUR', 6)).toBe(1000)
    expect(toEur(6000, 'BRL', 6)).toBe(1000)
    expect(toEur(4490, 'BRL', 6.2)).toBe(724)
  })
})
