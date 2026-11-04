import {
  collection,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type QuerySnapshot,
} from 'firebase/firestore'
import { monthRange } from '@/domain/dates'
import type {
  Account,
  Category,
  Currency,
  Goal,
  MonthKey,
  Profile,
  Rates,
  Recurrence,
  Transaction,
} from '@/domain/model'
import { rateFromTransfer, toBase } from '@/domain/money'
import { occurrenceId, occursIn, plannedOccurrence } from '@/domain/recurrence'
import { db } from '@/lib/firebase'
import type { Subscribe } from '@/lib/useSubscription'

/* Everything a person owns lives under users/{uid}; the security rules let only that person in. */

type Kind = 'accounts' | 'categories' | 'transactions' | 'recurrences' | 'goals'

const userDoc = (uid: string) => doc(db, 'users', uid)
const col = (uid: string, kind: Kind) => collection(db, 'users', uid, kind)
const docIn = (uid: string, kind: Kind, id: string) => doc(db, 'users', uid, kind, id)

export const newId = (uid: string, kind: Kind) => doc(col(uid, kind)).id

function withIds<T>(snapshot: QuerySnapshot<DocumentData>): T[] {
  return snapshot.docs.map((d) => ({ ...d.data(), id: d.id }) as T)
}

function withoutId<T extends { id: string }>(value: T): Omit<T, 'id'> {
  const { id: _id, ...rest } = value
  return rest
}

// ---- Subscriptions ----

export function subscribeProfile(uid: string): Subscribe<Profile | null> {
  return (onData, onError) =>
    onSnapshot(userDoc(uid), (snapshot) => onData(snapshot.exists() ? (snapshot.data() as Profile) : null), onError)
}

function subscribeAll<T>(uid: string, kind: Kind, sortField?: string): Subscribe<T[]> {
  const source = sortField ? query(col(uid, kind), orderBy(sortField)) : col(uid, kind)
  return (onData, onError) => onSnapshot(source, (snapshot) => onData(withIds<T>(snapshot)), onError)
}

export const subscribeAccounts = (uid: string) => subscribeAll<Account>(uid, 'accounts', 'name')
export const subscribeCategories = (uid: string) => subscribeAll<Category>(uid, 'categories', 'order')
export const subscribeRecurrences = (uid: string) => subscribeAll<Recurrence>(uid, 'recurrences', 'day')
export const subscribeGoals = (uid: string) => subscribeAll<Goal>(uid, 'goals', 'name')

export function subscribeMonthTransactions(uid: string, month: MonthKey): Subscribe<Transaction[]> {
  const { start, end } = monthRange(month)
  const monthQuery = query(
    col(uid, 'transactions'),
    where('date', '>=', start),
    where('date', '<=', end),
    orderBy('date', 'desc'),
  )
  return (onData, onError) => onSnapshot(monthQuery, (snapshot) => onData(withIds<Transaction>(snapshot)), onError)
}

// ---- Transactions ----

export interface WriteContext {
  uid: string
  currencyOf: (accountId: string) => Currency
  baseCurrency: Currency
  rates: Rates
}

/** What a saving adds to its goal, in the main currency (goals are kept in it). */
function goalDelta(transaction: Transaction, { currencyOf, baseCurrency, rates }: WriteContext) {
  if (transaction.type !== 'saving' || transaction.status !== 'confirmed' || !transaction.goalId) return null
  return {
    goalId: transaction.goalId,
    amount: toBase(transaction.amount, currencyOf(transaction.accountId), baseCurrency, rates),
  }
}

/** Creates or replaces an entry, keeping goal totals and the exchange rate in step with it. */
export async function saveTransaction(context: WriteContext, transaction: Transaction, previous?: Transaction) {
  const { uid, currencyOf, baseCurrency } = context
  const batch = writeBatch(db)
  batch.set(docIn(uid, 'transactions', transaction.id), {
    ...withoutId(transaction),
    updatedAt: serverTimestamp(),
  })

  const before = previous ? goalDelta(previous, context) : null
  const after = goalDelta(transaction, context)
  if (before) batch.update(docIn(uid, 'goals', before.goalId), { saved: increment(-before.amount) })
  if (after) batch.update(docIn(uid, 'goals', after.goalId), { saved: increment(after.amount) })

  if (transaction.type === 'transfer' && transaction.toAccountId && transaction.toAmount) {
    const learned = rateFromTransfer(
      currencyOf(transaction.accountId),
      currencyOf(transaction.toAccountId),
      transaction.amount,
      transaction.toAmount,
      baseCurrency,
    )
    if (learned) batch.set(userDoc(uid), { rates: { [learned.currency]: learned.rate } }, { merge: true })
  }

  await batch.commit()
}

/** Removes an entry. A recurring one is marked skipped instead, so it isn't generated again this month. */
export async function deleteTransaction(context: WriteContext, transaction: Transaction) {
  const { uid } = context
  const batch = writeBatch(db)
  const ref = docIn(uid, 'transactions', transaction.id)
  if (transaction.recurrenceId) batch.update(ref, { status: 'skipped', updatedAt: serverTimestamp() })
  else batch.delete(ref)

  const delta = goalDelta(transaction, context)
  if (delta) batch.update(docIn(uid, 'goals', delta.goalId), { saved: increment(-delta.amount) })
  await batch.commit()
}

export function confirmTransaction(uid: string, transaction: Transaction, amount = transaction.amount) {
  return updateDoc(docIn(uid, 'transactions', transaction.id), {
    status: 'confirmed',
    amount,
    updatedAt: serverTimestamp(),
  })
}

export async function createPlannedEntries(uid: string, entries: Transaction[]) {
  if (entries.length === 0) return
  const batch = writeBatch(db)
  for (const entry of entries) {
    batch.set(docIn(uid, 'transactions', entry.id), { ...withoutId(entry), updatedAt: serverTimestamp() })
  }
  await batch.commit()
}

// ---- Recurrences ----

/**
 * Saves a recurrence and brings this month's entry in line with it: a planned entry follows the new
 * amount and day, one is created if it now occurs, and a planned one is dropped if it no longer does.
 * Confirmed entries are history and are left alone.
 */
export async function saveRecurrence(
  uid: string,
  recurrence: Recurrence,
  month: MonthKey,
  current: Transaction | undefined,
) {
  const batch = writeBatch(db)
  batch.set(docIn(uid, 'recurrences', recurrence.id), withoutId(recurrence))

  const entryRef = docIn(uid, 'transactions', occurrenceId(recurrence.id, month))
  const occurs = occursIn(recurrence, month)
  if (occurs && (!current || current.status === 'planned')) {
    batch.set(entryRef, { ...withoutId(plannedOccurrence(recurrence, month)), updatedAt: serverTimestamp() })
  } else if (!occurs && current?.status === 'planned') {
    batch.delete(entryRef)
  }
  await batch.commit()
}

export async function deleteRecurrence(uid: string, recurrence: Recurrence, current?: Transaction) {
  const batch = writeBatch(db)
  batch.delete(docIn(uid, 'recurrences', recurrence.id))
  if (current?.status === 'planned') batch.delete(docIn(uid, 'transactions', current.id))
  await batch.commit()
}

// ---- Accounts, categories, goals, profile ----

export const saveAccount = (uid: string, account: Account) =>
  setDoc(docIn(uid, 'accounts', account.id), withoutId(account))

export const saveCategory = (uid: string, category: Category) =>
  setDoc(docIn(uid, 'categories', category.id), withoutId(category))

export const saveGoal = (uid: string, goal: Goal) => setDoc(docIn(uid, 'goals', goal.id), withoutId(goal))

export const updateProfile = (uid: string, changes: Partial<Profile>) =>
  setDoc(userDoc(uid), changes, { merge: true })

export interface Setup {
  accounts: Account[]
  categories: Category[]
  recurrences: Recurrence[]
  goals: Goal[]
  baseCurrency: Currency
}

/** Writes everything onboarding prepared in one go, then marks the profile as ready. */
export async function completeSetup(uid: string, setup: Setup) {
  const batch = writeBatch(db)
  for (const account of setup.accounts) batch.set(docIn(uid, 'accounts', account.id), withoutId(account))
  for (const category of setup.categories) batch.set(docIn(uid, 'categories', category.id), withoutId(category))
  for (const recurrence of setup.recurrences) batch.set(docIn(uid, 'recurrences', recurrence.id), withoutId(recurrence))
  for (const goal of setup.goals) batch.set(docIn(uid, 'goals', goal.id), withoutId(goal))
  batch.set(userDoc(uid), {
    onboarded: true,
    baseCurrency: setup.baseCurrency,
    rates: {},
    createdAt: serverTimestamp(),
  } satisfies Profile & DocumentData)
  await batch.commit()
}
