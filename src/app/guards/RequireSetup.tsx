import { Navigate, Outlet } from 'react-router'
import { FullScreenLoader } from '@/components/ui/Spinner'
import { useData } from '@/features/data/dataContext'

/** Sends people who haven't finished onboarding to it before they reach the app. */
export function RequireSetup() {
  const { loading, profile } = useData()

  if (loading) return <FullScreenLoader />
  if (!profile?.onboarded) return <Navigate to="/bem-vindo" replace />
  return <Outlet />
}
