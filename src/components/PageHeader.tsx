import type { ReactNode } from 'react'

export function PageHeader({ title, action }: { title: ReactNode; action?: ReactNode }) {
  return (
    <header className="flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-2">
      <h1 className="font-display text-2xl font-medium">{title}</h1>
      {action}
    </header>
  )
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <h2 className="text-sm font-medium text-muted">{children}</h2>
      {action}
    </div>
  )
}
