import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import {
  createPlannedEntries,
  subscribeAccounts,
  subscribeCategories,
  subscribeGoals,
  subscribeMonthTransactions,
  subscribeProfile,
  subscribeRecurrences,
} from '@/data/repository'
import { monthOf, todayKey } from '@/domain/dates'
import { currencySettings } from '@/domain/money'
import { missingOccurrences } from '@/domain/recurrence'
import { useSubscription } from '@/lib/useSubscription'
import { DataContext, type DataState } from './dataContext'

/**
 * Keeps the signed-in person's data live: accounts, categories, recurrences, goals and this
 * month's entries. It also fills in the month's planned entries from the recurrences.
 */
export function DataProvider({ uid, children }: { uid: string; children: ReactNode }) {
  const today = todayKey()
  const month = monthOf(today)

  const profile = useSubscription(`profile:${uid}`, subscribeProfile(uid))
  const accounts = useSubscription(`accounts:${uid}`, subscribeAccounts(uid))
  const categories = useSubscription(`categories:${uid}`, subscribeCategories(uid))
  const recurrences = useSubscription(`recurrences:${uid}`, subscribeRecurrences(uid))
  const goals = useSubscription(`goals:${uid}`, subscribeGoals(uid))
  const transactions = useSubscription(`transactions:${uid}:${month}`, subscribeMonthTransactions(uid, month))

  const loading =
    profile.loading ||
    accounts.loading ||
    categories.loading ||
    recurrences.loading ||
    goals.loading ||
    transactions.loading

  // Remembers what was already requested, so a slow write isn't sent again on the next snapshot.
  const requested = useRef(new Set<string>())
  useEffect(() => {
    if (loading || !profile.data?.onboarded || !recurrences.data || !transactions.data) return
    const existing = new Set(transactions.data.map((transaction) => transaction.id))
    const missing = missingOccurrences(recurrences.data, month, existing).filter(
      (entry) => !requested.current.has(entry.id),
    )
    if (missing.length === 0) return
    for (const entry of missing) requested.current.add(entry.id)
    createPlannedEntries(uid, missing).catch((error) => console.error('Could not create planned entries', error))
  }, [loading, month, profile.data, recurrences.data, transactions.data, uid])

  const value = useMemo<DataState>(() => {
    const accountList = accounts.data ?? []
    const accountById = new Map(accountList.map((account) => [account.id, account]))
    const { baseCurrency, rates } = currencySettings(profile.data)
    return {
      uid,
      loading,
      profile: profile.data ?? null,
      accounts: accountList,
      categories: categories.data ?? [],
      recurrences: recurrences.data ?? [],
      goals: goals.data ?? [],
      transactions: transactions.data ?? [],
      today,
      month,
      baseCurrency,
      rates,
      accountById,
      categoryById: new Map((categories.data ?? []).map((category) => [category.id, category])),
      writeContext: {
        uid,
        baseCurrency,
        rates,
        currencyOf: (accountId) => accountById.get(accountId)?.currency ?? baseCurrency,
      },
    }
  }, [
    uid,
    loading,
    profile.data,
    accounts.data,
    categories.data,
    recurrences.data,
    goals.data,
    transactions.data,
    today,
    month,
  ])

  return <DataContext value={value}>{children}</DataContext>
}
