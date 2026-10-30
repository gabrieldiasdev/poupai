import { PiggyBank, Plus } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { addMonths, formatMonth } from '@/domain/dates'
import type { Goal } from '@/domain/model'
import { formatMoney } from '@/domain/money'
import { useData } from '@/features/data/dataContext'
import { useEntrySheet } from '@/features/transactions/entrySheetContext'
import { GoalSheet } from './GoalSheet'

export function GoalsPage() {
  const { goals, transactions, month, today } = useData()
  const openEntry = useEntrySheet()
  const [editing, setEditing] = useState<{ goal?: Goal } | null>(null)

  const savedThisMonth = (goal: Goal) =>
    transactions
      .filter((transaction) => transaction.type === 'saving' && transaction.status === 'confirmed' && transaction.goalId === goal.id)
      .reduce((total, transaction) => total + transaction.amount, 0)

  return (
    <div>
      <PageHeader
        title="Metas"
        action={
          <Button size="sm" variant="secondary" onClick={() => setEditing({})}>
            <Plus className="size-4" aria-hidden />
            Nova meta
          </Button>
        }
      />

      <div className="flex flex-col gap-3 px-4">
        {goals.length === 0 && (
          <div className="rounded-xl border border-dashed border-line px-4 py-8 text-center">
            <PiggyBank className="mx-auto size-8 text-primary" aria-hidden />
            <p className="mt-2 font-medium">Comece pelo fundo de emergência</p>
            <p className="mt-1 text-sm text-muted">Uma reserva para imprevistos é o primeiro passo antes de investir.</p>
          </div>
        )}

        {goals.map((goal) => {
          const remaining = Math.max(goal.target - goal.saved, 0)
          const progress = Math.min(goal.saved / goal.target, 1)
          const monthsLeft = goal.monthly > 0 ? Math.ceil(remaining / goal.monthly) : null
          const thisMonth = savedThisMonth(goal)
          return (
            <article key={goal.id} className="rounded-xl border border-line bg-surface p-4">
              <button type="button" onClick={() => setEditing({ goal })} className="w-full text-left">
                <div className="flex items-baseline justify-between">
                  <h2 className="font-medium">{goal.name}</h2>
                  <span className="text-sm text-muted">{Math.round(progress * 100)}%</span>
                </div>
                <p className="mt-1 font-display text-2xl font-medium tabular-nums">{formatMoney(goal.saved)}</p>
                <p className="text-sm text-muted">de {formatMoney(goal.target)}</p>
                <div className="mt-3 h-2.5 rounded-full bg-subtle">
                  <div className="h-2.5 rounded-full bg-brand-500" style={{ width: `${progress * 100}%` }} />
                </div>
                <p className="mt-2 text-sm text-muted">
                  {remaining === 0
                    ? 'Meta atingida!'
                    : monthsLeft
                      ? `${formatMoney(goal.monthly, 'EUR', { compact: true })} por mês · pronta em ${formatMonth(addMonths(month, monthsLeft), today)}`
                      : 'Defina quanto guardar por mês para ver quando fica pronta.'}
                </p>
                {goal.monthly > 0 && remaining > 0 && (
                  <p className="mt-1 text-xs text-muted">
                    {thisMonth >= goal.monthly
                      ? `Este mês você já guardou ${formatMoney(thisMonth)}.`
                      : `Este mês: ${formatMoney(thisMonth)} de ${formatMoney(goal.monthly)}`}
                  </p>
                )}
              </button>
              {remaining > 0 && (
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={() =>
                    openEntry({
                      preset: {
                        type: 'saving',
                        goalId: goal.id,
                        amount: Math.max(Math.min(goal.monthly - thisMonth, remaining), 0) || undefined,
                      },
                    })
                  }
                >
                  <PiggyBank className="size-4" aria-hidden />
                  Guardar dinheiro
                </Button>
              )}
            </article>
          )
        })}
      </div>

      {editing && <GoalSheet goal={editing.goal} onClose={() => setEditing(null)} />}
    </div>
  )
}
