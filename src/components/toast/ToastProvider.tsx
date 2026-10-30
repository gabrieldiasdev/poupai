import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { ToastContext, type ToastApi } from './toastContext'

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const show = useCallback((text: string, error: boolean) => {
    window.clearTimeout(timer.current)
    setMessage({ text, error })
    timer.current = window.setTimeout(() => setMessage(null), 4000)
  }, [])

  const api = useMemo<ToastApi>(
    () => ({
      info: (text) => show(text, false),
      error: (text) => show(text, true),
      background: (promise, failure) => {
        promise.catch((error: unknown) => {
          console.error(error)
          show(failure, true)
        })
      },
    }),
    [show],
  )

  return (
    <ToastContext value={api}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4">
        {message && (
          <p
            role={message.error ? 'alert' : 'status'}
            className={`rounded-xl px-4 py-2.5 text-sm font-medium shadow-lg ${
              message.error ? 'bg-expense text-white' : 'bg-ink text-canvas'
            }`}
          >
            {message.text}
          </p>
        )}
      </div>
    </ToastContext>
  )
}
