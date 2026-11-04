import { readFileSync } from 'node:fs'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

let env: RulesTestEnvironment

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-poupai',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  })
})

afterAll(() => env.cleanup())
beforeEach(() => env.clearFirestore())

const alice = () => env.authenticatedContext('alice').firestore()
const bob = () => env.authenticatedContext('bob').firestore()

const expense = {
  type: 'expense',
  status: 'confirmed',
  amount: 1250,
  accountId: 'bank',
  categoryId: 'food',
  date: '2026-11-10',
  note: 'Almoço',
  recurrenceId: null,
  toAccountId: null,
  toAmount: null,
  goalId: null,
}

describe('ownership', () => {
  it('lets people read and write only their own data', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'users/alice/transactions/t1'), expense))
    await assertSucceeds(getDoc(doc(alice(), 'users/alice/transactions/t1')))
    await assertFails(getDoc(doc(bob(), 'users/alice/transactions/t1')))
    await assertFails(setDoc(doc(bob(), 'users/alice/transactions/t2'), expense))
  })

  it('keeps signed-out visitors out', async () => {
    const guest = env.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(guest, 'users/alice')))
  })
})

describe('shape checks', () => {
  it('accepts a valid profile and rejects unknown fields', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'users/alice'), { onboarded: true, baseCurrency: 'BRL', rates: { EUR: 0.16 } }))
    await assertFails(setDoc(doc(alice(), 'users/alice'), { onboarded: true, isAdmin: true }))
    await assertFails(setDoc(doc(alice(), 'users/alice'), { onboarded: true, baseCurrency: 'XYZ' }))
  })

  it('rejects amounts that are not positive whole cents', async () => {
    await assertFails(setDoc(doc(alice(), 'users/alice/transactions/t1'), { ...expense, amount: 12.5 }))
    await assertFails(setDoc(doc(alice(), 'users/alice/transactions/t1'), { ...expense, amount: -100 }))
  })

  it('rejects dates that are not YYYY-MM-DD', async () => {
    await assertFails(setDoc(doc(alice(), 'users/alice/transactions/t1'), { ...expense, date: '10/11/2026' }))
  })

  it('requires a destination for transfers and a goal for savings', async () => {
    const transfer = { ...expense, type: 'transfer', categoryId: null }
    await assertFails(setDoc(doc(alice(), 'users/alice/transactions/t1'), transfer))
    await assertSucceeds(
      setDoc(doc(alice(), 'users/alice/transactions/t1'), { ...transfer, toAccountId: 'br', toAmount: 6000 }),
    )
    await assertFails(setDoc(doc(alice(), 'users/alice/transactions/t2'), { ...expense, type: 'saving' }))
  })

  it('checks accounts, recurrences and goals', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'users/alice/accounts/bank'), { name: 'Bankinter', currency: 'EUR' }))
    await assertFails(setDoc(doc(alice(), 'users/alice/accounts/jpy'), { name: 'Ienes', currency: 'JPY' }))

    const recurrence = {
      name: 'Salário',
      type: 'income',
      amount: 120000,
      accountId: 'bank',
      categoryId: 'salary',
      day: 25,
      months: null,
      startMonth: '2026-11',
      active: true,
    }
    await assertSucceeds(setDoc(doc(alice(), 'users/alice/recurrences/salary'), recurrence))
    await assertFails(setDoc(doc(alice(), 'users/alice/recurrences/salary'), { ...recurrence, day: 32 }))

    const goal = { name: 'Fundo de emergência', target: 450000, monthly: 25000, saved: 0 }
    await assertSucceeds(setDoc(doc(alice(), 'users/alice/goals/emergency'), goal))
    await assertFails(setDoc(doc(alice(), 'users/alice/goals/emergency'), { ...goal, target: 0 }))
  })
})
