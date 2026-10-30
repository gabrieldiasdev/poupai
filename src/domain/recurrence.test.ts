import { describe, expect, it } from 'vitest'
import type { Recurrence } from './model'
import { missingOccurrences, occurrenceDate, occursIn } from './recurrence'

const salary: Recurrence = {
  id: 'salary',
  name: 'Salário',
  type: 'income',
  amount: 120_000,
  accountId: 'bank',
  categoryId: 'salary',
  day: 31,
  months: null,
  startMonth: '2026-10',
  active: true,
}

const christmasBonus: Recurrence = { ...salary, id: 'christmas', name: 'Subsídio de Natal', day: 15, months: [11] }

describe('recurrences', () => {
  it('happens every month from its start unless limited to some months', () => {
    expect(occursIn(salary, '2026-09')).toBe(false)
    expect(occursIn(salary, '2026-11')).toBe(true)
    expect(occursIn(christmasBonus, '2026-11')).toBe(true)
    expect(occursIn(christmasBonus, '2026-12')).toBe(false)
    expect(occursIn({ ...salary, active: false }, '2026-11')).toBe(false)
  })

  it('falls back to the last day of shorter months', () => {
    expect(occurrenceDate(salary, '2026-11')).toBe('2026-11-30')
    expect(occurrenceDate(salary, '2027-02')).toBe('2027-02-28')
    expect(occurrenceDate(christmasBonus, '2026-11')).toBe('2026-11-15')
  })

  it('creates only the planned entries the month is missing', () => {
    const missing = missingOccurrences([salary, christmasBonus], '2026-11', new Set(['salary_2026-11']))
    expect(missing).toHaveLength(1)
    expect(missing[0]).toMatchObject({
      id: 'christmas_2026-11',
      status: 'planned',
      type: 'income',
      amount: 120_000,
      date: '2026-11-15',
      recurrenceId: 'christmas',
    })
  })
})
