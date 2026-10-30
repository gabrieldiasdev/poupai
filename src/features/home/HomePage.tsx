import { Bell, Check, Gift } from 'lucide-react'
import { useState } from 'react'
import { CategoryIcon } from '@/components/CategoryIcon'
import { PageHeader, SectionTitle } from '@/components/PageHeader'
import { useToast } from '@/components/toast/toastContext'
import { Button } from '@/components/ui/Button'
import { confirmTransaction } from '@/data/repository'
import { daysBetween, formatDay, formatMonth } from '@/domain/dates'
import type { Transaction } from '@/domain/model'
import { formatMoney } from '@/domain/money'
import { plannedThisMonth, summarizeMonth } from '@/domain/summary'
import { useData } from '@/features/data/dataContext'
import { useEntrySheet } from '@/features/transactions/entrySheetContext'
import { TransactionRow } from '@/features/transactions/TransactionRow'
import { cn } from '@/lib/cn'

export function HomePage() {
  const data = useData()
  const { uid, transactions, accounts, goals, brlPerEur, today, month, categoryById, recurrences } = data
  const openEntry = useEntrySheet()
  const toast = useToast()

  const summary = summarizeMonth(transactions, accounts, goals, brlPerEur, today)
  const planned = plannedThisMonth(transactions, today)
  const overspent = summary.spendable < 0

  function confirm(transaction: Transaction) {
    toast.background(confirmTransaction(uid, transaction), 'Não foi possível confirmar.')
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Poupaí"
        action={<span className="rounded-full border border-line px-3 py-1 text-sm capitalize">{formatMonth(month, today)}</span>}
      />

      <div className="flex flex-col gap-5 px-4">
        <section className="rounded-2xl bg-accent-soft p-5 text-accent-ink" aria-label="Quanto ainda pode gastar">
          <p className="text-sm">{overspent ? 'Passou do previsto este mês' : 'Ainda pode gastar este mês'}</p>
          <p className="mt-1 font-display text-4xl font-medium tabular-nums">
            {formatMoney(Math.abs(summary.spendable))}
          </p>
          <p className="mt-1 text-sm">
            {overspent
              ? 'Já contando contas previstas e o que vai para as metas.'
              : `Cerca de ${formatMoney(summary.perDay)} por dia até o fim do mês.`}
          </p>
        </section>

        <section className="grid grid-cols-3 gap-2 text-center" aria-label="Resumo do mês">
          <Metric label="Entrou" value={summary.income} className="text-income" />
          <Metric label="Saiu" value={summary.expense} className="text-expense" />
          <Metric label="Sobrou" value={summary.left} />
        </section>

        <LoggingReminder />
        <BonusSuggestion />

        {planned.length > 0 && (
          <section>
            <SectionTitle>Para confirmar</SectionTitle>
            <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
              {planned.map((transaction) => {
                const due = transaction.date <= today
                return (
                  <li key={transaction.id} className="flex items-center">
                    <div className="min-w-0 flex-1">
                      <TransactionRow
                        transaction={transaction}
                        detail={formatDay(transaction.date, today)}
                        onClick={() => openEntry({ transaction })}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => confirm(transaction)}
                      aria-label={`Confirmar ${transaction.note}`}
                      className={cn(
                        'mr-3 flex size-8 shrink-0 items-center justify-center rounded-full border',
                        due ? 'border-primary text-primary' : 'border-line text-muted',
                      )}
                    >
                      <Check className="size-4" aria-hidden />
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        <section>
          <SectionTitle>Onde foi o dinheiro</SectionTitle>
          {summary.byCategory.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
              Nenhum gasto este mês ainda. Toque em + para registrar o primeiro.
            </p>
          ) : (
            <ul className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
              {summary.byCategory.slice(0, 6).map(({ categoryId, amount }) => {
                const category = categoryById.get(categoryId ?? '')
                const share = amount / summary.byCategory[0].amount
                return (
                  <li key={categoryId ?? 'none'} className="flex items-center gap-3">
                    <CategoryIcon icon={category?.icon ?? 'other'} className="size-4 text-muted" />
                    <div className="flex-1">
                      <div className="flex justify-between text-sm">
                        <span>{category?.name ?? 'Sem categoria'}</span>
                        <span className="tabular-nums">{formatMoney(amount)}</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-subtle">
                        <div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${Math.max(share * 100, 3)}%` }} />
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {recurrences.length === 0 && (
          <p className="text-center text-xs text-muted">
            Dica: cadastre o salário e as contas fixas em Ajustes para o app prever o seu mês.
          </p>
        )}
      </div>
    </div>
  )
}

/** Nudges the user when nothing has been logged for a couple of days, so the habit doesn't fade. */
function LoggingReminder() {
  const { transactions, today } = useData()
  const openEntry = useEntrySheet()
  const logged = transactions.filter((transaction) => transaction.status === 'confirmed' && !transaction.recurrenceId)
  const last = logged.reduce<string | null>((latest, transaction) => (!latest || transaction.date > latest ? transaction.date : latest), null)
  const idleDays = last ? daysBetween(last, today) : Number(today.slice(8, 10)) - 1
  if (idleDays < 2) return null

  return (
    <button
      type="button"
      onClick={() => openEntry()}
      className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-left text-sm hover:bg-subtle"
    >
      <Bell className="size-5 shrink-0 text-primary" aria-hidden />
      <span>
        {last ? `Nenhum gasto registrado há ${idleDays} dias.` : 'Nenhum gasto registrado este mês.'}{' '}
        <span className="font-medium text-primary">Registrar agora</span>
      </span>
    </button>
  )
}

/** When a holiday or Christmas bonus arrives, suggests sending half of it to the first unfinished goal. */
function BonusSuggestion() {
  const { transactions, recurrences, goals } = useData()
  const openEntry = useEntrySheet()
  const [dismissed, setDismissed] = useState<string[]>(() => readDismissed())
  const bonusRecurrences = new Set(recurrences.filter((recurrence) => recurrence.months).map((recurrence) => recurrence.id))
  const bonus = transactions.find(
    (transaction) =>
      transaction.type === 'income' &&
      transaction.status === 'confirmed' &&
      transaction.recurrenceId &&
      bonusRecurrences.has(transaction.recurrenceId) &&
      !dismissed.includes(transaction.id),
  )
  const goal = goals.find((candidate) => candidate.saved < candidate.target)
  if (!bonus || !goal) return null

  const half = Math.round(bonus.amount / 2)
  function dismiss() {
    const next = [...dismissed, bonus!.id]
    setDismissed(next)
    writeDismissed(next)
  }

  return (
    <section className="rounded-xl bg-accent-soft p-4 text-accent-ink">
      <p className="flex items-center gap-2 font-medium">
        <Gift className="size-5" aria-hidden />
        Entrou o {bonus.note || 'subsídio'}
      </p>
      <p className="mt-1 text-sm">
        {formatMoney(bonus.amount)} a mais este mês. Mandar metade para “{goal.name}”?
      </p>
      <div className="mt-3 flex gap-2">
        <Button
          size="sm"
          onClick={() => {
            dismiss()
            openEntry({ preset: { type: 'saving', amount: half, goalId: goal.id, accountId: bonus.accountId } })
          }}
        >
          Mandar {formatMoney(half, 'EUR', { compact: true })}
        </Button>
        <Button size="sm" variant="ghost" onClick={dismiss}>
          Agora não
        </Button>
      </div>
    </section>
  )
}

function Metric({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div className="rounded-xl bg-surface px-2 py-3 ring-1 ring-line">
      <p className="text-xs text-muted">{label}</p>
      <p className={cn('mt-0.5 text-sm font-semibold tabular-nums', className)}>
        {formatMoney(value, 'EUR', { compact: true })}
      </p>
    </div>
  )
}

const DISMISSED_KEY = 'poupai:dismissed-bonuses'

function readDismissed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? '[]') as string[]
  } catch {
    return []
  }
}

function writeDismissed(ids: string[]) {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids.slice(-20)))
  } catch {
    // Storage can be unavailable (private mode); the card simply shows again next time.
  }
}
