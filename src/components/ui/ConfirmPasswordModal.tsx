import { useState } from 'react'
import { ShieldCheck, Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Modal } from './Modal'
import { Input } from './Input'
import { Button } from './Button'

interface Props {
  open: boolean
  /** Short heading shown in the modal */
  title?: string
  /** One-line description of why we're asking */
  description?: string
  onCancel: () => void
  /** Called only after the password has been verified successfully */
  onConfirmed: () => void
}

/**
 * Re-authentication gate for sensitive account changes.
 *
 * Renders a modal that asks the user to re-enter their current password before
 * a sensitive operation (email change, etc.) is allowed to proceed.
 * Uses supabase.auth.signInWithPassword() to verify — if it succeeds the user
 * is who they say they are and onConfirmed() is called.
 */
export function ConfirmPasswordModal({
  open,
  title       = 'Confirm your identity',
  description = 'Re-enter your current password to continue.',
  onCancel,
  onConfirmed,
}: Props) {
  const { user } = useAuth()
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)

  function reset() {
    setPassword('')
    setShowPw(false)
    setError(null)
    setLoading(false)
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault()
    if (!password || !user?.email) return
    setLoading(true)
    setError(null)

    const { error: authErr } = await supabase.auth.signInWithPassword({
      email:    user.email,
      password,
    })

    if (authErr) {
      setError('Incorrect password — please try again.')
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
              {title}
            </h3>
            <p className="text-xs text-text-muted mt-0.5">{description}</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={(e) => void handleConfirm(e)} className="space-y-3">
          <div className="relative">
            <Input
              label="Current Password"
              type={showPw ? 'text' : 'password'}
              value={password}
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              placeholder="••••••••"
              onChange={e => { setPassword(e.target.value); setError(null) }}
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-7 text-text-muted hover:text-text-primary cursor-pointer transition-colors"
            >
              {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex items-center gap-3 pt-1">
            <Button size="sm" type="submit" loading={loading} disabled={!password}>
              Confirm
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
