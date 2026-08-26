import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button, Input } from '@/components/ui'
import { useLanguage } from '@/contexts/LanguageContext'

type Mode = 'signin' | 'register'

interface Props {
  defaultMode?: Mode
}

export function LoginPage({ defaultMode = 'signin' }: Props) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { language } = useLanguage()

  const [mode, setMode] = useState<Mode>(
    searchParams.get('mode') === 'register' ? 'register' : defaultMode
  )

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)
  const [registered, setRegistered] = useState(false)

  // MFA
  const [mfaStep, setMfaStep]       = useState(false)
  const [mfaCode, setMfaCode]       = useState('')
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null)
  const [mfaChallengeId, setMfaChallengeId] = useState<string | null>(null)
  const [mfaLoading, setMfaLoading] = useState(false)

  const labels = {
    en:    { signin: 'Sign In',        register: 'Create Account', submit_signin: 'Sign In',       submit_register: 'Create Account', toggle_to_register: 'New here? Create an account', toggle_to_signin: 'Already have an account? Sign in', email: 'Email', password: 'Password', confirm: 'Check Your Email', confirm_body: (e: string) => `We sent a confirmation link to ${e}. Click it to activate your account.`, back: 'Back to sign in' },
    'en-us': { signin: 'Sign In',      register: 'Create Account', submit_signin: 'Sign In',       submit_register: 'Create Account', toggle_to_register: 'New here? Create an account', toggle_to_signin: 'Already have an account? Sign in', email: 'Email', password: 'Password', confirm: 'Check Your Email', confirm_body: (e: string) => `We sent a confirmation link to ${e}. Click it to activate your account.`, back: 'Back to sign in' },
    es:    { signin: 'Iniciar Sesión', register: 'Crear Cuenta',   submit_signin: 'Iniciar Sesión', submit_register: 'Crear Cuenta', toggle_to_register: '¿Nuevo? Crea una cuenta', toggle_to_signin: '¿Ya tienes cuenta? Inicia sesión', email: 'Correo', password: 'Contraseña', confirm: 'Revisa tu correo', confirm_body: (e: string) => `Enviamos un enlace de confirmación a ${e}. Haz clic para activar tu cuenta.`, back: 'Volver a iniciar sesión' },
    fr:    { signin: 'Se Connecter',   register: 'Créer un Compte', submit_signin: 'Se Connecter', submit_register: 'Créer un Compte', toggle_to_register: 'Nouveau ? Créez un compte', toggle_to_signin: 'Déjà un compte ? Connectez-vous', email: 'E-mail', password: 'Mot de passe', confirm: 'Vérifiez votre e-mail', confirm_body: (e: string) => `Nous avons envoyé un lien de confirmation à ${e}. Cliquez dessus pour activer votre compte.`, back: 'Retour à la connexion' },
    it:    { signin: 'Accedi',         register: 'Crea Account',   submit_signin: 'Accedi',        submit_register: 'Crea Account', toggle_to_register: 'Nuovo? Crea un account', toggle_to_signin: 'Hai già un account? Accedi', email: 'Email', password: 'Password', confirm: 'Controlla la tua email', confirm_body: (e: string) => `Abbiamo inviato un link di conferma a ${e}. Cliccalo per attivare il tuo account.`, back: 'Torna al login' },
    ar:    { signin: 'تسجيل الدخول',  register: 'إنشاء حساب',     submit_signin: 'تسجيل الدخول', submit_register: 'إنشاء حساب', toggle_to_register: 'جديد هنا؟ أنشئ حسابًا', toggle_to_signin: 'لديك حساب بالفعل؟ سجل الدخول', email: 'البريد الإلكتروني', password: 'كلمة المرور', confirm: 'تحقق من بريدك الإلكتروني', confirm_body: (e: string) => `أرسلنا رابط تأكيد إلى ${e}. انقر عليه لتفعيل حسابك.`, back: 'العودة لتسجيل الدخول' },
  } as const

  const L = labels[language as keyof typeof labels] ?? labels.en

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (mode === 'signin') {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) { setError(err.message); setLoading(false); return }
      // Check if MFA is required
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (aal?.nextLevel === 'aal2' && aal.nextLevel !== aal.currentLevel) {
        const { data: factors } = await supabase.auth.mfa.listFactors()
        const factor = factors?.totp?.[0]
        if (factor) {
          const { data: challenge } = await supabase.auth.mfa.challenge({ factorId: factor.id })
          setMfaFactorId(factor.id)
          setMfaChallengeId(challenge?.id ?? null)
          setMfaStep(true)
          setLoading(false)
          return
        }
      }
      navigate('/')
    } else {
      const { error: err } = await supabase.auth.signUp({ email, password })
      if (err) setError(err.message)
      else setRegistered(true)
    }
    setLoading(false)
  }

  async function verifyMfa() {
    if (!mfaFactorId || !mfaChallengeId || mfaCode.length !== 6) return
    setMfaLoading(true)
    setError(null)
    const { error: err } = await supabase.auth.mfa.verify({
      factorId: mfaFactorId,
      challengeId: mfaChallengeId,
      code: mfaCode,
    })
    if (err) { setError('Incorrect code — try again.'); setMfaLoading(false); return }
    navigate('/')
  }

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
    setEmail('')
    setPassword('')
  }

  if (mfaStep) {
    return (
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <img src="/logo-pdf.png" alt="Kart Connect" className="w-48 object-contain" />
        </div>
        <div className="bg-bg-card border border-border-color rounded-card p-6 space-y-4">
          <div className="text-center mb-2">
            <p className="font-heading text-sm uppercase tracking-wider text-text-primary font-bold">Verification Required</p>
            <p className="text-xs text-text-muted mt-1">Enter the 6-digit code from your authenticator app</p>
          </div>
          <Input
            label="Authentication Code"
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={mfaCode}
            onChange={e => { setMfaCode(e.target.value.replace(/\D/g, '')); setError(null) }}
            placeholder="000000"
          />
          {error && (
            <p className="text-sm text-accent-secondary bg-accent-secondary/10 border border-accent-secondary/20 rounded-card px-3 py-2">
              {error}
            </p>
          )}
          <Button
            className="w-full"
            loading={mfaLoading}
            disabled={mfaCode.length !== 6}
            onClick={() => void verifyMfa()}
          >
            Verify
          </Button>
          <button
            type="button"
            onClick={() => { setMfaStep(false); setMfaCode(''); setError(null) }}
            className="w-full text-center text-xs text-text-muted hover:text-text-primary transition-colors cursor-pointer"
          >
            Back to sign in
          </button>
        </div>
      </div>
    )
  }

  if (registered) {
    return (
      <div className="w-full max-w-sm text-center">
        <img src="/logo-pdf.png" alt="Kart Connect" className="w-36 object-contain mx-auto mb-6" />
        <h2 className="font-heading text-2xl font-bold tracking-wide uppercase text-text-primary mb-2">
          {L.confirm}
        </h2>
        <p className="text-text-muted text-sm leading-relaxed">
          {L.confirm_body(email)}
        </p>
        <button
          type="button"
          onClick={() => { setRegistered(false); setMode('signin') }}
          className="inline-block mt-6 text-accent-primary hover:underline text-sm cursor-pointer"
        >
          {L.back}
        </button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm">
      {/* Logo */}
      <div className="flex justify-center mb-8">
        <img src="/logo-pdf.png" alt="Kart Connect" className="w-48 object-contain" />
      </div>

      <div className="bg-bg-card border border-border-color rounded-card overflow-hidden">
        {/* Tab toggle */}
        <div className="grid grid-cols-2 border-b border-border-color">
          {(['signin', 'register'] as Mode[]).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className={[
                'py-3 font-heading font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer',
                mode === m
                  ? 'bg-accent-primary text-bg-primary'
                  : 'text-text-muted hover:text-text-primary bg-bg-elevated',
              ].join(' ')}
            >
              {m === 'signin' ? L.signin : L.register}
            </button>
          ))}
        </div>

        {/* Form */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label={L.email}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
            <Input
              label={L.password}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={mode === 'register' ? 6 : undefined}
              required
            />

            {error && (
              <p className="text-sm text-accent-secondary bg-accent-secondary/10 border border-accent-secondary/20 rounded-card px-3 py-2">
                {error}
              </p>
            )}

            <Button type="submit" loading={loading} className="w-full">
              {mode === 'signin' ? L.submit_signin : L.submit_register}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

// Keep RegisterPage as alias so existing route still works
export { LoginPage as RegisterPage }
