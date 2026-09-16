import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Modal } from './Modal'
import { Input } from './Input'
import { Button } from './Button'

interface Props {
  open: boolean
  factorId: string | null
  onCancel: () => void
  /** Called only after the TOTP code has been verified successfully */
  onConfirmed: () => void
}

/**
 * Two-factor authentication gate for sensitive account changes.
 *
 * Renders a modal that asks the user to enter their 6-digit Google
 * Authenticator code before a sensitive operation (email / phone change) is
 * allowed to proceed.  Uses supabase.auth.mfa.challengeAndVerify() — if it
 * succeeds the user is who they say they are and onConfirmed() is called.
 */
export function ConfirmTotpModal({ open, factorId, onCancel, onConfirmed }: Props) {
  const [code,    setCode]    = useState('')
  const [error,   setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function reset() {
    setCode('')
    setError(null)
    setLoading(false)
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!factorId || code.length !== 6) return
    setLoading(true)
    setError(null)

    const { error: verifyErr } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code,
    })

    if (verifyErr) {
      setError('Incorrect code — please try again.')
      setCode('')
      setLoading(false)
      return
    }

    reset()
    onConfirmed()
  }

  function handleCancel() {
    reset()
    onCancel()
  }

  return (
    <Modal isOpen={open} onClose={handleCancel} maxWidth="max-w-sm">
      <div className="space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-accent-primary/10 flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={16} className="text-accent-primary" />
          </div>
          <div>
            <h3 className="font-heading text-sm font-bold text-text-primary uppercase tracking-wide">
              Two-Factor Verification
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Enter your authenticator code to confirm this change.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={(e) => void handleVerify(e)} className="space-y-3">
          <Input
            label="Authenticator Code"
            type="text"
            inputMode="numeric"
            maxLength={6}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            value={code}
            placeholder="000000"
            onChange={e => { setCode(e.target.value.replace(/\D/g, '')); setError(null) }}
          />

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex items-center gap-3 pt-1">
            <Button size="sm" type="submit" loading={loading} disabled={code.length !== 6}>
              Verify &amp; Save
            </Button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="text-xs text-text-muted hover:text-text-primary transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>

      </div>
    </Modal>
  )
}
