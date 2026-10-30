import { useState, type ReactNode } from 'react'
import { Navigate } from 'react-router'
import { Button } from '@/components/ui/Button'
import { SelectField, SwitchField, TextField } from '@/components/ui/Field'
import { FullScreenLoader } from '@/components/ui/Spinner'
import { completeSetup, newId, type Setup } from '@/data/repository'
import { MONTH_NAMES } from '@/domain/dates'
import type { Account, Recurrence } from '@/domain/model'
import { parseAmount } from '@/domain/money'
import { DEFAULT_BRL_PER_EUR, useData } from '@/features/data/dataContext'
import { DEFAULT_CATEGORIES } from './defaults'

/** A single short form that sets up the first month: account, salary, bonuses, a real account and a first goal. */
export function OnboardingPage() {
  const { uid, loading, profile, month } = useData()
  const [accountName, setAccountName] = useState('')
  const [salary, setSalary] = useState('')
  const [payday, setPayday] = useState('25')
  const [bonuses, setBonuses] = useState(false)
  const [holidayMonth, setHolidayMonth] = useState('6')
  const [christmasMonth, setChristmasMonth] = useState('11')
  const [brazil, setBrazil] = useState(false)
  const [goal, setGoal] = useState(true)
  const [goalTarget, setGoalTarget] = useState('')
  const [goalMonthly, setGoalMonthly] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  if (loading) return <FullScreenLoader />
  if (profile?.onboarded) return <Navigate to="/" replace />

  async function finish() {
    const salaryCents = salary.trim() ? parseAmount(salary) : null
    const day = Number(payday)
    if (salary.trim() && !salaryCents) return setError('O valor do salário não é válido.')
    if (!Number.isInteger(day) || day < 1 || day > 31) return setError('O dia do salário deve estar entre 1 e 31.')
    const targetCents = goal ? parseAmount(goalTarget) : null
    const monthlyCents = goal && goalMonthly.trim() ? parseAmount(goalMonthly) : 0
    if (goal && !targetCents) return setError('Indique quanto quer juntar no fundo de emergência.')
    if (goal && monthlyCents === null) return setError('O valor mensal da meta não é válido.')

    const main: Account = { id: newId(uid, 'accounts'), name: accountName.trim() || 'Conta principal', currency: 'EUR' }
    const accounts = [main]
    if (brazil) accounts.push({ id: newId(uid, 'accounts'), name: 'Conta Brasil', currency: 'BRL' })

    const recurrences: Recurrence[] = []
    if (salaryCents) {
      const base = {
        type: 'income' as const,
        amount: salaryCents,
        accountId: main.id,
        day,
        startMonth: month,
        active: true,
      }
      recurrences.push({ ...base, id: newId(uid, 'recurrences'), name: 'Salário', categoryId: 'salary', months: null })
      if (bonuses) {
        recurrences.push(
          {
            ...base,
            id: newId(uid, 'recurrences'),
            name: 'Subsídio de férias',
            categoryId: 'bonus',
            months: [Number(holidayMonth)],
          },
          {
            ...base,
            id: newId(uid, 'recurrences'),
            name: 'Subsídio de Natal',
            categoryId: 'bonus',
            months: [Number(christmasMonth)],
          },
        )
      }
    }

    const setup: Setup = {
      accounts,
      categories: DEFAULT_CATEGORIES,
      recurrences,
      goals:
        goal && targetCents
          ? [{ id: newId(uid, 'goals'), name: 'Fundo de emergência', target: targetCents, monthly: monthlyCents ?? 0, saved: 0 }]
          : [],
      brlPerEur: DEFAULT_BRL_PER_EUR,
    }

    setSaving(true)
    setError(null)
    try {
      // Awaited on purpose: the app needs the profile before it can open, and this is the first write.
      await completeSetup(uid, setup)
    } catch (setupError) {
      console.error(setupError)
      setError('Não foi possível guardar. Verifique a conexão e tente de novo.')
      setSaving(false)
    }
  }

  return (
    <form
      className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-5 py-8"
      onSubmit={(event) => {
        event.preventDefault()
        void finish()
      }}
    >
      <header>
        <h1 className="font-display text-3xl font-medium">Bem-vindo ao Poupaí</h1>
        <p className="mt-2 text-muted">Algumas perguntas rápidas para montar o seu primeiro mês. Dá para mudar tudo depois.</p>
      </header>

      <Step title="Onde o salário cai">
        <TextField
          label="Nome da conta principal"
          placeholder="Bankinter"
          maxLength={60}
          value={accountName}
          onChange={(event) => setAccountName(event.target.value)}
        />
        <div className="grid grid-cols-[1fr_7rem] gap-3">
          <TextField
            label="Salário líquido (€)"
            inputMode="decimal"
            placeholder="1.200"
            value={salary}
            onChange={(event) => setSalary(event.target.value)}
          />
          <TextField
            label="Dia do mês"
            type="number"
            min={1}
            max={31}
            value={payday}
            onChange={(event) => setPayday(event.target.value)}
          />
        </div>
        <SwitchField
          label="Recebo os subsídios à parte"
          hint="Férias e Natal pagos em meses próprios, não em duodécimos."
          checked={bonuses}
          onChange={setBonuses}
        />
        {bonuses && (
          <div className="grid grid-cols-2 gap-3">
            <MonthSelect label="Subsídio de férias em" value={holidayMonth} onChange={setHolidayMonth} />
            <MonthSelect label="Subsídio de Natal em" value={christmasMonth} onChange={setChristmasMonth} />
          </div>
        )}
      </Step>

      <Step title="Reais">
        <SwitchField
          label="Tenho uma conta no Brasil"
          hint="Para gastos em reais, como assinaturas pagas por lá."
          checked={brazil}
          onChange={setBrazil}
        />
      </Step>

      <Step title="Primeira meta">
        <SwitchField
          label="Criar um fundo de emergência"
          hint="Uma reserva para imprevistos, antes de investir."
          checked={goal}
          onChange={setGoal}
        />
        {goal && (
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Juntar (€)"
              inputMode="decimal"
              placeholder="4.500"
              value={goalTarget}
              onChange={(event) => setGoalTarget(event.target.value)}
            />
            <TextField
              label="Por mês (€)"
              inputMode="decimal"
              placeholder="250"
              value={goalMonthly}
              onChange={(event) => setGoalMonthly(event.target.value)}
            />
          </div>
        )}
      </Step>

      <div className="mt-auto flex flex-col gap-2">
        {error && (
          <p role="alert" className="text-sm text-expense">
            {error}
          </p>
        )}
        <Button type="submit" block disabled={saving}>
          {saving ? 'Preparando…' : 'Começar'}
        </Button>
      </div>
    </form>
  )
}

function Step({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
      <h2 className="font-medium">{title}</h2>
      {children}
    </section>
  )
}

function MonthSelect({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <SelectField label={label} value={value} onChange={(event) => onChange(event.target.value)}>
      {MONTH_NAMES.map((name, index) => (
        <option key={name} value={String(index + 1)}>
          {name}
        </option>
      ))}
    </SelectField>
  )
}
