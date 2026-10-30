import { createContext, use } from 'react'
import type { WriteContext } from '@/data/repository'
import type { Account, Category, DateKey, Goal, MonthKey, Profile, Recurrence, Transaction } from '@/domain/model'

/** Used until the user's first euro-to-real transfer tells us the rate they actually get. */
export const DEFAULT_BRL_PER_EUR = 6.2

export interface DataState {
  uid: string
  loading: boolean
  /** Null until onboarding creates it. */
  profile: Profile | null
  accounts: Account[]
  categories: Category[]
  recurrences: Recurrence[]
  goals: Goal[]
  /** The current month's entries, newest first. */
  transactions: Transaction[]
  today: DateKey
  month: MonthKey
  brlPerEur: number
  accountById: Map<string, Account>
  categoryById: Map<string, Category>
  /** Everything a write needs to keep goal totals and the exchange rate right. */
  writeContext: WriteContext
}

export const DataContext = createContext<DataState | null>(null)

export function useData(): DataState {
  const context = use(DataContext)
  if (!context) throw new Error('useData must be used within DataProvider')
  return context
}
