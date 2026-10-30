import { X } from 'lucide-react'
import { useEffect, useRef, type FormEvent, type ReactNode } from 'react'

interface SheetProps {
  open: boolean
  title: string
  onClose: () => void
  /** When given, the sheet is a form and its footer buttons submit it. */
  onSubmit?: () => void
  footer?: ReactNode
  children: ReactNode
}

/** A bottom sheet on phones and a centred dialog on larger screens, built on the native <dialog>. */
export function Sheet({ open, title, onClose, onSubmit, footer, children }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      // showModal() focuses the first focusable element (the close button); move focus to the field
      // the sheet asked for instead. React's autoFocus runs before the dialog opens, so it can't.
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onSubmit?.()
  }

  const content = (
    <>
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="text-base font-semibold">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Fechar" className="-mr-1 rounded-lg p-1.5 hover:bg-subtle">
          <X className="size-5" aria-hidden />
        </button>
      </header>
      <div className="overflow-y-auto px-4 py-4">{children}</div>
      {footer && <footer className="border-t border-line px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</footer>}
    </>
  )

  return (
    // A click on the backdrop lands on the dialog itself; Escape is handled natively by <dialog>.
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={ref}
      className="sheet"
      aria-label={title}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose()
      }}
    >
      {open &&
        (onSubmit ? (
          <form onSubmit={handleSubmit} className="flex max-h-[92dvh] flex-col">
            {content}
          </form>
        ) : (
          <div className="flex max-h-[92dvh] flex-col">{content}</div>
        ))}
    </dialog>
  )
}
