import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button, Input } from '@/components/ui'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [verifying, setVerifying]   = useState(true)
  const [verified, setVerified]     = useState(false)
  const [password, setPassword]     = useState('')
  const [confirm, setConfirm]       = useState('')
  const [error, setError]           = useState<string | null>(null)
  const [loading, setLoading]       = useState(false)
  const [done, setDone]             = useState(false)

  useEffect(() => {
    const tokenHash = searchParams.get('token_hash')
    const type      = searchParams.get('type')

    if (!tokenHash || type !== 'recovery') {
      setError('Invalid or missing reset link. Please request a new one.')
      setVerifying(false)
      return
    }

    supabase.auth
      .verifyOtp({ token_hash: tokenHash, type: 'recovery' })
      .then(({ error: err }) => {
        if (err) {
          setError('This reset link has expired or already been used. Please request a new one.')
        } else {
          setVerified(true)
        }
        setVerifying(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }

    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    if (err) {
      setError(err.message)
      setLoading(false)
    } else {
      setDone(true)
      // Give the user a moment to read the success message then redirect
      setTimeout(() => navigate('/'), 2000)
    }
  }

  if (verifying) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <img src="/logo-pdf.png" alt="Kart Connect" className="w-48 object-contain" />
        </div>

        {done ? (
          <div className="text-center">
            <p className="font-heading text-2xl font-bold tracking-wide uppercase text-text-primary mb-2">
              Password Updated
            </p>
            <p className="text-text-muted text-sm">
              Your password has been changed. Taking you to the app…
            </p>
          </div>
        ) : (
          <div className="bg-bg-card border border-border-color rounded-card overflow-hidden">
            <div className="border-b border-border-color px-6 py-4">
              <p className="font-heading font-bold text-xs uppercase tracking-wider text-text-primary">
                {verified ? 'Set New Password' : 'Link Invalid'}
              </p>
              {verified && (
                <p className="text-xs text-text-muted mt-1">Choose a new password for your account.</p>
              )}
            </div>

            <div className="p-6">
              {!verified ? (
                <div className="space-y-4">
                  <p className="text-sm text-accent-secondary leading-relaxed">{error}</p>
                  <a
                    href="/login"
                    className="inline-block text-accent-primary hover:underline text-sm"
                  >
                    ← Back to sign in to request a new link
                  </a>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    label="New Password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    minLength={6}
                    required
                  />
                  <Input
                    label="Confirm Password"
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  {error && (
                    <p className="text-sm text-accent-secondary bg-accent-secondary/10 border border-accent-secondary/20 rounded-card px-3 py-2">
                      {error}
                    </p>
                  )}
                  <Button type="submit" loading={loading} className="w-full">
                    Update Password
                  </Button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
