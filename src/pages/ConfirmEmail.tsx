import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

/**
 * Landing page for email-change confirmation links.
 *
 * Our account-emails Edge Function sends confirmation links in the form:
 *   /confirm-email?token_hash=<hash>&type=email_change
 *
 * On load we call supabase.auth.verifyOtp() — the Supabase JS SDK handles
 * the token in a POST request body, which is more reliable than calling
 * Supabase's /auth/v1/verify HTTP endpoint directly via URL query params.
 *
 * On success the user is redirected to /settings?type=email_change so the
 * settings page can show the "email confirmed" banner and refresh the session.
 */
export function ConfirmEmailPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const tokenHash = searchParams.get('token_hash')
    const type      = searchParams.get('type')

    console.log('[ConfirmEmail] URL params | token_hash:', tokenHash, '| type:', type)
    console.log('[ConfirmEmail] full search string:', window.location.search)

    if (!tokenHash || type !== 'email_change') {
      console.error('[ConfirmEmail] missing or wrong params — aborting. tokenHash present:', !!tokenHash, '| type:', type)
      setErrorMsg('Invalid or missing confirmation link. Please request a new email change.')
      setStatus('error')
      return
    }

    console.log('[ConfirmEmail] calling verifyOtp({ token_hash: <hash>, type: "email_change" })')
    console.log('[ConfirmEmail] token_hash value (first 20 chars):', tokenHash.slice(0, 20), '…')

    supabase.auth
      .verifyOtp({ token_hash: tokenHash, type: 'email_change' })
      .then((result) => {
        console.log('[ConfirmEmail] verifyOtp raw result:', JSON.stringify({
          error: result.error
            ? { message: result.error.message, status: result.error.status, name: result.error.name }
            : null,
          user_email:  result.data?.user?.email  ?? null,
          user_id:     result.data?.user?.id     ?? null,
          session_ok:  !!result.data?.session,
        }))

        if (result.error) {
          console.error('[ConfirmEmail] verifyOtp error:', result.error.message)
          setErrorMsg(
            result.error.message.includes('expired') || result.error.message.includes('invalid')
              ? 'This confirmation link has expired or has already been used. Please request a new email change from your account settings.'
              : `Confirmation failed: ${result.error.message}`
          )
          setStatus('error')
        } else {
          console.log('[ConfirmEmail] verifyOtp succeeded — navigating to /settings')
          // Navigate immediately — a setTimeout here races with onAuthStateChange
          // (fired by verifyOtp updating the session) and can land the user on the
          // wrong route before our navigation completes.
          //
          // Pass the signal via React Router location state rather than a query
          // string.  Query strings on programmatic navigations can be stripped if
          // onAuthStateChange triggers another route update before Settings.tsx
          // reads window.location.search.  Navigation state is part of React
          // Router's internal location object and is guaranteed to arrive intact.
          navigate('/settings', { replace: true, state: { emailChanged: true } })
        }
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        <div className="flex justify-center mb-8">
          <img src="/logo-pdf.png" alt="Kart Connect" className="w-48 object-contain" />
        </div>

        <div className="bg-bg-card border border-border-color rounded-card overflow-hidden">
          <div className="border-b border-border-color px-6 py-4">
            <p className="font-heading font-bold text-xs uppercase tracking-wider text-text-primary">
              {status === 'verifying' ? 'Confirming Email…'
                : status === 'success' ? 'Email Confirmed'
                : 'Confirmation Failed'}
            </p>
          </div>

          <div className="p-6">
            {status === 'verifying' && (
              <div className="flex items-center gap-3 text-text-muted text-sm">
                <div className="w-5 h-5 border-2 border-accent-primary border-t-transparent rounded-full animate-spin flex-shrink-0" />
                Verifying your new email address…
              </div>
            )}

            {status === 'success' && (
              <div className="flex items-center gap-3 text-green-400 text-sm">
                <CheckCircle2 size={18} className="flex-shrink-0" />
                Your email address has been confirmed. Taking you to settings…
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-4">
                <p className="text-sm text-accent-secondary leading-relaxed">{errorMsg}</p>
                <a
                  href="/settings"
                  className="inline-block text-accent-primary hover:underline text-sm"
                >
                  ← Go to account settings
                </a>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
