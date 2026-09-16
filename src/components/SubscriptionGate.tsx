import { Navigate, Outlet } from 'react-router-dom'
import { useSubscription } from '@/hooks/useSubscription'

export function SubscriptionGate() {
  const { subscription, loading } = useSubscription()

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center flex-1">
        <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const hasAccess = !!subscription?.stripe_subscription_id &&
    (subscription.status === 'active' || subscription.status === 'trialing')
  console.log('[SubscriptionGate] hasAccess:', hasAccess, '| stripe_subscription_id:', subscription?.stripe_subscription_id ?? null, '| status:', subscription?.status ?? null, '| tier:', subscription?.tier ?? null)
  if (!hasAccess) {
    console.warn('[SubscriptionGate] → redirecting to /subscribe — subscription does not qualify:', JSON.stringify(subscription))
    return <Navigate to="/subscribe" replace />
  }

  return <Outlet />
}
