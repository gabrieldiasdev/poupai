import { daysInMonth, monthNumber } from './dates'
import type { DateKey, MonthKey, Recurrence, Transaction } from './model'

/** Each recurrence has at most one entry per month, under a fixed id, so generating twice never duplicates it. */
export function occurrenceId(recurrenceId: string, month: MonthKey): string {
  return `${recurrenceId}_${month}`
}

export function occursIn(recurrence: Recurrence, month: MonthKey): boolean {
  if (!recurrence.active || month < recurrence.startMonth) return false
  return recurrence.months === null || recurrence.months.includes(monthNumber(month))
}

export function occurrenceDate(recurrence: Recurrence, month: MonthKey): DateKey {
  const day = Math.min(recurrence.day, daysInMonth(month))
  return `${month}-${String(day).padStart(2, '0')}`
}

export function plannedOccurrence(recurrence: Recurrence, month: MonthKey): Transaction {
  return {
    id: occurrenceId(recurrence.id, month),
    type: recurrence.type,
    status: 'planned',
    amount: recurrence.amount,
    accountId: recurrence.accountId,
    categoryId: recurrence.categoryId,
    date: occurrenceDate(recurrence, month),
    note: recurrence.name,
    recurrenceId: recurrence.id,
    toAccountId: null,
    toAmount: null,
    goalId: null,
  }
}

/** The planned entries the month still lacks: one per recurrence that occurs in it and has none yet. */
export function missingOccurrences(
  recurrences: Recurrence[],
  month: MonthKey,
  existingIds: ReadonlySet<string>,
): Transaction[] {
  return recurrences
    .filter((recurrence) => occursIn(recurrence, month) && !existingIds.has(occurrenceId(recurrence.id, month)))
    .map((recurrence) => plannedOccurrence(recurrence, month))
}
