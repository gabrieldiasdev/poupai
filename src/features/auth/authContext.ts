import type { User } from 'firebase/auth'
import { createContext, use } from 'react'

export interface AuthState {
  user: User | null
  loading: boolean
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const context = use(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

/** For screens rendered behind RequireAuth, where a signed-in user is guaranteed. */
export function useCurrentUser(): User {
  const { user } = useAuth()
  if (!user) throw new Error('useCurrentUser requires an authenticated route')
  return user
}
