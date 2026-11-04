import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { subscribeMonthTransactions } from '@/data/repository'
import { addMonths, formatDay, formatMonth } from '@/domain/dates'
import type { Transaction } from '@/domain/model'
import { formatMoney } from '@/domain/money'
import { summarizeMonth } from '@/domain/summary'
import { useData } from '@/features/data/dataContext'
import { useSubscription } from '@/lib/useSubscription'
import { useEntrySheet } from './entrySheetContext'
import { TransactionRow } from './TransactionRow'

export function TransactionsPage() {
  const { uid, month: currentMonth, transactions: currentTransactions, accounts, goals, baseCurrency, rates, today } = useData()
  const openEntry = useEntrySheet()
  const [month, setMonth] = useState(currentMonth)

  // The current month is already live in DataProvider; other months get their own listener.
  const other = useSubscription(
    month === currentMonth ? null : `transactions:${uid}:${month}`,
    subscribeMonthTransactions(uid, month),
  )
  const transactions = month === currentMonth ? currentTransactions : other.data
  const visible = (transactions ?? []).filter((transaction) => transaction.status !== 'skipped')
  const summary = summarizeMonth(visible, accounts, goals, baseCurrency, rates, today)

  const byDay = new Map<string, Transaction[]>()
  for (const transaction of visible) {
    byDay.set(transaction.date, [...(byDay.get(transaction.date) ?? []), transaction])
  }

  return (
    <div>
      <PageHeader title="Lançamentos" />

      <div className="flex items-center justify-between px-2">
        <button
          type="button"
          onClick={() => setMonth(addMonths(month, -1))}
          aria-label="Mês anterior"
          className="rounded-lg p-2 hover:bg-subtle"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <p className="font-medium capitalize">{formatMonth(month, today)}</p>
        <button
          type="button"
          onClick={() => setMonth(addMonths(month, 1))}
          disabled={month >= currentMonth}
          aria-label="Próximo mês"
          className="rounded-lg p-2 hover:bg-subtle disabled:opacity-30"
        >
          <ChevronRight className="size-5" aria-hidden />
        </button>
      </div>

      <p className="px-4 pb-3 text-center text-sm text-muted">
        Entrou <span className="font-medium text-income">{formatMoney(summary.income, baseCurrency)}</span> · Saiu{' '}
        <span className="font-medium text-expense">{formatMoney(summary.expense, baseCurrency)}</span>
      </p>

      {!transactions ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : visible.length === 0 ? (
        <p className="mx-4 rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
          Nenhum lançamento neste mês.
        </p>
      ) : (
        <div className="flex flex-col gap-4 px-4">
          {[...byDay].map(([date, entries]) => (
            <section key={date}>
              <h2 className="mb-1 text-xs font-medium text-muted">{formatDay(date, today)}</h2>
              <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
                {entries.map((transaction) => (
                  <li key={transaction.id}>
                    <TransactionRow transaction={transaction} onClick={() => openEntry({ transaction })} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
