import { createContext, use } from 'react'
import type { Transaction } from '@/domain/model'

export interface EntrySheetRequest {
  /** An existing entry to edit. */
  transaction?: Transaction
  /** Starting values for a new entry, e.g. a saving towards a given goal. */
  preset?: Partial<Transaction>
}

export const EntrySheetContext = createContext<((request?: EntrySheetRequest) => void) | null>(null)

/** Opens the add/edit entry sheet from anywhere in the app. */
export function useEntrySheet() {
  const open = use(EntrySheetContext)
  if (!open) throw new Error('useEntrySheet must be used within AppLayout')
  return open
}
