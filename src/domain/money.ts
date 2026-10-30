import type { Currency } from './model'

const LOCALE_BY_CURRENCY: Record<Currency, string> = { EUR: 'pt-PT', BRL: 'pt-BR' }

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
export function formatMoney(cents: number, currency: Currency = 'EUR', { compact = false } = {}): string {
  return formatter(currency, compact).format(cents / 100).replace(/ /g, ' ')
}

/**
 * Reads what the user typed into a money field: `12`, `12,5`, `12.50`, `1.234,56` or `1 234,56`.
 * Returns cents, or null when it isn't a positive amount.
 */
export function parseAmount(text: string): number | null {
  const cleaned = text.trim().replace(/[\s€R$]/g, '')
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

/** Converts an amount to EUR cents using how many BRL one euro buys. */
export function toEur(cents: number, currency: Currency, brlPerEur: number): number {
  if (currency === 'EUR') return cents
  return Math.round(cents / brlPerEur)
}
