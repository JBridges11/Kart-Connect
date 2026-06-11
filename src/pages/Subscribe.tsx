import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle, Zap, BarChart2, Settings, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useSubscription } from '@/hooks/useSubscription'

const FEATURES = [
  { icon: Zap,       text: 'Unlimited session logging' },
  { icon: Settings,  text: 'Full setup management across all tabs' },
  { icon: BarChart2, text: 'Lap time analytics and charts' },
  { icon: CheckCircle, text: 'Side-by-side session comparison' },
  { icon: Clock,     text: 'Setup history across every track' },
]

export function SubscribePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { subscription, trialDaysLeft, refetch } = useSubscription()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isSuccess = searchParams.get('subscription') === 'success'

  // After Stripe redirect, wait briefly for webhook then go to dashboard
  useEffect(() => {
    if (!isSuccess) return
    const timer = setTimeout(async () => {
      await refetch()
      navigate('/', { replace: true })
    }, 3500)
    return () => clearTimeout(timer)
  }, [isSuccess, refetch, navigate])

  async function handleSubscribe() {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('create-checkout-session')
      if (fnErr) throw new Error(fnErr.message)
      window.location.href = (data as { url: string }).url
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-accent-primary/10 flex items-center justify-center mx-auto">
            <CheckCircle size={32} className="text-accent-primary" />
          </div>
          <h1 className="font-heading text-2xl font-bold uppercase tracking-wide text-text-primary">
            You're in the paddock
          </h1>
          <p className="text-text-muted">Setting up your subscription…</p>
          <div className="w-6 h-6 border-2 border-accent-primary border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    )
  }

  const statusLabel = (() => {
    if (!subscription) return null
    if (subscription.status === 'past_due') return 'Your last payment failed. Subscribe again to restore access.'
    if (subscription.status === 'canceled') return 'Your subscription has been cancelled.'
    if (subscription.status === 'trialing' && trialDaysLeft !== null && trialDaysLeft <= 0)
      return 'Your free trial has ended.'
    if (subscription.status === 'trialing' && trialDaysLeft !== null && trialDaysLeft > 0)
      return `Your free trial ends in ${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'}.`
    return null
  })()

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">

        {/* Header */}
        <div className="text-center">
          <h1 className="font-heading text-3xl font-bold uppercase tracking-widest text-accent-primary">
            Kart Connect
          </h1>
          <p className="text-text-muted mt-1">Setup management for serious racers</p>
        </div>

        {/* Status banner */}
        {statusLabel && (
          <div className="bg-accent-secondary/10 border border-accent-secondary/30 rounded-card px-4 py-3 text-sm text-text-primary text-center">
            {statusLabel}
          </div>
        )}

        {/* Pricing card */}
        <div className="bg-bg-card border border-border-color rounded-card p-6 space-y-6">
          <div className="flex items-end gap-1">
            <span className="font-heading text-4xl font-bold text-text-primary">£11.99</span>
            <span className="text-text-muted mb-1">/month</span>
          </div>

          <div className="bg-accent-primary/10 border border-accent-primary/20 rounded px-3 py-2 text-sm text-accent-primary font-semibold text-center">
            3-day free trial included
          </div>

          <ul className="space-y-3">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-text-primary">
                <Icon size={16} className="text-accent-primary flex-shrink-0" />
                {text}
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => void handleSubscribe()}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-accent-primary text-bg-primary font-heading font-bold uppercase tracking-wider rounded-card text-sm disabled:opacity-60 cursor-pointer"
          >
            {loading
              ? <><span className="w-4 h-4 border-2 border-bg-primary border-t-transparent rounded-full animate-spin" /> Redirecting to Stripe…</>
              : 'Start Free Trial'
            }
          </button>

          {error && (
            <p className="text-accent-secondary text-sm text-center">{error}</p>
          )}

          <p className="text-xs text-text-muted text-center">
            Secure payment via Stripe. Cancel any time.
          </p>
        </div>

      </div>
    </div>
  )
}
