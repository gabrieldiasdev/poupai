import { useState } from 'react'
import { useToast } from '@/components/toast/toastContext'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Field'
import { Sheet } from '@/components/ui/Sheet'
import { newId, saveGoal } from '@/data/repository'
import type { Goal } from '@/domain/model'
import { amountToInput, CURRENCY_SYMBOLS, parseAmount } from '@/domain/money'
import { useData } from '@/features/data/dataContext'

export function GoalSheet({ goal, onClose }: { goal?: Goal; onClose: () => void }) {
  const { uid, baseCurrency } = useData()
  const symbol = CURRENCY_SYMBOLS[baseCurrency]
  const toast = useToast()
  const [name, setName] = useState(goal?.name ?? (goal ? '' : 'Fundo de emergência'))
  const [target, setTarget] = useState(goal ? amountToInput(goal.target) : '')
  const [monthly, setMonthly] = useState(goal?.monthly ? amountToInput(goal.monthly) : '')
  const [error, setError] = useState<string | null>(null)

  function save() {
    const targetCents = parseAmount(target)
    const monthlyCents = monthly.trim() ? parseAmount(monthly) : 0
    if (!name.trim()) return setError('Dê um nome à meta.')
    if (!targetCents) return setError('Indique quanto quer juntar.')
    if (monthlyCents === null) return setError('O valor mensal não é válido.')

    toast.background(
      saveGoal(uid, {
        id: goal?.id ?? newId(uid, 'goals'),
        name: name.trim(),
        target: targetCents,
        monthly: monthlyCents,
        saved: goal?.saved ?? 0,
      }),
      'Não foi possível guardar a meta.',
    )
    onClose()
  }

  return (
    <Sheet
      open
      title={goal ? 'Editar meta' : 'Nova meta'}
      onClose={onClose}
      onSubmit={save}
      footer={
        <div className="flex flex-col gap-2">
          {error && (
            <p role="alert" className="text-sm text-expense">
              {error}
            </p>
          )}
          <Button type="submit" block>
            Guardar
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <TextField label="Nome" maxLength={60} value={name} onChange={(event) => setName(event.target.value)} />
        <TextField
          label={`Quanto quer juntar (${symbol})`}
          inputMode="decimal"
          placeholder="0,00"
          value={target}
          onChange={(event) => setTarget(event.target.value)}
          hint={!goal ? 'Para um fundo de emergência, o comum é 3 a 6 meses dos seus gastos.' : undefined}
        />
        <TextField
          label={`Quanto guardar por mês (${symbol})`}
          inputMode="decimal"
          placeholder="0,00"
          value={monthly}
          onChange={(event) => setMonthly(event.target.value)}
          hint="Esse valor fica reservado no “ainda pode gastar” até você guardá-lo."
        />
      </div>
    </Sheet>
  )
}
