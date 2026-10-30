/** Money is always stored as integer minor units (cents) together with its currency. */
export type Currency = 'EUR' | 'BRL'

/** Calendar day as `YYYY-MM-DD`, with no time zone, so an entry never jumps to another day. */
export type DateKey = string
/** Calendar month as `YYYY-MM`. */
export type MonthKey = string

export type TransactionType = 'expense' | 'income' | 'transfer' | 'saving'
/** `planned` entries come from recurrences and wait for the user to confirm them; `skipped` keeps a dismissed one from coming back. */
export type TransactionStatus = 'planned' | 'confirmed' | 'skipped'

export interface Account {
  id: string
  name: string
  currency: Currency
}

export type CategoryKind = 'expense' | 'income'

export interface Category {
  id: string
  name: string
  icon: string
  kind: CategoryKind
  order: number
}

export interface Transaction {
  id: string
  type: TransactionType
  status: TransactionStatus
  /** In the currency of `accountId`. */
  amount: number
  accountId: string
  categoryId: string | null
  date: DateKey
  note: string
  recurrenceId: string | null
  /** Transfers only: destination account and the amount that arrived there, in its currency. */
  toAccountId: string | null
  toAmount: number | null
  /** Savings only: the goal the money went to. */
  goalId: string | null
}

export interface Recurrence {
  id: string
  name: string
  type: 'expense' | 'income'
  amount: number
  accountId: string
  categoryId: string | null
  /** Day of the month; months shorter than this use their last day. */
  day: number
  /** Months (1–12) it happens in, e.g. `[7]` for the holiday bonus; null means every month. */
  months: number[] | null
  startMonth: MonthKey
  active: boolean
}

export interface Goal {
  id: string
  name: string
  /** In EUR cents. */
  target: number
  /** How much to set aside each month, in EUR cents. */
  monthly: number
  /** Running total in EUR cents, kept in step with the goal's savings. */
  saved: number
}

export interface Profile {
  onboarded: boolean
  /** How many BRL one euro buys; updated from the user's own transfers. */
  brlPerEur: number
}
