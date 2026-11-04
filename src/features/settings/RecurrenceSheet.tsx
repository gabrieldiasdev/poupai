import { useState } from 'react'
import { useToast } from '@/components/toast/toastContext'
import { Button } from '@/components/ui/Button'
import { SelectField, TextField } from '@/components/ui/Field'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Sheet } from '@/components/ui/Sheet'
import { deleteRecurrence, newId, saveRecurrence } from '@/data/repository'
import { MONTH_NAMES } from '@/domain/dates'
import type { Recurrence } from '@/domain/model'
import { amountToInput, parseAmount } from '@/domain/money'
import { occurrenceId } from '@/domain/recurrence'
import { useData } from '@/features/data/dataContext'
import { cn } from '@/lib/cn'

export function RecurrenceSheet({ recurrence, onClose }: { recurrence?: Recurrence; onClose: () => void }) {
  const { uid, accounts, categories, transactions, month } = useData()
  const toast = useToast()

  const [type, setType] = useState<Recurrence['type']>(recurrence?.type ?? 'expense')
  const [name, setName] = useState(recurrence?.name ?? '')
  const [amount, setAmount] = useState(recurrence ? amountToInput(recurrence.amount) : '')
  const [accountId, setAccountId] = useState(recurrence?.accountId ?? accounts[0]?.id ?? '')
  const [categoryId, setCategoryId] = useState(recurrence?.categoryId ?? '')
  const [day, setDay] = useState(String(recurrence?.day ?? 1))
  const [months, setMonths] = useState<number[] | null>(recurrence?.months ?? null)
  const [error, setError] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const current = recurrence && transactions.find((transaction) => transaction.id === occurrenceId(recurrence.id, month))
  const visibleCategories = categories.filter((category) => category.kind === type)

  function toggleMonth(monthNumber: number) {
    const selected = months ?? []
    const next = selected.includes(monthNumber)
      ? selected.filter((value) => value !== monthNumber)
      : [...selected, monthNumber].sort((a, b) => a - b)
    setMonths(next)
  }

  function save() {
    const cents = parseAmount(amount)
    const dayNumber = Number(day)
    if (!name.trim()) return setError('Dê um nome, por exemplo “Salário” ou “Internet”.')
    if (!cents) return setError('Indique o valor.')
    if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 31) return setError('O dia deve estar entre 1 e 31.')
    if (months && months.length === 0) return setError('Escolha pelo menos um mês.')

    toast.background(
      saveRecurrence(
        uid,
        {
          id: recurrence?.id ?? newId(uid, 'recurrences'),
          name: name.trim(),
          type,
          amount: cents,
          accountId,
          categoryId: categoryId || null,
          day: dayNumber,
          months,
          startMonth: recurrence?.startMonth ?? month,
          active: true,
        },
        month,
        current,
      ),
      'Não foi possível guardar.',
    )
    onClose()
  }

  function remove() {
    if (!recurrence) return
    if (!confirmingDelete) return setConfirmingDelete(true)
    toast.background(deleteRecurrence(uid, recurrence, current), 'Não foi possível apagar.')
    onClose()
  }

  return (
    <Sheet
      open
      title={recurrence ? 'Editar recorrente' : 'Nova recorrente'}
      onClose={onClose}
      onSubmit={save}
      footer={
        <div className="flex flex-col gap-2">
          {error && (
            <p role="alert" className="text-sm text-expense">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            {recurrence && (
              <Button variant="danger" onClick={remove}>
                {confirmingDelete ? 'Apagar mesmo?' : 'Apagar'}
              </Button>
            )}
            <Button type="submit" block>
              Guardar
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <SegmentedControl
          label="Tipo"
          value={type}
          onChange={(next) => {
            setType(next)
            setCategoryId('')
          }}
          options={[
            { value: 'expense', label: 'Gasto fixo' },
            { value: 'income', label: 'Receita' },
          ]}
        />
        <TextField
          label="Nome"
          maxLength={60}
          placeholder={type === 'income' ? 'Salário' : 'Internet'}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Valor"
            inputMode="decimal"
            placeholder="0,00"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
          <TextField
            label="Dia do mês"
            type="number"
            min={1}
            max={31}
            value={day}
            onChange={(event) => setDay(event.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <SelectField label="Conta" value={accountId} onChange={(event) => setAccountId(event.target.value)}>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </SelectField>
          <SelectField label="Categoria" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            <option value="">Sem categoria</option>
            {visibleCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </SelectField>
        </div>

        <div>
          <SegmentedControl
            label="Quando acontece"
            value={months ? 'some' : 'every'}
            onChange={(next) => setMonths(next === 'every' ? null : (recurrence?.months ?? []))}
            options={[
              { value: 'every', label: 'Todo mês' },
              { value: 'some', label: 'Só em alguns meses' },
            ]}
          />
          {months && (
            <div className="mt-3 grid grid-cols-4 gap-1.5">
              {MONTH_NAMES.map((monthName, index) => (
                <button
                  key={monthName}
                  type="button"
                  aria-pressed={months.includes(index + 1)}
                  onClick={() => toggleMonth(index + 1)}
                  className={cn(
                    'rounded-lg border py-1.5 text-xs capitalize',
                    months.includes(index + 1) ? 'border-primary bg-accent-soft text-accent-ink' : 'border-line',
                  )}
                >
                  {monthName.slice(0, 3)}
                </button>
              ))}
            </div>
          )}
          <p className="mt-2 text-xs text-muted">Use “só em alguns meses” para extras como 13º salário, férias ou bônus.</p>
        </div>
      </div>
    </Sheet>
  )
}
