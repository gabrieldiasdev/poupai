import { ChevronRight, Landmark, LogOut, Plus, Repeat } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { PageHeader, SectionTitle } from '@/components/PageHeader'
import { useToast } from '@/components/toast/toastContext'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Field'
import { updateProfile } from '@/data/repository'
import { MONTH_NAMES } from '@/domain/dates'
import type { Account, Recurrence } from '@/domain/model'
import { formatMoney } from '@/domain/money'
import { useCurrentUser } from '@/features/auth/authContext'
import { signOut } from '@/features/auth/authService'
import { useData } from '@/features/data/dataContext'
import { AccountSheet } from './AccountSheet'
import { RecurrenceSheet } from './RecurrenceSheet'

export function SettingsPage() {
  const user = useCurrentUser()
  const { uid, accounts, recurrences, accountById, brlPerEur } = useData()
  const toast = useToast()
  const [account, setAccount] = useState<{ account?: Account } | null>(null)
  const [recurrence, setRecurrence] = useState<{ recurrence?: Recurrence } | null>(null)
  const [rate, setRate] = useState(brlPerEur.toFixed(2).replace('.', ','))
  const hasBrl = accounts.some((candidate) => candidate.currency === 'BRL')

  function saveRate() {
    const value = Number(rate.replace(',', '.'))
    if (!(value > 0)) {
      toast.error('Câmbio inválido.')
      return
    }
    toast.background(updateProfile(uid, { brlPerEur: value }), 'Não foi possível guardar o câmbio.')
    toast.info('Câmbio atualizado.')
  }

  return (
    <div>
      <PageHeader title="Ajustes" />

      <div className="flex flex-col gap-6 px-4">
        <section>
          <SectionTitle
            action={
              <Button size="sm" variant="ghost" onClick={() => setRecurrence({})}>
                <Plus className="size-4" aria-hidden />
                Adicionar
              </Button>
            }
          >
            Recorrentes
          </SectionTitle>
          <List empty="Cadastre o salário, os subsídios e as contas fixas para o app prever o seu mês.">
            {recurrences.map((item) => (
              <Row
                key={item.id}
                icon={<Repeat className="size-4" aria-hidden />}
                title={item.name}
                detail={`Dia ${item.day} · ${item.months ? item.months.map((m) => MONTH_NAMES[m - 1].slice(0, 3)).join(', ') : 'todo mês'}`}
                value={
                  <span className={item.type === 'income' ? 'text-income' : undefined}>
                    {item.type === 'income' ? '+' : '−'}
                    {formatMoney(item.amount, accountById.get(item.accountId)?.currency)}
                  </span>
                }
                onClick={() => setRecurrence({ recurrence: item })}
              />
            ))}
          </List>
        </section>

        <section>
          <SectionTitle
            action={
              <Button size="sm" variant="ghost" onClick={() => setAccount({})}>
                <Plus className="size-4" aria-hidden />
                Adicionar
              </Button>
            }
          >
            Contas
          </SectionTitle>
          <List empty="Nenhuma conta.">
            {accounts.map((item) => (
              <Row
                key={item.id}
                icon={<Landmark className="size-4" aria-hidden />}
                title={item.name}
                detail={item.currency === 'EUR' ? 'Euro' : 'Real brasileiro'}
                onClick={() => setAccount({ account: item })}
              />
            ))}
          </List>
        </section>

        {hasBrl && (
          <section>
            <SectionTitle>Câmbio</SectionTitle>
            <form
              className="flex items-end gap-2 rounded-xl border border-line bg-surface p-3"
              onSubmit={(event) => {
                event.preventDefault()
                saveRate()
              }}
            >
              <TextField
                className="flex-1"
                label="1 € vale quantos reais"
                inputMode="decimal"
                value={rate}
                onChange={(event) => setRate(event.target.value)}
                hint="Atualiza sozinho sempre que você registra uma transferência de euros para reais."
              />
              <Button type="submit" variant="secondary" className="mb-5">
                Guardar
              </Button>
            </form>
          </section>
        )}

        <section>
          <SectionTitle>Conta</SectionTitle>
          <div className="flex items-center justify-between rounded-xl border border-line bg-surface p-3">
            <span className="min-w-0 truncate text-sm">{user.email}</span>
            <Button size="sm" variant="ghost" onClick={() => signOut()}>
              <LogOut className="size-4" aria-hidden />
              Sair
            </Button>
          </div>
        </section>
      </div>

      {account && <AccountSheet account={account.account} onClose={() => setAccount(null)} />}
      {recurrence && <RecurrenceSheet recurrence={recurrence.recurrence} onClose={() => setRecurrence(null)} />}
    </div>
  )
}

function List({ empty, children }: { empty: string; children: ReactNode[] }) {
  if (children.length === 0) {
    return <p className="rounded-xl border border-dashed border-line px-4 py-5 text-center text-sm text-muted">{empty}</p>
  }
  return <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">{children}</ul>
}

function Row({
  icon,
  title,
  detail,
  value,
  onClick,
}: {
  icon: ReactNode
  title: string
  detail: string
  value?: ReactNode
  onClick: () => void
}) {
  return (
    <li>
      <button type="button" onClick={onClick} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-subtle">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-subtle">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{title}</span>
          <span className="block truncate text-xs text-muted">{detail}</span>
        </span>
        {value && <span className="shrink-0 text-sm font-semibold tabular-nums">{value}</span>}
        <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
      </button>
    </li>
  )
}
