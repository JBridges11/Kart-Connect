import { Navigate, Outlet } from 'react-router-dom'
import { useSubscription } from '@/hooks/useSubscription'

export function SubscriptionGate() {
  const { subscription, loading, isActive } = useSubscription()

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center flex-1">
        <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // isActive: status='active' OR (status='trialing' AND trial_end > now())
  // On native the /subscribe page shows "No active subscription" + Sign out.
  if (!isActive) {
    console.warn('[SubscriptionGate] → redirecting to /subscribe | status:', subscription?.status ?? null)
    return <Navigate to="/subscribe" replace />
  }

  return <Outlet />
}
