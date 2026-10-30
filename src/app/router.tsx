import { createBrowserRouter, Navigate } from 'react-router'
import { LoginPage } from '@/features/auth/LoginPage'
import { GoalsPage } from '@/features/goals/GoalsPage'
import { HomePage } from '@/features/home/HomePage'
import { OnboardingPage } from '@/features/onboarding/OnboardingPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { TransactionsPage } from '@/features/transactions/TransactionsPage'
import { RequireAuth } from './guards/RequireAuth'
import { RequireSetup } from './guards/RequireSetup'
import { AppLayout } from './layouts/AppLayout'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      { path: '/bem-vindo', element: <OnboardingPage /> },
      {
        element: <RequireSetup />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { path: '/', element: <HomePage /> },
              { path: '/lancamentos', element: <TransactionsPage /> },
              { path: '/metas', element: <GoalsPage /> },
              { path: '/ajustes', element: <SettingsPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
