import { ArrowLeft, Check, Plus, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Navigate } from 'react-router'
import { Button } from '@/components/ui/Button'
import { SelectField, TextField } from '@/components/ui/Field'
import { FullScreenLoader } from '@/components/ui/Spinner'
import { completeSetup, newId } from '@/data/repository'
import { MONTH_NAMES } from '@/domain/dates'
import type { Currency } from '@/domain/model'
import { amountToInput, CURRENCIES, CURRENCY_NAMES, CURRENCY_SYMBOLS, formatMoney, parseAmount } from '@/domain/money'
import { useData } from '@/features/data/dataContext'
import { cn } from '@/lib/cn'
import {
  buildSetup,
  DEFAULT_PAYDAY,
  extraPresets,
  fixedPresets,
  leftAfterBills,
  suggestCurrency,
  type ExtraPreset,
  type FixedPreset,
} from './presets'

const PAYDAYS = [1, 5, 10, 15, 20, 25]
const LAST_STEP = 3

interface ExtraDraft {
  key: string
  title: string
  custom: boolean
  parts: { name: string; month: number; amount: string }[]
}

interface BillDraft {
  key: string
  name: string
  categoryId: string
  custom: boolean
  amount: string
  day: string
}

/** Four short questions: only the currency is required, everything else can be skipped and added later. */
export function OnboardingPage() {
  const { uid, loading, profile, month } = useData()
  const [step, setStep] = useState(0)
  const [currency, setCurrency] = useState<Currency>(() => suggestCurrency(navigator.language))
  const [income, setIncome] = useState('')
  const [payday, setPayday] = useState<number | null>(null)
  const [customPayday, setCustomPayday] = useState(false)
  const [extras, setExtras] = useState<ExtraDraft[]>([])
  const [bills, setBills] = useState<BillDraft[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  if (loading) return <FullScreenLoader />
  if (profile?.onboarded) return <Navigate to="/" replace />

  const symbol = CURRENCY_SYMBOLS[currency]
  const incomeCents = income.trim() ? parseAmount(income) : null
  const day = payday ?? DEFAULT_PAYDAY[currency]
  const billAmounts = bills.map((bill) => parseAmount(bill.amount) ?? 0)
  const left = leftAfterBills(incomeCents, billAmounts)

  function chooseCurrency(next: Currency) {
    setCurrency(next)
    // Presets depend on the currency, so anything picked for the previous one no longer applies.
    setExtras([])
    setBills([])
  }

  function toggleExtra(preset: ExtraPreset) {
    setError(null)
    setExtras((current) =>
      current.some((extra) => extra.key === preset.id)
        ? current.filter((extra) => extra.key !== preset.id)
        : [
            ...current,
            {
              key: preset.id,
              title: preset.title,
              custom: false,
              parts: preset.parts.map((part) => ({
                name: part.name,
                month: part.month,
                amount: incomeCents && part.share ? amountToInput(Math.round(incomeCents * part.share)) : '',
              })),
            },
          ],
    )
  }

  function addCustomExtra() {
    setExtras((current) => [
      ...current,
      { key: crypto.randomUUID(), title: '', custom: true, parts: [{ name: '', month: 12, amount: '' }] },
    ])
  }

  function updateExtraPart(key: string, index: number, changes: Partial<ExtraDraft['parts'][number]>) {
    setError(null)
    setExtras((current) =>
      current.map((extra) =>
        extra.key === key
          ? { ...extra, parts: extra.parts.map((part, i) => (i === index ? { ...part, ...changes } : part)) }
          : extra,
      ),
    )
  }

  function toggleBill(preset: FixedPreset) {
    setError(null)
    setBills((current) =>
      current.some((bill) => bill.key === preset.name)
        ? current.filter((bill) => bill.key !== preset.name)
        : [
            ...current,
            {
              key: preset.name,
              name: preset.name,
              categoryId: preset.categoryId,
              custom: false,
              amount: '',
              day: String(preset.day),
            },
          ],
    )
  }

  function addCustomBill() {
    setBills((current) => [
      ...current,
      { key: crypto.randomUUID(), name: '', categoryId: 'other-expense', custom: true, amount: '', day: '1' },
    ])
  }

  function updateBill(key: string, changes: Partial<BillDraft>) {
    setError(null)
    setBills((current) => current.map((bill) => (bill.key === key ? { ...bill, ...changes } : bill)))
  }

  /** Explains what the current step still needs, or returns null when it can move on. */
  function stepProblem(): string | null {
    if (step === 1) {
      if (!incomeCents) return 'Informe um valor, ou pule se a sua renda varia.'
      if (!Number.isInteger(day) || day < 1 || day > 31) return 'O dia deve estar entre 1 e 31.'
    }
    if (step === 2) {
      for (const extra of extras) {
        if (extra.parts.some((part) => !part.name.trim())) return 'Dê um nome ao extra.'
        if (extra.parts.some((part) => !parseAmount(part.amount))) return `Informe o valor de ${extra.title || 'cada extra'}.`
      }
    }
    if (step === 3) {
      for (const bill of bills) {
        if (!bill.name.trim()) return 'Dê um nome a cada gasto.'
        if (!parseAmount(bill.amount)) return `Informe o valor de ${bill.name}.`
        const billDay = Number(bill.day)
        if (!Number.isInteger(billDay) || billDay < 1 || billDay > 31) return `O dia de ${bill.name} deve estar entre 1 e 31.`
      }
    }
    return null
  }

  function advance() {
    const problem = stepProblem()
    if (problem) return setError(problem)
    setError(null)
    if (step === LAST_STEP) void finish(bills)
    else setStep(step + 1)
  }

  function skip() {
    setError(null)
    if (step === 1) {
      setIncome('')
      setStep(2)
    } else if (step === 2) {
      setExtras([])
      setStep(3)
    } else {
      setBills([])
      void finish([])
    }
  }

  async function finish(finalBills: BillDraft[]) {
    const setup = buildSetup(
      {
        currency,
        income: incomeCents,
        payday: day,
        extras: extras.flatMap((extra) =>
          extra.parts.map((part) => ({ name: part.name.trim(), month: part.month, amount: parseAmount(part.amount) ?? 0 })),
        ),
        fixed: finalBills.map((bill) => ({
          name: bill.name.trim(),
          categoryId: bill.categoryId,
          amount: parseAmount(bill.amount) ?? 0,
          day: Number(bill.day),
        })),
      },
      month,
      (kind) => newId(uid, kind),
    )

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
      className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      onSubmit={(event) => {
        event.preventDefault()
        advance()
      }}
    >
      <div className="flex items-center gap-3">
        {step > 0 && (
          <button
            type="button"
            onClick={() => {
              setError(null)
              setStep(step - 1)
            }}
            aria-label="Voltar"
            className="-ml-1.5 rounded-lg p-1.5 hover:bg-subtle"
          >
            <ArrowLeft className="size-5" aria-hidden />
          </button>
        )}
        <div
          className="grid flex-1 grid-cols-4 gap-1.5"
          role="progressbar"
          aria-label="Progresso"
          aria-valuemin={1}
          aria-valuemax={LAST_STEP + 1}
          aria-valuenow={step + 1}
        >
          {[0, 1, 2, 3].map((index) => (
            <span key={index} className={cn('h-1 rounded-full', index <= step ? 'bg-primary' : 'bg-line')} />
          ))}
        </div>
      </div>

      {step === 0 && (
        <Step title="Em que moeda você quer controlar o seu dinheiro?" hint="Sugerimos pelo idioma do seu celular.">
          <div role="radiogroup" aria-label="Moeda principal" className="flex flex-col gap-2">
            {CURRENCIES.map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={option === currency}
                onClick={() => chooseCurrency(option)}
                className={cn(
                  'flex items-center justify-between rounded-xl border px-4 py-3 text-left',
                  option === currency ? 'border-primary bg-accent-soft text-accent-ink' : 'border-line hover:bg-subtle',
                )}
              >
                <span>
                  <span className="font-medium">{CURRENCY_NAMES[option]}</span> · {CURRENCY_SYMBOLS[option]}
                </span>
                {option === currency && <Check className="size-5" aria-hidden />}
              </button>
            ))}
          </div>
        </Step>
      )}

      {step === 1 && (
        <Step title="Quanto você recebe por mês?" hint="Salário, aposentadoria, o que entrar todo mês.">
          <label className="flex items-baseline justify-center gap-2 py-4">
            <span className="sr-only">Valor recebido por mês</span>
            <span className="font-display text-2xl text-muted">{symbol}</span>
            <input
              autoFocus
              inputMode="decimal"
              placeholder="0,00"
              value={income}
              onChange={(event) => {
                setIncome(event.target.value)
                setError(null)
              }}
              className="w-48 bg-transparent font-display text-4xl font-medium outline-none placeholder:text-line"
            />
          </label>
          <div>
            <p className="mb-2 text-sm font-medium text-muted">Em que dia?</p>
            <div className="flex flex-wrap gap-2">
              {PAYDAYS.map((option) => (
                <Chip
                  key={option}
                  selected={!customPayday && day === option}
                  onClick={() => {
                    setCustomPayday(false)
                    setPayday(option)
                  }}
                >
                  {option}
                </Chip>
              ))}
              <Chip selected={customPayday} onClick={() => setCustomPayday(true)}>
                Outro
              </Chip>
            </div>
            {customPayday && (
              <TextField
                className="mt-3"
                label="Dia do mês"
                type="number"
                min={1}
                max={31}
                value={payday ?? ''}
                onChange={(event) => setPayday(event.target.value ? Number(event.target.value) : null)}
              />
            )}
          </div>
        </Step>
      )}

      {step === 2 && (
        <Step title="Recebe algum extra durante o ano?" hint="Toque para adicionar. Dá para mudar o valor e o mês.">
          <div className="flex flex-col gap-2">
            {extraPresets(currency).map((preset) => {
              const draft = extras.find((extra) => extra.key === preset.id)
              return (
                <div
                  key={preset.id}
                  className={cn('rounded-xl border', draft ? 'border-primary bg-accent-soft' : 'border-line')}
                >
                  <button
                    type="button"
                    aria-pressed={!!draft}
                    onClick={() => toggleExtra(preset)}
                    className={cn(
                      'flex w-full items-center justify-between px-4 py-3 text-left font-medium',
                      draft && 'text-accent-ink',
                    )}
                  >
                    {preset.title}
                    {draft ? <Check className="size-5" aria-hidden /> : <Plus className="size-5 text-muted" aria-hidden />}
                  </button>
                  {draft && (
                    <div className="flex flex-col gap-3 px-4 pb-3">
                      {draft.parts.map((part, index) => (
                        <ExtraPartFields
                          key={part.name}
                          symbol={symbol}
                          month={part.month}
                          amount={part.amount}
                          onMonth={(value) => updateExtraPart(draft.key, index, { month: value })}
                          onAmount={(value) => updateExtraPart(draft.key, index, { amount: value })}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            {extras
              .filter((extra) => extra.custom)
              .map((extra) => (
                <div key={extra.key} className="flex flex-col gap-3 rounded-xl border border-primary bg-accent-soft p-4">
                  <div className="flex items-end gap-2">
                    <TextField
                      className="flex-1"
                      label="Nome"
                      maxLength={60}
                      value={extra.parts[0].name}
                      onChange={(event) => updateExtraPart(extra.key, 0, { name: event.target.value })}
                    />
                    <RemoveButton
                      label="Remover extra"
                      onClick={() => setExtras((current) => current.filter((other) => other.key !== extra.key))}
                    />
                  </div>
                  <ExtraPartFields
                    symbol={symbol}
                    month={extra.parts[0].month}
                    amount={extra.parts[0].amount}
                    onMonth={(value) => updateExtraPart(extra.key, 0, { month: value })}
                    onAmount={(value) => updateExtraPart(extra.key, 0, { amount: value })}
                  />
                </div>
              ))}

            <button
              type="button"
              onClick={addCustomExtra}
              className="flex items-center justify-between rounded-xl border border-dashed border-line px-4 py-3 text-left text-muted hover:bg-subtle"
            >
              Outro extra
              <Plus className="size-5" aria-hidden />
            </button>
          </div>
        </Step>
      )}

      {step === 3 && (
        <Step title="O que você paga todo mês?" hint="Toque no que tiver e informe o valor.">
          <div className="flex flex-wrap gap-2">
            {fixedPresets(currency).map((preset) => (
              <Chip
                key={preset.name}
                selected={bills.some((bill) => bill.key === preset.name)}
                onClick={() => toggleBill(preset)}
              >
                {preset.name}
              </Chip>
            ))}
            <Chip selected={false} onClick={addCustomBill}>
              + Outro
            </Chip>
          </div>

          {bills.map((bill) => (
            <div key={bill.key} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3">
              <div className="flex items-end gap-2">
                {bill.custom ? (
                  <TextField
                    className="flex-1"
                    label="Nome"
                    maxLength={60}
                    value={bill.name}
                    onChange={(event) => updateBill(bill.key, { name: event.target.value })}
                  />
                ) : (
                  <p className="flex-1 pb-0.5 font-medium">{bill.name}</p>
                )}
                <RemoveButton
                  label={`Remover ${bill.name || 'gasto'}`}
                  onClick={() => setBills((current) => current.filter((other) => other.key !== bill.key))}
                />
              </div>
              <div className="grid grid-cols-[1fr_5.5rem] gap-2">
                <TextField
                  label={`Valor (${symbol})`}
                  inputMode="decimal"
                  placeholder="0,00"
                  value={bill.amount}
                  onChange={(event) => updateBill(bill.key, { amount: event.target.value })}
                />
                <TextField
                  label="Dia"
                  type="number"
                  min={1}
                  max={31}
                  value={bill.day}
                  onChange={(event) => updateBill(bill.key, { day: event.target.value })}
                />
              </div>
            </div>
          ))}

          {left !== null && (
            <div className="rounded-xl bg-accent-soft px-4 py-3 text-accent-ink">
              <p className="text-sm">{left < 0 ? 'Os gastos fixos passam da sua renda em' : 'Para o resto do mês, sobram cerca de'}</p>
              <p className="font-display text-2xl font-medium tabular-nums">{formatMoney(Math.abs(left), currency)}</p>
            </div>
          )}
        </Step>
      )}

      <div className="mt-auto flex flex-col gap-2 pt-2">
        {error && (
          <p role="alert" className="text-sm text-expense">
            {error}
          </p>
        )}
        <Button type="submit" block disabled={saving}>
          {saving ? 'Preparando…' : step === LAST_STEP ? 'Começar a usar' : 'Continuar'}
        </Button>
        {step > 0 && (
          <Button variant="ghost" size="sm" block onClick={skip} disabled={saving}>
            {step === 1 ? 'Minha renda varia, pular' : step === 2 ? 'Não recebo, pular' : 'Pular por agora'}
          </Button>
        )}
      </div>
    </form>
  )
}

function Step({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <header>
        <h1 className="font-display text-2xl leading-tight font-medium">{title}</h1>
        <p className="mt-1 text-sm text-muted">{hint}</p>
      </header>
      {children}
    </section>
  )
}

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'min-w-10 rounded-full border px-3 py-1.5 text-sm',
        selected ? 'border-primary bg-accent-soft text-accent-ink' : 'border-line hover:bg-subtle',
      )}
    >
      {children}
    </button>
  )
}

function ExtraPartFields({
  symbol,
  month,
  amount,
  onMonth,
  onAmount,
}: {
  symbol: string
  month: number
  amount: string
  onMonth: (month: number) => void
  onAmount: (amount: string) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <TextField
        label={`Valor (${symbol})`}
        inputMode="decimal"
        placeholder="0,00"
        value={amount}
        onChange={(event) => onAmount(event.target.value)}
      />
      <SelectField label="Mês" value={month} onChange={(event) => onMonth(Number(event.target.value))}>
        {MONTH_NAMES.map((name, index) => (
          <option key={name} value={index + 1}>
            {name}
          </option>
        ))}
      </SelectField>
    </div>
  )
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="rounded-lg p-2 text-muted hover:bg-subtle">
      <X className="size-4" aria-hidden />
    </button>
  )
}
