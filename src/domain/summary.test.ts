import { describe, expect, it } from 'vitest'
import type { Account, Goal, Transaction } from './model'
import { plannedThisMonth, summarizeMonth } from './summary'

const accounts: Account[] = [
  { id: 'bank', name: 'Bankinter', currency: 'EUR' },
  { id: 'br', name: 'Conta Brasil', currency: 'BRL' },
]

let sequence = 0
function entry(overrides: Partial<Transaction>): Transaction {
  sequence += 1
  return {
    id: `t${sequence}`,
    type: 'expense',
    status: 'confirmed',
    amount: 0,
    accountId: 'bank',
    categoryId: 'food',
    date: '2026-11-10',
    note: '',
    recurrenceId: null,
    toAccountId: null,
    toAmount: null,
    goalId: null,
    ...overrides,
  }
}

const emergency: Goal = { id: 'emergency', name: 'Fundo de emergência', target: 450_000, monthly: 25_000, saved: 125_000 }

describe('summarizeMonth', () => {
  const transactions = [
    entry({ type: 'income', amount: 145_000, categoryId: 'salary' }),
    entry({ amount: 24_000, categoryId: 'food' }),
    entry({ amount: 18_000, categoryId: 'fun' }),
    entry({ amount: 6_000, accountId: 'br', categoryId: 'subscriptions' }),
    entry({ type: 'transfer', amount: 5_000, toAccountId: 'br', toAmount: 30_000, categoryId: null }),
    entry({ type: 'saving', amount: 10_000, goalId: 'emergency', categoryId: null }),
    entry({ status: 'planned', amount: 3_500, categoryId: 'gym' }),
    entry({ status: 'skipped', amount: 9_999 }),
  ]

  const summary = summarizeMonth(transactions, accounts, [emergency], 6, '2026-11-21')

  it('adds up what came in and went out, converting reais and ignoring transfers', () => {
    expect(summary.income).toBe(145_000)
    expect(summary.expense).toBe(24_000 + 18_000 + 1_000)
    expect(summary.left).toBe(145_000 - 43_000)
    expect(summary.saved).toBe(10_000)
  })

  it('keeps planned bills and the rest of the monthly goal out of what can be spent', () => {
    expect(summary.plannedExpense).toBe(3_500)
    expect(summary.goalReserve).toBe(15_000)
    expect(summary.spendable).toBe(145_000 - 43_000 - 3_500 - 10_000 - 15_000)
    expect(summary.perDay).toBe(Math.floor(summary.spendable / 10))
  })

  it('ranks spending by category', () => {
    expect(summary.byCategory.map((total) => total.categoryId)).toEqual(['food', 'fun', 'subscriptions'])
  })

  it('stops reserving for a goal that is nearly complete', () => {
    const almostThere = { ...emergency, saved: 445_000 }
    expect(summarizeMonth([], accounts, [almostThere], 6, '2026-11-21').goalReserve).toBe(5_000)
    expect(summarizeMonth([], accounts, [{ ...emergency, saved: 450_000 }], 6, '2026-11-21').goalReserve).toBe(0)
  })

  it('does not spread a negative balance over the days left', () => {
    const overspent = summarizeMonth([entry({ amount: 1_000 })], accounts, [], 6, '2026-11-21')
    expect(overspent.spendable).toBe(-1_000)
    expect(overspent.perDay).toBe(0)
  })
})

describe('plannedThisMonth', () => {
  it('lists this month planned entries soonest first', () => {
    const later = entry({ status: 'planned', date: '2026-11-25' })
    const sooner = entry({ status: 'planned', date: '2026-11-02' })
    const nextMonth = entry({ status: 'planned', date: '2026-12-01' })
    const confirmed = entry({ date: '2026-11-03' })
    expect(plannedThisMonth([later, sooner, nextMonth, confirmed], '2026-11-10')).toEqual([sooner, later])
  })
})
