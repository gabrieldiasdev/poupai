import { describe, expect, it } from 'vitest'
import { amountToInput, currencySettings, formatMoney, parseAmount, rateFromTransfer, toBase } from './money'

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
    ['US$ 10', 1000],
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
    expect(formatMoney(120000, 'USD')).toBe('US$ 1.200,00')
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

describe('toBase', () => {
  it('keeps the main currency and converts others at the given rate', () => {
    expect(toBase(1000, 'EUR', 'EUR', { BRL: 6 })).toBe(1000)
    expect(toBase(6000, 'BRL', 'EUR', { BRL: 6 })).toBe(1000)
    expect(toBase(1000, 'EUR', 'BRL', { EUR: 0.2 })).toBe(5000)
  })

  it('falls back to a rough default until a real rate is known', () => {
    expect(toBase(6200, 'BRL', 'EUR', {})).toBe(1000)
    expect(toBase(1000, 'EUR', 'BRL', {})).toBe(6200)
  })
})

describe('rateFromTransfer', () => {
  it('learns the rate in terms of the main currency, whichever way the money went', () => {
    expect(rateFromTransfer('EUR', 'BRL', 5000, 32000, 'EUR')).toEqual({ currency: 'BRL', rate: 6.4 })
    expect(rateFromTransfer('BRL', 'EUR', 32000, 5000, 'EUR')).toEqual({ currency: 'BRL', rate: 6.4 })
  })

  it('learns nothing when the main currency is not involved', () => {
    expect(rateFromTransfer('BRL', 'USD', 1000, 200, 'EUR')).toBeNull()
    expect(rateFromTransfer('EUR', 'EUR', 1000, 1000, 'EUR')).toBeNull()
  })
})

describe('currencySettings', () => {
  it('keeps older profiles in euros with their stored rate', () => {
    expect(currencySettings({ onboarded: true, brlPerEur: 6.4 })).toEqual({ baseCurrency: 'EUR', rates: { BRL: 6.4 } })
  })

  it('prefers the newer rates', () => {
    const profile = { onboarded: true, brlPerEur: 6.4, rates: { BRL: 6.1 } }
    expect(currencySettings(profile).rates.BRL).toBe(6.1)
  })
})
