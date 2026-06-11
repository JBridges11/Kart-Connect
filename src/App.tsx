import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { SubscriptionGate } from '@/components/SubscriptionGate'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomTabBar } from '@/components/layout/BottomTabBar'

import { LoginPage }         from '@/pages/Login'
import { RegisterPage }      from '@/pages/Register'
import { SubscribePage }     from '@/pages/Subscribe'
import { DashboardPage }     from '@/pages/Dashboard'
import { EventDetailPage }   from '@/pages/EventDetail'
import { NewSessionPage }    from '@/pages/NewSession'
import { SessionDetailPage } from '@/pages/SessionDetail'
import { TracksPage }        from '@/pages/Tracks'
import { ComparePage }       from '@/pages/Compare'
import { GaragePage }        from '@/pages/Garage'
import { AnalyticsPage }     from '@/pages/Analytics'
import { SettingsPage }      from '@/pages/Settings'

function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      {children}
    </div>
  )
}

function ProtectedLayout() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="flex h-screen bg-bg-primary overflow-hidden">
      <Sidebar />
      <Outlet />
      <BottomTabBar />
    </div>
  )
}

const router = createBrowserRouter([
  {
    path: '/login',
    element: <AuthLayout><LoginPage /></AuthLayout>,
  },
  {
    path: '/register',
    element: <AuthLayout><RegisterPage /></AuthLayout>,
  },
  {
    path: '/',
    element: <ProtectedLayout />,
    children: [
      // Accessible to logged-in users regardless of subscription status
      { path: 'subscribe', element: <SubscribePage /> },
      // All other routes require an active subscription
      {
        element: <SubscriptionGate />,
        children: [
          { index: true,                         element: <DashboardPage /> },
          { path: 'events/:trackId/:date',       element: <EventDetailPage /> },
          { path: 'sessions/new',      element: <NewSessionPage /> },
          { path: 'sessions/:id',      element: <SessionDetailPage /> },
          { path: 'tracks',            element: <TracksPage /> },
          { path: 'compare',           element: <ComparePage /> },
          { path: 'garage',            element: <GaragePage /> },
          { path: 'analytics',         element: <AnalyticsPage /> },
          { path: 'settings',          element: <SettingsPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}
