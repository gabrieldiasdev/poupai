import { daysLeftInMonth, monthOf } from './dates'
import type { Account, Currency, DateKey, Goal, Rates, Transaction } from './model'
import { toBase } from './money'

export interface CategoryTotal {
  categoryId: string | null
  amount: number
}

/** Every figure is in cents of the person's main currency. */
export interface MonthSummary {
  /** Confirmed income ("entrou"). */
  income: number
  /** Confirmed expenses ("saiu"). */
  expense: number
  /** income − expense ("sobrou"). */
  left: number
  /** Money sent to goals this month. */
  saved: number
  plannedIncome: number
  plannedExpense: number
  /** What is still set aside for this month's goal contributions. */
  goalReserve: number
  /** What can still be spent this month without touching planned bills or goal contributions. */
  spendable: number
  /** `spendable` spread over the days left, today included; 0 when nothing is left. */
  perDay: number
  /** Confirmed expenses per category, largest first. */
  byCategory: CategoryTotal[]
}

export function summarizeMonth(
  transactions: Transaction[],
  accounts: Account[],
  goals: Goal[],
  baseCurrency: Currency,
  rates: Rates,
  today: DateKey,
): MonthSummary {
  const currencyOf = new Map<string, Currency>(accounts.map((account) => [account.id, account.currency]))
  const inBase = (transaction: Transaction) =>
    toBase(transaction.amount, currencyOf.get(transaction.accountId) ?? baseCurrency, baseCurrency, rates)

  let income = 0
  let expense = 0
  let saved = 0
  let plannedIncome = 0
  let plannedExpense = 0
  const savedByGoal = new Map<string, number>()
  const byCategory = new Map<string | null, number>()

  for (const transaction of transactions) {
    const amount = inBase(transaction)
    const confirmed = transaction.status === 'confirmed'
    const planned = transaction.status === 'planned'

    if (transaction.type === 'income') {
      if (confirmed) income += amount
      if (planned) plannedIncome += amount
    } else if (transaction.type === 'expense') {
      if (confirmed) {
        expense += amount
        byCategory.set(transaction.categoryId, (byCategory.get(transaction.categoryId) ?? 0) + amount)
      }
      if (planned) plannedExpense += amount
    } else if (transaction.type === 'saving' && confirmed) {
      saved += amount
      if (transaction.goalId) savedByGoal.set(transaction.goalId, (savedByGoal.get(transaction.goalId) ?? 0) + amount)
    }
  }

  const goalReserve = goals
    .filter((goal) => goal.saved < goal.target)
    .reduce((total, goal) => {
      const stillDue = Math.min(goal.monthly - (savedByGoal.get(goal.id) ?? 0), goal.target - goal.saved)
      return total + Math.max(0, stillDue)
    }, 0)

  const spendable = income + plannedIncome - expense - plannedExpense - saved - goalReserve
  const perDay = spendable > 0 ? Math.floor(spendable / daysLeftInMonth(today)) : 0

  return {
    income,
    expense,
    left: income - expense,
    saved,
    plannedIncome,
    plannedExpense,
    goalReserve,
    spendable,
    perDay,
    byCategory: [...byCategory]
      .map(([categoryId, amount]) => ({ categoryId, amount }))
      .sort((a, b) => b.amount - a.amount),
  }
}

/** This month's planned entries, soonest first: the ones the home screen asks the user to confirm. */
export function plannedThisMonth(transactions: Transaction[], today: DateKey): Transaction[] {
  return transactions
    .filter((transaction) => transaction.status === 'planned' && monthOf(transaction.date) === monthOf(today))
    .sort((a, b) => a.date.localeCompare(b.date))
}
