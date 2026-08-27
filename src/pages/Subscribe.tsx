import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckCircle, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useSubscription } from '@/hooks/useSubscription'

type Tier = 'privateer' | 'team' | 'pro_team'
type Interval = 'month' | 'year'

const TIERS: {
  id: Tier
  name: string
  monthlyPrice: string
  annualPrice: string
  annualMonthly: string
  tagline: string
  highlight: boolean
  features: string[]
}[] = [
  {
    id: 'privateer',
    name: 'Privateer',
    monthlyPrice: '£12.99',
    annualPrice: '£124.99',
    annualMonthly: '£10.42',
    tagline: 'For the solo racer',
    highlight: false,
    features: [
      'Single driver, single kart',
      'Full setup logging',
      'Dashboard scanner',
      'Stagger tool',
      'All analysis features',
    ],
  },
  {
    id: 'team',
    name: 'Team',
    monthlyPrice: '£29.99',
    annualPrice: '£287.99',
    annualMonthly: '£24.00',
    tagline: 'For small racing teams',
    highlight: true,
    features: [
      'Up to 5 drivers',
      'Multi-kart management',
      'Shared baseline library',
      'Team manager view',
      'All Privateer features',
    ],
  },
  {
    id: 'pro_team',
    name: 'Pro Team',
    monthlyPrice: '£49.99',
    annualPrice: '£479.99',
    annualMonthly: '£40.00',
    tagline: 'For professional operations',
    highlight: false,
    features: [
      'Up to 30 drivers',
      'Priority support',
      'White-label setup sheets with team branding & logo',
      'Advanced analytics across whole team roster',
      'All Team features',
    ],
  },
]

export function SubscribePage() {
  const [searchParams] = useSearchParams()
  useAuth()
  const { subscription, trialDaysLeft } = useSubscription()
  const [interval, setInterval] = useState<Interval>('month')
  const [loadingTier, setLoadingTier] = useState<Tier | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isSuccess = searchParams.get('subscription') === 'success'
  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    if (!isSuccess) return
    async function verify() {
      if (sessionId) {
        const { data: { session: freshSession } } = await supabase.auth.getSession()
        const { error: fnErr } = await supabase.functions.invoke('verify-subscription', {
          body: { session_id: sessionId },
          headers: freshSession?.access_token
            ? { Authorization: `Bearer ${freshSession.access_token}` }
            : undefined,
        })
        if (fnErr) {
          let msg = fnErr.message
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const body = await (fnErr as any).context?.json()
            if (body?.error) msg = body.error
          } catch { /* ignore */ }
          console.error('[verify] failed:', msg)
        }
      }
      // Full reload so ProtectedLayout re-evaluates with fresh DB data
      window.location.replace('/')
    }
    const timer = setTimeout(() => void verify(), 1500)
    return () => clearTimeout(timer)
  }, [isSuccess, sessionId])

  async function handleSubscribe(tier: Tier) {
    setLoadingTier(tier)
    setError(null)
    try {
      const { data: { session: freshSession } } = await supabase.auth.getSession()
      console.log('[subscribe] session token present:', !!freshSession?.access_token)
      const { data, error: fnErr } = await supabase.functions.invoke('create-checkout-session', {
        body: { tier, interval },
        headers: freshSession?.access_token
          ? { Authorization: `Bearer ${freshSession.access_token}` }
          : undefined,
      })
      if (fnErr) {
        let message = fnErr.message
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const body = await (fnErr as any).context?.json()
          if (body?.error) message = body.error
        } catch { /* ignore */ }
        throw new Error(message)
      }
      window.location.href = (data as { url: string }).url
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setLoadingTier(null)
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
    if (subscription.status === 'past_due') return 'Your last payment failed. Choose a plan below to restore access.'
    if (subscription.status === 'canceled') return 'Your subscription has been cancelled. Choose a plan to re-subscribe.'
    if (subscription.status === 'trialing' && trialDaysLeft !== null && trialDaysLeft <= 0)
      return 'Your 30-day free trial has ended. Choose a plan to continue.'
    if (subscription.status === 'trialing' && trialDaysLeft !== null && trialDaysLeft > 0)
      return `Your free trial ends in ${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'}.`
    return null
  })()

  return (
    <div className="h-screen bg-bg-primary flex flex-col items-center justify-center p-4 overflow-hidden">
      <div className="w-full max-w-5xl flex flex-col gap-5">

        {/* Header */}
        <div className="flex flex-col items-center text-center gap-3">
          <img src="/logo-pdf.png" alt="Kart Connect" className="w-40 object-contain mb-1" />
          <h1 className="font-heading text-2xl font-bold uppercase tracking-wide text-text-primary">
            Choose your plan
          </h1>
          <p className="text-text-muted text-sm">30-day free trial on Privateer. Cancel any time.</p>

          {/* Billing toggle */}
          <div className="flex items-center gap-1 bg-bg-elevated border border-border-color rounded-full p-1 mt-1">
            <button
              type="button"
              onClick={() => setInterval('month')}
              className={[
                'px-4 py-1.5 rounded-full text-xs font-heading font-bold uppercase tracking-wider transition-all cursor-pointer',
                interval === 'month'
                  ? 'bg-accent-primary text-bg-primary'
                  : 'text-text-muted hover:text-text-primary',
              ].join(' ')}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setInterval('year')}
              className={[
                'flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-heading font-bold uppercase tracking-wider transition-all cursor-pointer',
                interval === 'year'
                  ? 'bg-accent-primary text-bg-primary'
                  : 'text-text-muted hover:text-text-primary',
              ].join(' ')}
            >
              Annual
              <span className={[
                'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                interval === 'year' ? 'bg-bg-primary/20 text-bg-primary' : 'bg-green-500/20 text-green-400',
              ].join(' ')}>
                2 months free
              </span>
            </button>
          </div>
        </div>

        {/* Status banner */}
        {statusLabel && (
          <div className="bg-accent-secondary/10 border border-accent-secondary/30 rounded-card px-3 py-2 text-sm text-text-primary text-center max-w-xl mx-auto">
            {statusLabel}
          </div>
        )}

        {/* Tier cards */}
        <div className="grid grid-cols-3 gap-4">
          {TIERS.map(tier => (
            <div
              key={tier.id}
              className={[
                'relative flex flex-col rounded-card border p-5 gap-3',
                tier.highlight
                  ? 'bg-bg-elevated border-accent-primary ring-1 ring-accent-primary'
                  : 'bg-bg-card border-border-color',
              ].join(' ')}
            >
              {tier.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent-primary text-bg-primary text-xs font-heading font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                  Most Popular
                </div>
              )}
              {tier.id === 'privateer' && (
                <div className="absolute -top-3 right-4 bg-green-500 text-white text-xs font-heading font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                  Free Trial
                </div>
              )}

              <div>
                <h2 className="font-heading text-xl font-bold text-text-primary">{tier.name}</h2>
                <p className="text-text-muted text-sm mt-0.5">{tier.tagline}</p>
              </div>

              <div>
                {interval === 'month' ? (
                  <div className="flex items-end gap-1">
                    <span className="font-heading text-3xl font-bold text-text-primary">{tier.monthlyPrice}</span>
                    <span className="text-text-muted mb-0.5 text-xs">/month</span>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-end gap-1">
                      <span className="font-heading text-3xl font-bold text-text-primary">{tier.annualPrice}</span>
                      <span className="text-text-muted mb-0.5 text-xs">/year</span>
                    </div>
                    <p className="text-text-muted text-xs mt-0.5">{tier.annualMonthly}/month · <span className="text-green-400 font-semibold">2 months free</span></p>
                  </div>
                )}
              </div>

              <ul className="space-y-2 flex-1">
                {tier.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-text-primary">
                    <Check size={12} className="text-accent-primary flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => void handleSubscribe(tier.id)}
                disabled={loadingTier !== null}
                className={[
                  'w-full flex items-center justify-center gap-2 py-2.5 font-heading font-bold uppercase tracking-wider rounded-card text-xs transition-opacity disabled:opacity-60 cursor-pointer',
                  tier.highlight
                    ? 'bg-accent-primary text-bg-primary'
                    : 'bg-bg-primary border border-border-color text-text-primary hover:border-accent-primary hover:text-accent-primary',
                ].join(' ')}
              >
                {loadingTier === tier.id
                  ? <><span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> Redirecting…</>
                  : tier.id === 'privateer' ? 'Start Free Trial' : 'Subscribe'
                }
              </button>
            </div>
          ))}
        </div>

        {error && (
          <p className="text-accent-secondary text-xs text-center">{error}</p>
        )}

        <p className="text-xs text-text-muted text-center">
          Secure payment via Stripe. No contract. Cancel any time.
        </p>
      </div>
    </div>
  )
}
