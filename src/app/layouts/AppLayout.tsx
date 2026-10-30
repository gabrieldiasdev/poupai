import { House, List, Plus, Settings, Target, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet } from 'react-router'
import { ToastProvider } from '@/components/toast/ToastProvider'
import { EntrySheetContext, type EntrySheetRequest } from '@/features/transactions/entrySheetContext'
import { TransactionSheet } from '@/features/transactions/TransactionSheet'
import { cn } from '@/lib/cn'

interface Tab {
  to: string
  label: string
  icon: LucideIcon
}

const leftTabs: Tab[] = [
  { to: '/', label: 'Início', icon: House },
  { to: '/lancamentos', label: 'Lançamentos', icon: List },
]

const rightTabs: Tab[] = [
  { to: '/metas', label: 'Metas', icon: Target },
  { to: '/ajustes', label: 'Ajustes', icon: Settings },
]

export function AppLayout() {
  // A counter in the key remounts the sheet on every open, so it always starts from fresh values.
  const [entry, setEntry] = useState<{ request: EntrySheetRequest; key: number } | null>(null)
  const openEntry = (request: EntrySheetRequest = {}) => setEntry((current) => ({ request, key: (current?.key ?? 0) + 1 }))

  return (
    <ToastProvider>
      <EntrySheetContext value={openEntry}>
        <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
          <main className="flex-1 pb-24">
            <Outlet />
          </main>

          <nav
            aria-label="Navegação principal"
            className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
          >
            <ul className="mx-auto flex max-w-xl items-center">
              {leftTabs.map((tab) => (
                <TabLink key={tab.to} {...tab} />
              ))}
              <li className="flex flex-1 justify-center">
                <button
                  type="button"
                  onClick={() => openEntry()}
                  aria-label="Novo lançamento"
                  className="flex size-12 items-center justify-center rounded-full bg-primary text-on-primary shadow-md hover:bg-primary-hover"
                >
                  <Plus className="size-6" aria-hidden />
                </button>
              </li>
              {rightTabs.map((tab) => (
                <TabLink key={tab.to} {...tab} />
              ))}
            </ul>
          </nav>
        </div>

        {entry && (
          <TransactionSheet
            key={entry.key}
            transaction={entry.request.transaction}
            preset={entry.request.preset}
            onClose={() => setEntry(null)}
          />
        )}
      </EntrySheetContext>
    </ToastProvider>
  )
}

function TabLink({ to, label, icon: Icon }: Tab) {
  return (
    <li className="flex-1">
      <NavLink
        to={to}
        end
        className={({ isActive }) =>
          cn(
            'flex h-16 flex-col items-center justify-center gap-0.5 text-[11px] font-medium',
            isActive ? 'text-primary' : 'text-muted hover:text-ink',
          )
        }
      >
        <Icon className="size-5" aria-hidden />
        {label}
      </NavLink>
    </li>
  )
}
