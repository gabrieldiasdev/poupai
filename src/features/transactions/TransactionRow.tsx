import { EntryBadge } from '@/components/CategoryIcon'
import type { Transaction } from '@/domain/model'
import { formatMoney } from '@/domain/money'
import { useData } from '@/features/data/dataContext'
import { cn } from '@/lib/cn'

/** How an entry is named in lists: its note, else its category, goal or destination. */
function useEntryLabel() {
  const { categoryById, accountById, goals } = useData()
  return (transaction: Transaction) => {
    if (transaction.note) return transaction.note
    if (transaction.type === 'transfer') return `Para ${accountById.get(transaction.toAccountId ?? '')?.name ?? 'outra conta'}`
    if (transaction.type === 'saving') return goals.find((goal) => goal.id === transaction.goalId)?.name ?? 'Meta'
    return categoryById.get(transaction.categoryId ?? '')?.name ?? 'Sem categoria'
  }
}

export function TransactionRow({
  transaction,
  detail,
  onClick,
}: {
  transaction: Transaction
  detail?: string
  onClick: () => void
}) {
  const { categoryById, accountById, baseCurrency } = useData()
  const label = useEntryLabel()
  const currency = accountById.get(transaction.accountId)?.currency ?? baseCurrency
  const sign = transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '−' : ''
  const kind = transaction.type === 'transfer' ? 'transfer' : transaction.type === 'saving' ? 'saving' : 'category'

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-subtle',
        transaction.status === 'planned' && 'opacity-70',
      )}
    >
      <EntryBadge icon={categoryById.get(transaction.categoryId ?? '')?.icon ?? 'other'} kind={kind} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{label(transaction)}</span>
        <span className="block truncate text-xs text-muted">
          {detail ?? accountById.get(transaction.accountId)?.name}
          {transaction.status === 'planned' && ' · previsto'}
        </span>
      </span>
      <span
        className={cn(
          'shrink-0 text-sm font-semibold tabular-nums',
          transaction.type === 'income' && 'text-income',
          transaction.type === 'expense' && 'text-ink',
          (transaction.type === 'transfer' || transaction.type === 'saving') && 'text-muted',
        )}
      >
        {sign}
        {formatMoney(transaction.amount, currency)}
      </span>
    </button>
  )
}
