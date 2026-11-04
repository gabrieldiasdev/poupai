import type { Setup } from '@/data/repository'
import type { Currency, MonthKey, Recurrence } from '@/domain/model'
import { DEFAULT_CATEGORIES } from './defaults'

const EURO_REGIONS = new Set([
  'AT', 'BE', 'BG', 'CY', 'DE', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PT', 'SI', 'SK',
])

/** Suggests a main currency from the device's language, e.g. `pt-BR` → BRL. People can always pick another. */
export function suggestCurrency(locale: string): Currency {
  const region = locale.includes('-') ? (locale.split('-').at(-1)?.toUpperCase() ?? '') : ''
  if (region === 'BR') return 'BRL'
  if (EURO_REGIONS.has(region)) return 'EUR'
  if (region === 'US') return 'USD'
  return locale.toLowerCase().startsWith('pt') ? 'BRL' : 'USD'
}

/** The usual payday where each currency is used, as a starting point. */
export const DEFAULT_PAYDAY: Record<Currency, number> = { BRL: 5, EUR: 25, USD: 15 }

export interface ExtraPreset {
  id: string
  title: string
  /** Each part becomes its own yearly entry; `share` of the monthly income suggests its value, null when it can't be guessed. */
  parts: { name: string; month: number; share: number | null }[]
}

const EXTRA_PRESETS: Record<Currency, ExtraPreset[]> = {
  BRL: [
    {
      id: 'thirteenth',
      title: '13º salário',
      parts: [
        { name: '13º salário (1ª parcela)', month: 11, share: 0.5 },
        { name: '13º salário (2ª parcela)', month: 12, share: 0.5 },
      ],
    },
    { id: 'vacation', title: 'Férias', parts: [{ name: 'Férias', month: 1, share: 4 / 3 }] },
    { id: 'bonus', title: 'Bônus ou PLR', parts: [{ name: 'Bônus ou PLR', month: 3, share: null }] },
  ],
  EUR: [
    { id: 'holiday', title: 'Subsídio de férias', parts: [{ name: 'Subsídio de férias', month: 6, share: 1 }] },
    { id: 'christmas', title: 'Subsídio de Natal', parts: [{ name: 'Subsídio de Natal', month: 11, share: 1 }] },
    { id: 'bonus', title: 'Prémio ou bónus', parts: [{ name: 'Prémio ou bónus', month: 3, share: null }] },
  ],
  USD: [{ id: 'bonus', title: 'Bônus', parts: [{ name: 'Bônus', month: 12, share: null }] }],
}

export function extraPresets(currency: Currency): ExtraPreset[] {
  return EXTRA_PRESETS[currency]
}

export interface FixedPreset {
  name: string
  categoryId: string
  day: number
}

/** The same bills in the words each place uses for them: "aluguel" in Brazil, "renda" in Portugal. */
const BILLS = {
  BRL: { rent: 'Aluguel', phone: 'Celular', gym: 'Academia' },
  EUR: { rent: 'Renda', phone: 'Telemóvel', gym: 'Ginásio' },
  USD: { rent: 'Aluguel', phone: 'Celular', gym: 'Academia' },
}

export function fixedPresets(currency: Currency): FixedPreset[] {
  const words = BILLS[currency]
  return [
    { name: words.rent, categoryId: 'home', day: 5 },
    { name: 'Internet', categoryId: 'home', day: 10 },
    { name: words.phone, categoryId: 'home', day: 10 },
    { name: 'Luz', categoryId: 'home', day: 15 },
    { name: words.gym, categoryId: 'health', day: 1 },
    { name: 'Streaming', categoryId: 'subscriptions', day: 1 },
  ]
}

export interface OnboardingAnswers {
  currency: Currency
  /** Monthly income in cents; null when skipped. */
  income: number | null
  payday: number
  extras: { name: string; month: number; amount: number }[]
  fixed: { name: string; categoryId: string; amount: number; day: number }[]
}

/** What's left of the monthly income after the fixed bills; null when the income is unknown. */
export function leftAfterBills(income: number | null, bills: number[]): number | null {
  if (income === null) return null
  return bills.reduce((left, bill) => left - bill, income)
}

/** Turns the answers into the accounts, categories and recurrences the app starts with. */
export function buildSetup(answers: OnboardingAnswers, month: MonthKey, newId: (kind: 'accounts' | 'recurrences') => string): Setup {
  const accountId = newId('accounts')
  const base = { accountId, startMonth: month, active: true }
  const recurrences: Recurrence[] = []

  if (answers.income !== null) {
    recurrences.push({
      ...base,
      id: newId('recurrences'),
      name: 'Salário',
      type: 'income',
      amount: answers.income,
      categoryId: 'salary',
      day: answers.payday,
      months: null,
    })
  }
  for (const extra of answers.extras) {
    recurrences.push({
      ...base,
      id: newId('recurrences'),
      name: extra.name,
      type: 'income',
      amount: extra.amount,
      categoryId: 'bonus',
      day: answers.payday,
      months: [extra.month],
    })
  }
  for (const bill of answers.fixed) {
    recurrences.push({
      ...base,
      id: newId('recurrences'),
      name: bill.name,
      type: 'expense',
      amount: bill.amount,
      categoryId: bill.categoryId,
      day: bill.day,
      months: null,
    })
  }

  return {
    accounts: [{ id: accountId, name: 'Conta principal', currency: answers.currency }],
    categories: DEFAULT_CATEGORIES,
    recurrences,
    goals: [],
    baseCurrency: answers.currency,
  }
}
