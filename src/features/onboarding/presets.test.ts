import { describe, expect, it } from 'vitest'
import { buildSetup, extraPresets, fixedPresets, leftAfterBills, suggestCurrency } from './presets'

describe('suggestCurrency', () => {
  it.each([
    ['pt-BR', 'BRL'],
    ['pt-PT', 'EUR'],
    ['de-DE', 'EUR'],
    ['en-US', 'USD'],
    ['pt', 'BRL'],
    ['en-GB', 'USD'],
  ])('suggests for %s: %s', (locale, currency) => {
    expect(suggestCurrency(locale)).toBe(currency)
  })
})

describe('presets', () => {
  it('offers the extras people actually receive with each currency', () => {
    expect(extraPresets('BRL').map((extra) => extra.title)).toContain('13º salário')
    expect(extraPresets('EUR').map((extra) => extra.title)).toContain('Subsídio de Natal')
    expect(extraPresets('USD').map((extra) => extra.title)).not.toContain('13º salário')
  })

  it('splits the 13th salary into two payments that add up to one month', () => {
    const parts = extraPresets('BRL').find((extra) => extra.id === 'thirteenth')!.parts
    expect(parts.map((part) => part.month)).toEqual([11, 12])
    expect(parts.reduce((total, part) => total + (part.share ?? 0), 0)).toBe(1)
  })

  it('uses local words for the same bills', () => {
    expect(fixedPresets('BRL').map((bill) => bill.name)).toContain('Aluguel')
    expect(fixedPresets('EUR').map((bill) => bill.name)).toContain('Renda')
  })
})

describe('leftAfterBills', () => {
  it('subtracts the bills from the income', () => {
    expect(leftAfterBills(350_000, [120_000, 10_000])).toBe(220_000)
  })

  it('is unknown when the income was skipped', () => {
    expect(leftAfterBills(null, [120_000])).toBeNull()
  })
})

describe('buildSetup', () => {
  let sequence = 0
  const newId = () => `id${++sequence}`

  it('needs nothing but the currency', () => {
    const setup = buildSetup({ currency: 'BRL', income: null, payday: 5, extras: [], fixed: [] }, '2026-11', newId)
    expect(setup.baseCurrency).toBe('BRL')
    expect(setup.accounts).toHaveLength(1)
    expect(setup.accounts[0].currency).toBe('BRL')
    expect(setup.recurrences).toEqual([])
    expect(setup.categories.length).toBeGreaterThan(0)
  })

  it('turns income, extras and bills into recurrences on the main account', () => {
    const setup = buildSetup(
      {
        currency: 'BRL',
        income: 350_000,
        payday: 5,
        extras: [{ name: '13º salário (1ª parcela)', month: 11, amount: 175_000 }],
        fixed: [{ name: 'Aluguel', categoryId: 'home', amount: 120_000, day: 10 }],
      },
      '2026-11',
      newId,
    )
    const accountId = setup.accounts[0].id
    expect(setup.recurrences).toMatchObject([
      { name: 'Salário', type: 'income', amount: 350_000, day: 5, months: null, accountId, startMonth: '2026-11' },
      { name: '13º salário (1ª parcela)', type: 'income', amount: 175_000, day: 5, months: [11], categoryId: 'bonus' },
      { name: 'Aluguel', type: 'expense', amount: 120_000, day: 10, months: null, categoryId: 'home' },
    ])
  })
})
