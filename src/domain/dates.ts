import type { DateKey, MonthKey } from './model'

const pad = (value: number) => String(value).padStart(2, '0')

/** Today's date on this device, as `YYYY-MM-DD`. */
export function todayKey(now = new Date()): DateKey {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export function monthOf(date: DateKey): MonthKey {
  return date.slice(0, 7)
}

export function daysInMonth(month: MonthKey): number {
  const [year, monthNumber] = month.split('-').map(Number)
  return new Date(year, monthNumber, 0).getDate()
}

export function monthRange(month: MonthKey): { start: DateKey; end: DateKey } {
  return { start: `${month}-01`, end: `${month}-${pad(daysInMonth(month))}` }
}

export function addMonths(month: MonthKey, count: number): MonthKey {
  const [year, monthNumber] = month.split('-').map(Number)
  const index = year * 12 + (monthNumber - 1) + count
  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}`
}

export function monthNumber(month: MonthKey): number {
  return Number(month.slice(5, 7))
}

/** Days from `today` to the end of its month, today included. */
export function daysLeftInMonth(today: DateKey): number {
  return daysInMonth(monthOf(today)) - Number(today.slice(8, 10)) + 1
}

/** Whole days between two dates (`to` − `from`). */
export function daysBetween(from: DateKey, to: DateKey): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000)
}

export const MONTH_NAMES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]

/** `2026-11` → `novembro`, or `novembro de 2025` outside the current year. */
export function formatMonth(month: MonthKey, today: DateKey = todayKey()): string {
  const name = MONTH_NAMES[monthNumber(month) - 1]
  return month.slice(0, 4) === today.slice(0, 4) ? name : `${name} de ${month.slice(0, 4)}`
}

/** `Hoje`, `Ontem`, or `25 de novembro`. */
export function formatDay(date: DateKey, today: DateKey = todayKey()): string {
  const diff = daysBetween(date, today)
  if (diff === 0) return 'Hoje'
  if (diff === 1) return 'Ontem'
  if (diff === -1) return 'Amanhã'
  return `${Number(date.slice(8, 10))} de ${MONTH_NAMES[monthNumber(monthOf(date)) - 1]}`
}
