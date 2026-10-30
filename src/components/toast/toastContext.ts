import { createContext, use } from 'react'

export interface ToastApi {
  info: (text: string) => void
  error: (text: string) => void
  /**
   * Runs a write without waiting for it. Firestore applies writes locally at once and only resolves
   * when the server confirms, which never happens offline, so screens must not block on it.
   */
  background: (promise: Promise<unknown>, failure: string) => void
}

export const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const context = use(ToastContext)
  if (!context) throw new Error('useToast must be used within ToastProvider')
  return context
}
