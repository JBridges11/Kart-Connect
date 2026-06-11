import { Navigate, Outlet } from 'react-router-dom'
import { useSubscription } from '@/hooks/useSubscription'

export function SubscriptionGate() {
  const { loading, isActive } = useSubscription()

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-bg-primary">
        <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isActive) return <Navigate to="/subscribe" replace />

  return <Outlet />
}
