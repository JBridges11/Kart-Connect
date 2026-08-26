import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Subscription } from '@/types'

export function useSubscription() {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!user) { setLoading(false); return }

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code === 'PGRST116') {
      // No row — create trial on first login
      const { data: created } = await supabase
        .from('subscriptions')
        .insert({ user_id: user.id, trial_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() })
        .select()
        .single()
      setSubscription(created)
    } else {
      setSubscription(data)
    }
    setLoading(false)
  }, [user])

  useEffect(() => { void fetch() }, [fetch])

  const isActive = subscription
    ? subscription.status === 'active' ||
      (subscription.status === 'trialing' && new Date(subscription.trial_end) > new Date())
    : false

  const trialDaysLeft = subscription?.status === 'trialing'
    ? Math.max(0, Math.ceil(
        (new Date(subscription.trial_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      ))
    : null

  const tier = (isActive ? subscription?.tier : null) ?? null

  return { subscription, loading, isActive, tier, trialDaysLeft, refetch: fetch }
}
