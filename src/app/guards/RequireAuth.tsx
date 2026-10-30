import { Navigate, Outlet, useLocation } from 'react-router'
import { FullScreenLoader } from '@/components/ui/Spinner'
import { useAuth } from '@/features/auth/authContext'
import { DataProvider } from '@/features/data/DataProvider'

export function RequireAuth() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <FullScreenLoader />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return (
    <DataProvider uid={user.uid}>
      <Outlet />
    </DataProvider>
  )
}
