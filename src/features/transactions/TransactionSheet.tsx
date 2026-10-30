import { useState } from 'react'
import { CategoryIcon } from '@/components/CategoryIcon'
import { useToast } from '@/components/toast/toastContext'
import { Button } from '@/components/ui/Button'
import { SelectField, SwitchField, TextField } from '@/components/ui/Field'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Sheet } from '@/components/ui/Sheet'
import { deleteTransaction, newId, saveRecurrence, saveTransaction } from '@/data/repository'
import { monthOf } from '@/domain/dates'
import type { Transaction, TransactionType } from '@/domain/model'
import { amountToInput, parseAmount } from '@/domain/money'
import { occurrenceId } from '@/domain/recurrence'
import { useData } from '@/features/data/dataContext'
import { cn } from '@/lib/cn'

const TYPE_OPTIONS: { value: TransactionType; label: string }[] = [
  { value: 'expense', label: 'Gasto' },
  { value: 'income', label: 'Receita' },
  { value: 'transfer', label: 'Transferir' },
  { value: 'saving', label: 'Meta' },
]

interface TransactionSheetProps {
  transaction?: Transaction
  preset?: Partial<Transaction>
  onClose: () => void
}

export function TransactionSheet({ transaction, preset, onClose }: TransactionSheetProps) {
  const { uid, accounts, categories, goals, accountById, categoryById, today, writeContext } = useData()
  const toast = useToast()
  const start = { ...preset, ...transaction }
  const defaultAccount = accounts.find((account) => account.currency === 'EUR') ?? accounts[0]

  const [type, setType] = useState<TransactionType>(start.type ?? 'expense')
  const [amountText, setAmountText] = useState(start.amount ? amountToInput(start.amount) : '')
  const [accountId, setAccountId] = useState(start.accountId ?? defaultAccount?.id ?? '')
  const [categoryId, setCategoryId] = useState<string | null>(start.categoryId ?? null)
  const [date, setDate] = useState(start.date ?? today)
  const [note, setNote] = useState(start.note ?? '')
  const [toAccountId, setToAccountId] = useState(
    start.toAccountId ?? accounts.find((account) => account.id !== accountId)?.id ?? '',
  )
  const [toAmountText, setToAmountText] = useState(start.toAmount ? amountToInput(start.toAmount) : '')
  const [goalId, setGoalId] = useState(start.goalId ?? goals[0]?.id ?? '')
  const [repeat, setRepeat] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const isNew = !transaction
  const isPlanned = transaction?.status === 'planned'
  const currency = accountById.get(accountId)?.currency ?? 'EUR'
  const toCurrency = accountById.get(toAccountId)?.currency ?? 'EUR'
  const crossCurrency = type === 'transfer' && currency !== toCurrency
  const visibleCategories = categories.filter((category) => category.kind === (type === 'income' ? 'income' : 'expense'))

  function changeType(next: TransactionType) {
    setType(next)
    setError(null)
    if (categoryId && categoryById.get(categoryId)?.kind !== (next === 'income' ? 'income' : 'expense')) {
      setCategoryId(null)
    }
  }

  /** Builds the entry from the form, or explains what is missing. */
  function build(status: Transaction['status']): Transaction | string {
    const amount = parseAmount(amountText)
    if (!amount) return 'Indique um valor.'
    if (!accountId) return 'Escolha uma conta.'
    if ((type === 'expense' || type === 'income') && !categoryId) return 'Escolha uma categoria.'

    let toAmount: number | null = null
    if (type === 'transfer') {
      if (!toAccountId || toAccountId === accountId) return 'Escolha uma conta de destino diferente.'
      toAmount = crossCurrency ? parseAmount(toAmountText) : amount
      if (!toAmount) return 'Indique quanto chegou na conta de destino.'
    }
    if (type === 'saving' && !goalId) return 'Crie uma meta primeiro, na aba Metas.'

    return {
      id: transaction?.id ?? newId(uid, 'transactions'),
      type,
      status,
      amount,
      accountId,
      categoryId: type === 'expense' || type === 'income' ? categoryId : null,
      date,
      note: note.trim(),
      recurrenceId: transaction?.recurrenceId ?? null,
      toAccountId: type === 'transfer' ? toAccountId : null,
      toAmount,
      goalId: type === 'saving' ? goalId : null,
    }
  }

  function save(status: Transaction['status']) {
    const result = build(status)
    if (typeof result === 'string') {
      setError(result)
      return
    }

    let entry = result
    const kind = entry.type
    if (isNew && repeat && (kind === 'expense' || kind === 'income')) {
      // The first entry takes the recurrence's id for its month, so it isn't generated a second time.
      const recurrenceId = newId(uid, 'recurrences')
      const month = monthOf(entry.date)
      entry = { ...entry, id: occurrenceId(recurrenceId, month), recurrenceId }
      const name = entry.note || categoryById.get(entry.categoryId ?? '')?.name || 'Recorrente'
      toast.background(
        saveRecurrence(
          uid,
          {
            id: recurrenceId,
            name,
            type: kind,
            amount: entry.amount,
            accountId: entry.accountId,
            categoryId: entry.categoryId,
            day: Number(entry.date.slice(8, 10)),
            months: null,
            startMonth: month,
            active: true,
          },
          month,
          entry,
        ),
        'Não foi possível guardar a repetição.',
      )
    }

    toast.background(saveTransaction(writeContext, entry, transaction), 'Não foi possível guardar o lançamento.')
    onClose()
  }

  function remove() {
    if (!transaction) return
    if (!confirmingDelete) {
      setConfirmingDelete(true)
      return
    }
    toast.background(deleteTransaction(writeContext, transaction), 'Não foi possível apagar o lançamento.')
    onClose()
  }

  const title = isNew ? 'Novo lançamento' : isPlanned ? 'Confirmar lançamento' : 'Editar lançamento'

  return (
    <Sheet
      open
      title={title}
      onClose={onClose}
      onSubmit={() => save('confirmed')}
      footer={
        <div className="flex flex-col gap-2">
          {error && (
            <p role="alert" className="text-sm text-expense">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            {!isNew && (
              <Button variant="danger" onClick={remove}>
                {confirmingDelete ? 'Apagar mesmo?' : 'Apagar'}
              </Button>
            )}
            {isPlanned && (
              <Button variant="secondary" onClick={() => save('planned')}>
                Só guardar
              </Button>
            )}
            <Button type="submit" block>
              {isPlanned ? 'Confirmar' : 'Guardar'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {!transaction?.recurrenceId && (
          <SegmentedControl label="Tipo de lançamento" value={type} options={TYPE_OPTIONS} onChange={changeType} />
        )}

        <label className="flex flex-col items-center py-2">
          <span className="sr-only">Valor</span>
          <span className="flex items-baseline gap-1">
            <input
              data-autofocus={isNew && !preset?.amount ? '' : undefined}
              inputMode="decimal"
              placeholder="0,00"
              value={amountText}
              onChange={(event) => {
                setAmountText(event.target.value)
                setError(null)
              }}
              className="w-44 bg-transparent text-center font-display text-4xl font-medium outline-none placeholder:text-line"
            />
            <span className="font-display text-2xl text-muted">{currency === 'EUR' ? '€' : 'R$'}</span>
          </span>
        </label>

        {(type === 'expense' || type === 'income') && (
          <div role="radiogroup" aria-label="Categoria" className="grid grid-cols-3 gap-2">
            {visibleCategories.map((category) => (
              <button
                key={category.id}
                type="button"
                role="radio"
                aria-checked={categoryId === category.id}
                onClick={() => {
                  setCategoryId(category.id)
                  setError(null)
                }}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-xl border px-1 py-2 text-xs',
                  categoryId === category.id
                    ? 'border-primary bg-accent-soft text-accent-ink'
                    : 'border-line text-ink hover:bg-subtle',
                )}
              >
                <CategoryIcon icon={category.icon} />
                <span className="w-full truncate">{category.name}</span>
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <SelectField
            label={type === 'transfer' ? 'De' : type === 'income' ? 'Entrou em' : 'Conta'}
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </SelectField>

          {type === 'transfer' ? (
            <SelectField label="Para" value={toAccountId} onChange={(event) => setToAccountId(event.target.value)}>
              {accounts
                .filter((account) => account.id !== accountId)
                .map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
            </SelectField>
          ) : type === 'saving' ? (
            <SelectField label="Meta" value={goalId} onChange={(event) => setGoalId(event.target.value)}>
              {goals.map((goal) => (
                <option key={goal.id} value={goal.id}>
                  {goal.name}
                </option>
              ))}
            </SelectField>
          ) : (
            <TextField label="Data" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          )}
        </div>

        {crossCurrency && (
          <TextField
            label={`Quanto chegou (${toCurrency === 'EUR' ? '€' : 'R$'})`}
            inputMode="decimal"
            placeholder="0,00"
            value={toAmountText}
            onChange={(event) => setToAmountText(event.target.value)}
            hint="O câmbio desta transferência passa a ser usado para converter os seus gastos em reais."
          />
        )}

        {(type === 'transfer' || type === 'saving') && (
          <TextField label="Data" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        )}

        <TextField
          label="Nota"
          placeholder={type === 'expense' ? 'Almoço com colegas' : 'Opcional'}
          maxLength={200}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />

        {isNew && (type === 'expense' || type === 'income') && (
          <SwitchField
            label="Repetir todo mês"
            hint="Nos próximos meses aparece como previsto para você confirmar."
            checked={repeat}
            onChange={setRepeat}
          />
        )}
      </div>
    </Sheet>
  )
}
