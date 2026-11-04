import type { Currency, Profile, Rates } from './model'

const LOCALE_BY_CURRENCY: Record<Currency, string> = { BRL: 'pt-BR', EUR: 'pt-PT', USD: 'pt-BR' }

export const CURRENCIES: Currency[] = ['BRL', 'EUR', 'USD']
export const CURRENCY_SYMBOLS: Record<Currency, string> = { BRL: 'R$', EUR: '€', USD: 'US$' }
export const CURRENCY_NAMES: Record<Currency, string> = { BRL: 'Real', EUR: 'Euro', USD: 'Dólar' }

/** Rough rates against the euro, used only until the person's first transfer gives a real one. */
const DEFAULT_PER_EUR: Record<Currency, number> = { BRL: 6.2, EUR: 1, USD: 1.1 }

const formatters = new Map<string, Intl.NumberFormat>()

function formatter(currency: Currency, compact: boolean): Intl.NumberFormat {
  const key = `${currency}:${compact}`
  let cached = formatters.get(key)
  if (!cached) {
    cached = new Intl.NumberFormat(LOCALE_BY_CURRENCY[currency], {
      style: 'currency',
      currency,
      // pt-PT leaves four-digit numbers ungrouped (2650,00 €); always grouping reads better in a finance app.
      useGrouping: 'always',
      minimumFractionDigits: compact ? 0 : 2,
      maximumFractionDigits: compact ? 0 : 2,
    })
    formatters.set(key, cached)
  }
  return cached
}

/** `1250` EUR → `12,50 €`; `4490` BRL → `R$ 44,90`. `compact` drops the cents. */
export function formatMoney(cents: number, currency: Currency, { compact = false } = {}): string {
  return formatter(currency, compact).format(cents / 100).replace(/ /g, ' ')
}

/**
 * Reads what the user typed into a money field: `12`, `12,5`, `12.50`, `1.234,56` or `1 234,56`.
 * Returns cents, or null when it isn't a positive amount.
 */
export function parseAmount(text: string): number | null {
  const cleaned = text.trim().replace(/[\s€R$US]/g, '')
  if (!/^\d[\d.,]*$/.test(cleaned)) return null

  const lastSeparator = Math.max(cleaned.lastIndexOf(','), cleaned.lastIndexOf('.'))
  const decimals = lastSeparator === -1 ? '' : cleaned.slice(lastSeparator + 1)
  // A separator followed by exactly three digits is a thousands separator (1.234), not decimals.
  const hasDecimals = lastSeparator !== -1 && decimals.length <= 2
  const whole = (hasDecimals ? cleaned.slice(0, lastSeparator) : cleaned).replace(/[.,]/g, '')
  const fraction = hasDecimals ? decimals.padEnd(2, '0') : '00'

  const cents = Number(whole || '0') * 100 + Number(fraction)
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null
}

/** Shows cents back in an input field: `1250` → `12,50`. */
export function amountToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',')
}

/** How many units of `currency` one unit of the main currency buys. */
export function rateFor(currency: Currency, base: Currency, rates: Rates): number {
  if (currency === base) return 1
  return rates[currency] ?? DEFAULT_PER_EUR[currency] / DEFAULT_PER_EUR[base]
}

/** Converts an amount to cents of the main currency. */
export function toBase(cents: number, currency: Currency, base: Currency, rates: Rates): number {
  if (currency === base) return cents
  return Math.round(cents / rateFor(currency, base, rates))
}

/** A transfer between the main currency and another one reveals the rate the person really got. */
export function rateFromTransfer(
  from: Currency,
  to: Currency,
  amount: number,
  toAmount: number,
  base: Currency,
): { currency: Currency; rate: number } | null {
  if (from === to) return null
  if (from === base) return { currency: to, rate: toAmount / amount }
  if (to === base) return { currency: from, rate: amount / toAmount }
  return null
}

/** Reads a stored profile's currency settings, including profiles saved before `baseCurrency` and `rates` existed. */
export function currencySettings(profile: Profile | null | undefined): { baseCurrency: Currency; rates: Rates } {
  return {
    baseCurrency: profile?.baseCurrency ?? 'EUR',
    rates: { ...(profile?.brlPerEur ? { BRL: profile.brlPerEur } : {}), ...profile?.rates },
  }
}
