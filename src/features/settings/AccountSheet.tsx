import { useState } from 'react'
import { useToast } from '@/components/toast/toastContext'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Field'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Sheet } from '@/components/ui/Sheet'
import { newId, saveAccount } from '@/data/repository'
import type { Account, Currency } from '@/domain/model'
import { useData } from '@/features/data/dataContext'

export function AccountSheet({ account, onClose }: { account?: Account; onClose: () => void }) {
  const { uid } = useData()
  const toast = useToast()
  const [name, setName] = useState(account?.name ?? '')
  const [currency, setCurrency] = useState<Currency>(account?.currency ?? 'EUR')
  const [error, setError] = useState<string | null>(null)

  function save() {
    if (!name.trim()) return setError('Dê um nome à conta.')
    toast.background(
      saveAccount(uid, { id: account?.id ?? newId(uid, 'accounts'), name: name.trim(), currency }),
      'Não foi possível guardar a conta.',
    )
    onClose()
  }

  return (
    <Sheet
      open
      title={account ? 'Editar conta' : 'Nova conta'}
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
        <TextField
          label="Nome"
          maxLength={60}
          placeholder="Bankinter, Revolut, Dinheiro…"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        {/* Changing the currency later would reinterpret every amount already stored in the account. */}
        {!account && (
          <SegmentedControl
            label="Moeda"
            value={currency}
            onChange={setCurrency}
            options={[
              { value: 'EUR', label: 'Euro (€)' },
              { value: 'BRL', label: 'Real (R$)' },
            ]}
          />
        )}
      </div>
    </Sheet>
  )
}
