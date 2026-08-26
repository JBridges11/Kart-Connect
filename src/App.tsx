import { useState, useEffect, useRef } from 'react'
import { createBrowserRouter, RouterProvider, Navigate, Outlet, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { useSubscription } from '@/hooks/useSubscription'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { TeamBrandingProvider } from '@/contexts/TeamBrandingContext'
import { OfflineBanner } from '@/components/OfflineBanner'
import { SplashScreen } from '@/components/SplashScreen'
import { LanguagePickerPage } from '@/pages/LanguagePicker'
import { SubscriptionGate } from '@/components/SubscriptionGate'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomTabBar } from '@/components/layout/BottomTabBar'

import { LoginPage }                from '@/pages/Login'
import { SubscribePage }            from '@/pages/Subscribe'
import { DashboardPage }            from '@/pages/Dashboard'
import { EventDetailPage }          from '@/pages/EventDetail'
import { NewSessionPage }           from '@/pages/NewSession'
import { SessionDetailPage }        from '@/pages/SessionDetail'
import { TracksPage }               from '@/pages/Tracks'
import { TrackDetailPage }          from '@/pages/TrackDetail'
import { ComparePage }              from '@/pages/Compare'
import { GaragePage }               from '@/pages/Garage'
import { AnalyticsPage }            from '@/pages/Analytics'
import { SettingsPage }             from '@/pages/Settings'
import { CreateRaceWeekendPage }    from '@/pages/CreateRaceWeekend'
import { RaceWeekendDetailPage }    from '@/pages/RaceWeekendDetail'
import { LiveSetupPage }            from '@/pages/LiveSetup'
import { DataComparisonPage }       from '@/pages/DataComparison'

function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      {children}
    </div>
  )
}

function ProtectedLayout() {
  const { user, loading, freshConfirmation } = useAuth()
  const { subscription, loading: subLoading } = useSubscription()
  const navigate = useNavigate()
  const didRedirect = useRef(false)

  useEffect(() => {
    if (didRedirect.current || loading || !user || !freshConfirmation) return
    if (subLoading) return
    didRedirect.current = true
    if (subscription?.status !== 'active') {
      navigate('/subscribe', { replace: true })
    }
  }, [loading, subLoading, user, subscription, freshConfirmation, navigate])

  if (loading || (freshConfirmation && subLoading)) {
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

function AuthOnlyLayout() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return <Outlet />
}

const router = createBrowserRouter([
  {
    path: '/login',
    element: <AuthLayout><LoginPage /></AuthLayout>,
  },
  {
    // /register shows the same combined auth page with Create Account tab pre-selected
    path: '/register',
    element: <AuthLayout><LoginPage defaultMode="register" /></AuthLayout>,
  },
  {
    path: '/subscribe',
    element: <AuthOnlyLayout />,
    children: [
      { index: true, element: <SubscribePage /> },
    ],
  },
  {
    path: '/',
    element: <ProtectedLayout />,
    children: [
      {
        element: <SubscriptionGate />,
        children: [
          { index: true,                    element: <DashboardPage /> },
          { path: 'events/:eventId',        element: <EventDetailPage /> },
          { path: 'sessions/new',           element: <NewSessionPage /> },
          { path: 'sessions/:id',           element: <SessionDetailPage /> },
          { path: 'tracks',                 element: <TracksPage /> },
          { path: 'tracks/:id',             element: <TrackDetailPage /> },
          { path: 'compare',                element: <ComparePage /> },
          { path: 'garage',                 element: <GaragePage /> },
          { path: 'analytics',              element: <AnalyticsPage /> },
          { path: 'settings',               element: <SettingsPage /> },
          { path: 'race-weekend/new',       element: <CreateRaceWeekendPage /> },
          { path: 'race-weekend/:id',       element: <RaceWeekendDetailPage /> },
          { path: 'data-comparison',        element: <DataComparisonPage /> },
        ],
      },
    ],
  },
  { path: '/live/:token', element: <LiveSetupPage /> },
  { path: '*', element: <Navigate to="/" replace /> },
])

type Step = 'splash' | 'language' | 'app'

function AppShell() {
  const languageChosen = !!localStorage.getItem('kc_language_chosen')
  const isLiveRoute = window.location.pathname.startsWith('/live/')

  const [step, setStep] = useState<Step>(isLiveRoute ? 'app' : 'splash')

  function onSplashDone() {
    setStep(languageChosen ? 'app' : 'language')
  }

  if (step === 'splash') return <SplashScreen onDone={onSplashDone} />
  if (step === 'language') return <LanguagePickerPage onDone={() => setStep('app')} />
  return <RouterProvider router={router} />
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <TeamBrandingProvider>
          <OfflineBanner />
          <AppShell />
        </TeamBrandingProvider>
      </AuthProvider>
    </LanguageProvider>
  )
}
