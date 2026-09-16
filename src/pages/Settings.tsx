import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { CheckCircle2, ChevronDown, ChevronUp, Zap, Camera, ShieldCheck, ShieldOff, ImagePlus, Trash2, AlertTriangle, Pencil, X, Lock } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Card, Button, Input, SegmentedControl, ConfirmPasswordModal, ConfirmTotpModal } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { LANGUAGES } from '@/i18n'
import { supabase } from '@/lib/supabase'
import { useSubscription } from '@/hooks/useSubscription'
import { useTeamBranding } from '@/hooks/useTeamBranding'
import type { PressureUnit, AltUnit, TempUnit, SpeedUnit } from '@/types'

const BILLING_TIERS = [
  {
    id: 'privateer' as const,
    name: 'Privateer',
    monthlyPrice: '£12.99',
    features: ['Single driver, single kart', 'Full setup logging', 'Dashboard scanner', 'All analysis features', 'PDF exports'],
  },
  {
    id: 'team' as const,
    name: 'Team',
    monthlyPrice: '£29.99',
    features: ['Up to 5 drivers', 'Multi-kart management', 'Team manager view', 'All Privateer features'],
  },
  {
    id: 'pro_team' as const,
    name: 'Pro Team',
    monthlyPrice: '£49.99',
    features: ['Up to 30 drivers', 'Priority support', 'White-label branding & logo', 'All Team features'],
  },
]


export function SettingsPage() {
  const navigate = useNavigate()
  const location  = useLocation()
  const { user } = useAuth()
  const { language, setLanguage, t } = useLanguage()
  const { subscription, tier, trialDaysLeft } = useSubscription()
  const { branding, save: saveBranding, uploadLogo, uploadLogoDark } = useTeamBranding()
  const [pressureUnit, setPressureUnit] = useState<PressureUnit>(
    (localStorage.getItem('kc_pressure_unit') as PressureUnit) ?? 'bar'
  )
  const [altUnit, setAltUnitState] = useState<AltUnit>(
    (localStorage.getItem('kc_alt_unit') as AltUnit) ?? 'm'
  )
  const [tempUnit, setTempUnitState] = useState<TempUnit>(
    (localStorage.getItem('kc_temp_unit') as TempUnit) ?? 'c'
  )
  const [speedUnit, setSpeedUnitState] = useState<SpeedUnit>(
    (localStorage.getItem('kc_speed_unit') as SpeedUnit) ?? 'kph'
  )
  const [signingOut, setSigningOut] = useState(false)
  const [billingOpen, setBillingOpen]       = useState(false)
  const [portalLoading, setPortalLoading]   = useState(false)
  const [portalError, setPortalError]       = useState<string | null>(null)

  async function openBillingPortal() {
    console.log('[billing] openBillingPortal called | subscription:', JSON.stringify(subscription), '| tier:', tier)
    setPortalLoading(true)
    setPortalError(null)
    const { data, error } = await supabase.functions.invoke('create-portal-session', {})
    console.log('[billing] create-portal-session response | data:', JSON.stringify(data), '| error:', error ? JSON.stringify({ message: error.message, context: (error as any).context }) : null)
    setPortalLoading(false)
    if (error || !data?.url) {
      console.error('[billing] portal session failed — staying on Settings, setting portalError')
      setPortalError('Could not open billing portal — please try again or contact support.')
      return
    }
    console.log('[billing] redirecting to Stripe portal:', data.url)
    window.location.href = data.url
  }
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)

  // Team branding
  const [brandingName, setBrandingName] = useState('')
  const [brandingLogoUrl, setBrandingLogoUrl] = useState<string | null>(null)
  const [brandingLogoDarkUrl, setBrandingLogoDarkUrl] = useState<string | null>(null)
  const [brandingPrimary, setBrandingPrimary] = useState('#CA8A04')
  const [brandingSecondary, setBrandingSecondary] = useState('#12121A')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingLogoDark, setUploadingLogoDark] = useState(false)
  const [savingBranding, setSavingBranding] = useState(false)
  const [brandingSaved, setBrandingSaved] = useState(false)
  const [brandingError, setBrandingError] = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const logoDarkInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setBrandingName(branding.team_name ?? '')
    setBrandingLogoUrl(branding.logo_url ?? null)
    setBrandingLogoDarkUrl(branding.logo_url_dark ?? null)
    setBrandingPrimary(branding.primary_color ?? '#E8FF00')
    setBrandingSecondary(branding.secondary_color ?? '#12121A')
  }, [branding])

  // 2FA
  const [mfaEnabled, setMfaEnabled]     = useState(false)
  const [mfaFactorId, setMfaFactorId]   = useState<string | null>(null)
  const [enrollUri, setEnrollUri]         = useState<string | null>(null)
  const [enrollFactorId, setEnrollFactorId] = useState<string | null>(null)
  const [mfaCode, setMfaCode]           = useState('')
  const [mfaVerifying, setMfaVerifying] = useState(false)
  const [mfaError, setMfaError]         = useState<string | null>(null)
  const [mfaStep, setMfaStep]           = useState<'idle' | 'scan' | 'confirmed'>('idle')

  useEffect(() => {
    void supabase.auth.mfa.listFactors().then(({ data, error }) => {
      // Full dump so we can see every field Supabase returns
      console.log('[MFA] listFactors RAW:', JSON.stringify({ data, error }, null, 2))
      if (error) { console.error('[MFA] listFactors error:', error.message); return }

      // data.totp  — may be undefined/empty in older SDK versions
      // data.all   — flat list of every factor regardless of type; use as fallback
      const fromTotp = data?.totp?.find(f => f.status === 'verified')
      const fromAll  = (data as any)?.all?.find(
        (f: { factor_type: string; status: string }) =>
          f.factor_type === 'totp' && f.status === 'verified'
      )
      const verified = fromTotp ?? fromAll ?? null
      console.log('[MFA] fromTotp:', fromTotp ?? null, '| fromAll:', fromAll ?? null, '| using:', verified)

      if (verified) {
        setMfaEnabled(true)
        setMfaFactorId(verified.id)
        console.log('[MFA] ✓ mfaEnabled = true, factorId =', verified.id)
      } else {
        console.warn('[MFA] No verified TOTP factor found — TOTP gate will be skipped')
      }
    })
  }, [])

  async function startEnroll() {
    setMfaError(null)
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Kart Connect' })
    if (error || !data) { setMfaError(error?.message ?? 'Failed to start setup'); return }
    setEnrollUri(data.totp.uri)
    setEnrollFactorId(data.id)
    setMfaCode('')
    setMfaStep('scan')
  }

  async function confirmEnroll() {
    if (!enrollFactorId || mfaCode.length !== 6) return
    setMfaVerifying(true)
    setMfaError(null)
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enrollFactorId, code: mfaCode })
    if (error) {
      setMfaError('Incorrect code — try again.')
    } else {
      setMfaEnabled(true)
      setMfaFactorId(enrollFactorId)
      setMfaStep('confirmed')
      setEnrollUri(null)
      setEnrollFactorId(null)
    }
    setMfaVerifying(false)
  }

  async function disableMfa() {
    if (!mfaFactorId) return
    await supabase.auth.mfa.unenroll({ factorId: mfaFactorId })
    setMfaEnabled(false)
    setMfaFactorId(null)
    setMfaStep('idle')
  }

  // ── Profile fields ──────────────────────────────────────────────────────────
  const [editingProfile, setEditingProfile]     = useState(false)
  const [profileName, setProfileName]           = useState('')
  const [profileEmail, setProfileEmail]         = useState('')
  const [profilePhone, setProfilePhone]         = useState('')
  const [profileRaceNum, setProfileRaceNum]     = useState('')
  const [savingProfile, setSavingProfile]       = useState(false)
  const [profileError, setProfileError]         = useState<string | null>(null)
  const [emailChangePending, setEmailChangePending] = useState(false)
  const [pendingNewEmail, setPendingNewEmail]   = useState('')
  const [emailChangeConfirmed, setEmailChangeConfirmed] = useState(false)
  const [profileSaved, setProfileSaved]         = useState(false)
  // Re-authentication gate — shown before sensitive changes (email/phone) are applied.
  // Prefer TOTP modal when MFA is enabled; fall back to password modal for
  // password-auth users who haven't set up Google Authenticator yet.
  const [totpModalOpen,    setTotpModalOpen]    = useState(false)
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  // Captures the intended new email before a modal opens.
  // Both signInWithPassword (password modal) and challengeAndVerify (TOTP modal)
  // fire onAuthStateChange → useEffect([user]) which resets profileEmail back
  // to user.email (old address).  Use a ref so the intended value survives.
  const pendingEmailRef = useRef('')

  // Detect return from the email-change confirmation link.
  //
  // With the direct Supabase verify URL approach, Supabase redirects to
  // /settings#access_token=…&type=email_change after verifying the token.
  // Supabase's detectSessionInUrl processes that hash asynchronously (Promise
  // microtask) and may clear it from window.location before useEffect runs
  // (useEffect fires as a macrotask, after microtasks).  Capture the raw hash
  // synchronously at render time — before any async cleanup can touch it.
  const initialHash     = useRef(window.location.hash)
  const initialSearch   = useRef(window.location.search)
  // Guard: set true when the confirmation flow starts so useEffect([user])
  // never overwrites profileEmail for the rest of this Settings mount.
  const emailConfirmingRef = useRef(false)

  useEffect(() => {
    // Primary signal: React Router navigation state (set by ConfirmEmail.tsx
    // if still using the old /confirm-email flow).
    const locState = location.state as Record<string, unknown> | null
    const fromEmailConfirm = locState?.emailChanged === true

    // URL hash / query: use the values captured synchronously at render time
    // (initialHash / initialSearch refs) rather than window.location.hash /
    // window.location.search — Supabase's detectSessionInUrl clears the hash
    // in a Promise microtask that runs before this useEffect macrotask fires.
    const hashParams  = new URLSearchParams(initialHash.current.replace(/^#/, ''))
    const queryParams = new URLSearchParams(initialSearch.current)
    const typeParam   = hashParams.get('type') ?? queryParams.get('type')

    console.log(
      '[Settings] mount | fromEmailConfirm:', fromEmailConfirm,
      '| typeParam:', typeParam,
    )

    if (!fromEmailConfirm && typeParam !== 'email_change') return

    // Flip the guard immediately so useEffect([user]) never overwrites
    // profileEmail for the rest of this Settings mount.  The ref is never
    // reset — once we're in a confirmation flow, let getUser() be the sole
    // source of truth for the displayed email address.
    emailConfirmingRef.current = true
    window.history.replaceState({}, '', window.location.pathname)

    // Single authoritative read — no updateUser, no refreshUser, no further
    // side-effects that could fire more auth events or trigger re-mounts.
    supabase.auth.getUser().then(({ data: { user: freshUser } }) => {
      const freshEmail = freshUser?.email
      console.log('[Settings] getUser() result | freshEmail:', freshEmail)
      if (freshEmail) {
        setProfileEmail(freshEmail)
        setEmailChangePending(false)
        setPendingNewEmail('')
        setEmailChangeConfirmed(true)
        setTimeout(() => setEmailChangeConfirmed(false), 6000)
      }
    })
  // location.state is read once at mount — intentionally omitted from deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep a stable copy for the display name / initials outside edit mode
  const fullName = profileName

  useEffect(() => {
    if (user) {
      setProfileName((user.user_metadata?.full_name as string | undefined) ?? '')
      // Skip email sync when the confirmation flow has run — getUser() above
      // is the sole source of truth for profileEmail in that case.
      if (!emailConfirmingRef.current) {
        setProfileEmail(user.email ?? '')
      }
      setProfilePhone((user.user_metadata?.phone_number as string | undefined) ?? '')
      setProfileRaceNum((user.user_metadata?.race_number as string | undefined) ?? '')
    }
  }, [user])

  // Determine whether the user has a password-based identity (email provider).
  // OAuth-only users have no password to verify, so we skip the re-auth gate for them.
  const hasPasswordAuth = user?.identities?.some(id => id.provider === 'email') ?? false

  /**
   * Called when the user clicks "Save Profile".
   * If a sensitive change (email) is requested and the user has a password,
   * we capture the intended email in a ref (so it survives the auth state
   * change triggered by signInWithPassword inside the modal) then open the
   * re-auth modal. Non-sensitive changes go straight through.
   */
  function saveProfile() {
    const trimmedEmail = profileEmail.trim()
    const trimmedPhone = profilePhone.trim()
    const emailChanging = trimmedEmail !== '' && trimmedEmail !== (user?.email ?? '')
    const phoneChanging = trimmedPhone !== ((user?.user_metadata?.phone_number as string | undefined) ?? '')
    const contactChanging = emailChanging || phoneChanging

    console.log('[saveProfile] emailChanging:', emailChanging, '| phoneChanging:', phoneChanging, '| contactChanging:', contactChanging, '| mfaEnabled:', mfaEnabled, '| mfaFactorId:', mfaFactorId, '| hasPasswordAuth:', hasPasswordAuth)
    console.log('[saveProfile] trimmedEmail:', trimmedEmail, '| user.email:', user?.email)
    console.log('[saveProfile] trimmedPhone:', trimmedPhone, '| user phone:', user?.user_metadata?.phone_number)

    if (contactChanging) {
      // Capture the intended email before the modal opens — both challengeAndVerify
      // (TOTP) and signInWithPassword (password) fire onAuthStateChange, which
      // triggers useEffect([user]) and resets profileEmail to the old value.
      if (emailChanging) pendingEmailRef.current = trimmedEmail

      if (mfaEnabled && mfaFactorId) {
        // Preferred gate: Google Authenticator TOTP code
        console.log('[saveProfile] → opening TOTP modal')
        setTotpModalOpen(true)
      } else if (emailChanging && hasPasswordAuth) {
        // Fallback for users who haven't set up TOTP yet (email changes only)
        console.log('[saveProfile] → opening password modal (no MFA)')
        setConfirmModalOpen(true)
      } else {
        // Phone-only change with no MFA and no password auth — proceed directly
        console.log('[saveProfile] → proceeding without gate (no MFA, no password auth)')
        void executeSaveProfile()
      }
      return
    }

    void executeSaveProfile()
  }

  /**
   * The actual save — called either directly (no sensitive change / OAuth user)
   * or after ConfirmPasswordModal has verified the user's password.
   *
   * Reads the intended new email from pendingEmailRef rather than profileEmail
   * state, because signInWithPassword fires onAuthStateChange which resets
   * profileEmail back to user.email before this function runs.
   */
  async function executeSaveProfile() {
    // Read and immediately clear the ref so it never carries a stale value
    const intendedEmail = pendingEmailRef.current
    pendingEmailRef.current = ''

    console.log('[executeSaveProfile] start | intendedEmail:', intendedEmail, '| user.email:', user?.email)

    setSavingProfile(true)
    setProfileError(null)
    setEmailChangePending(false)
    try {
      // 1. Save non-sensitive metadata (name, phone, race number)
      console.log('[executeSaveProfile] saving metadata...')
      const { error: metaErr } = await supabase.auth.updateUser({
        data: {
          full_name:    profileName.trim(),
          phone_number: profilePhone.trim(),
          race_number:  profileRaceNum.trim(),
        },
      })
      if (metaErr) {
        console.error('[executeSaveProfile] metadata error:', metaErr.message)
        throw metaErr
      }
      console.log('[executeSaveProfile] metadata saved OK')

      // 2. Handle email change — use the ref value (immune to state reset)
      const newEmail = intendedEmail || profileEmail.trim()
      const emailChanging = newEmail !== '' && newEmail !== (user?.email ?? '')
      console.log('[executeSaveProfile] email check | newEmail:', newEmail, '| emailChanging:', emailChanging)

      if (emailChanging) {
        // v2 — email change now uses update-email Edge Function (admin API), not updateUser({ email })
        // Store the new email in metadata so the account-emails Edge Function
        // can include it in the security notice sent to the old address.
        console.log('[executeSaveProfile] storing _pending_email_change in metadata:', newEmail)
        await supabase.auth.updateUser({ data: { _pending_email_change: newEmail } })

        // Use the update-email Edge Function which calls admin.updateUserById()
        // server-side — this bypasses Supabase's email confirmation requirement
        // entirely.  The TOTP check that ran before executeSaveProfile() is the
        // security gate; admin.updateUserById() + email_confirm:true completes
        // the change immediately without a confirmation link.
        console.log('[executeSaveProfile] invoking update-email Edge Function for:', newEmail)
        const { error: fnErr } = await supabase.functions.invoke('update-email', {
          body: { newEmail },
        })
        console.log('[executeSaveProfile] update-email result | error:', fnErr?.message ?? null)

        if (fnErr) {
          void supabase.auth.updateUser({ data: { _pending_email_change: null } })
          throw new Error(fnErr.message ?? 'Failed to update email')
        }

        // Force the client session to reload so the JWT reflects the new email.
        // admin.updateUserById() changes the email server-side but the existing
        // access token still carries the old email claim; refreshSession() fetches
        // a new token with the updated claim, which fires TOKEN_REFRESHED →
        // AuthContext updates user → useEffect([user]) → profileEmail shows new value.
        console.log('[executeSaveProfile] refreshing session to pick up new email...')
        await supabase.auth.refreshSession()

        setEmailChangePending(false)
        setPendingNewEmail('')
        console.log('[executeSaveProfile] ✓ email changed immediately to:', newEmail)
      }

      setProfileSaved(true)
      setEditingProfile(false)
      setTimeout(() => setProfileSaved(false), 4000)
      console.log('[executeSaveProfile] done')
    } catch (e) {
      console.error('[executeSaveProfile] caught error:', e)
      setProfileError(e instanceof Error ? e.message : 'Failed to save profile')
    } finally {
      setSavingProfile(false)
    }
  }

  function cancelEdit() {
    // Reset fields back to current user values
    setProfileName((user?.user_metadata?.full_name as string | undefined) ?? '')
    setProfileEmail(user?.email ?? '')
    setProfilePhone((user?.user_metadata?.phone_number as string | undefined) ?? '')
    setProfileRaceNum((user?.user_metadata?.race_number as string | undefined) ?? '')
    setProfileError(null)
    setPendingNewEmail('')
    setEmailChangePending(false)
    setEditingProfile(false)
  }

  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    (user?.user_metadata?.avatar_url as string | undefined) ?? null
  )
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarError, setAvatarError]         = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function savePressureUnit(unit: PressureUnit) {
    setPressureUnit(unit)
    localStorage.setItem('kc_pressure_unit', unit)
  }
  function saveAltUnit(unit: AltUnit) {
    setAltUnitState(unit)
    localStorage.setItem('kc_alt_unit', unit)
  }
  function saveTempUnit(unit: TempUnit) {
    setTempUnitState(unit)
    localStorage.setItem('kc_temp_unit', unit)
  }
  function saveSpeedUnit(unit: SpeedUnit) {
    setSpeedUnitState(unit)
    localStorage.setItem('kc_speed_unit', unit)
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setAvatarError(null)

    // Show preview immediately from local file — no storage dependency
    const reader = new FileReader()
    reader.onload = ev => {
      if (ev.target?.result) setAvatarUrl(ev.target.result as string)
    }
    reader.readAsDataURL(file)

    // Upload to storage in background for persistence
    setUploadingAvatar(true)
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${user.id}/avatar.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = `${data.publicUrl}?t=${Date.now()}`
      setAvatarUrl(url)
      await supabase.auth.updateUser({ data: { avatar_url: url } })
    } else {
      setAvatarError('Photo saved locally but could not be stored — run migration 011 in Supabase.')
    }
    setUploadingAvatar(false)
    // Reset input so selecting the same file again still fires onChange
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => { if (ev.target?.result) setBrandingLogoUrl(ev.target.result as string) }
    reader.readAsDataURL(file)
    setUploadingLogo(true)
    const url = await uploadLogo(file)
    if (url) setBrandingLogoUrl(url)
    setUploadingLogo(false)
    if (logoInputRef.current) logoInputRef.current.value = ''
  }

  async function handleLogoDarkChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => { if (ev.target?.result) setBrandingLogoDarkUrl(ev.target.result as string) }
    reader.readAsDataURL(file)
    setUploadingLogoDark(true)
    const url = await uploadLogoDark(file)
    if (url) setBrandingLogoDarkUrl(url)
    setUploadingLogoDark(false)
    if (logoDarkInputRef.current) logoDarkInputRef.current.value = ''
  }

  async function handleSaveBranding() {
    setSavingBranding(true)
    setBrandingError(null)
    try {
      const err = await saveBranding({ team_name: brandingName, logo_url: brandingLogoUrl, logo_url_dark: brandingLogoDarkUrl, primary_color: brandingPrimary, secondary_color: brandingSecondary })
      if (err) {
        setBrandingError(err)
      } else {
        setBrandingSaved(true)
        setTimeout(() => setBrandingSaved(false), 3000)
      }
    } catch (e) {
      setBrandingError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSavingBranding(false)
    }
  }

  async function signOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    navigate('/login')
  }

  async function deleteAccount() {
    if (!user) return
    setDeleteModalOpen(false)
    setDeletingAccount(true)
    try {
      await supabase.from('race_weekends').delete().eq('manager_id', user.id)
      await supabase.from('sessions').delete().eq('user_id', user.id)
      await supabase.from('karts').delete().eq('user_id', user.id)
      await supabase.from('team_branding').delete().eq('user_id', user.id)
      await supabase.auth.signOut()
      await new Promise(resolve => setTimeout(resolve, 3000))
      navigate('/login')
    } catch {
      setDeletingAccount(false)
    }
  }

  const displayName = fullName.trim() || user?.email?.split('@')[0] || '?'
  const initials = displayName.slice(0, 2).toUpperCase()

  if (deletingAccount) {
    return (
      <div className="fixed inset-0 z-50 bg-bg-primary flex flex-col items-center justify-center gap-10">
        <div className="text-center">
          <p className="font-display text-3xl font-bold tracking-widest uppercase text-text-primary mb-1">
            We're sorry to see you go
          </p>
          <p className="text-sm text-text-muted">Your account is being deleted…</p>
        </div>
        <img src="/logo-pdf.png" alt="Kart Connect" className="w-36 object-contain opacity-60" />
      </div>
    )
  }

  return (
    <PageWrapper title={t('nav.settings')}>
      <div className="max-w-lg mx-auto space-y-5">
        {/* Profile */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-sm uppercase tracking-wider text-text-primary">{t('settings.profile')}</h3>
            {!editingProfile && (
              <button
                type="button"
                onClick={() => setEditingProfile(true)}
                className="flex items-center gap-1.5 text-xs text-accent-primary hover:text-accent-primary/80 font-semibold transition-colors cursor-pointer"
              >
                <Pencil size={11} /> Edit
              </button>
            )}
          </div>

          {/* Avatar row */}
          <div className="flex items-center gap-4 mb-5">
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 rounded-full bg-accent-primary/20 flex items-center justify-center overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-accent-primary font-bold text-lg">{initials}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-accent-primary flex items-center justify-center cursor-pointer hover:bg-accent-primary/80 transition-colors disabled:opacity-50"
              >
                {uploadingAvatar
                  ? <div className="w-3 h-3 border border-bg-primary border-t-transparent rounded-full animate-spin" />
                  : <Camera size={11} className="text-bg-primary" />
                }
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary truncate">{displayName}</p>
              <p className="text-xs text-text-muted truncate">{user?.email ?? '—'}</p>
            </div>
          </div>

          {/* Read-only view */}
          {!editingProfile && (
            <div className="space-y-3">
              {[
                { label: 'Full Name',    value: profileName    || '—' },
                { label: 'Email',        value: profileEmail   || '—' },
                { label: 'Phone Number', value: profilePhone   || '—' },
                { label: 'Race Number',  value: profileRaceNum ? `#${profileRaceNum}` : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-border-color last:border-0">
                  <span className="text-xs text-text-muted font-heading uppercase tracking-wider">{label}</span>
                  <span className="text-sm text-text-primary font-medium">{value}</span>
                </div>
              ))}
              {profileSaved && (
                <p className="text-xs text-green-400 flex items-center gap-1 pt-1">
                  <CheckCircle2 size={11} /> Profile saved
                </p>
              )}
              {emailChangeConfirmed && (
                <p className="text-xs text-green-400 flex items-center gap-1 pt-1">
                  <CheckCircle2 size={11} /> Email address confirmed and updated successfully.
                </p>
              )}
              {emailChangePending && !emailChangeConfirmed && (
                <p className="text-xs text-amber-400 pt-1">
                  Verification sent to <strong>{pendingNewEmail}</strong>. Click the link in your inbox to confirm the change. A security notice has been sent to your old address.
                </p>
              )}
            </div>
          )}

          {/* Edit form */}
          {editingProfile && (
            <div className="space-y-3">
              <Input
                label="Full Name"
                placeholder="e.g. Jack Smith"
                value={profileName}
                onChange={e => setProfileName(e.target.value)}
              />
              <div>
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="you@example.com"
                  value={profileEmail}
                  onChange={e => setProfileEmail(e.target.value)}
                />
                {profileEmail !== (user?.email ?? '') ? (
                  <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                    <Lock size={10} className="flex-shrink-0" />
                    {mfaEnabled
                      ? 'You\'ll be asked for your authenticator code before this change is applied.'
                      : 'You\'ll be asked to confirm your password before this change is applied.'}
                  </p>
                ) : (
                  (mfaEnabled || hasPasswordAuth) && (
                    <p className="text-xs text-text-muted mt-1 flex items-center gap-1">
                      <Lock size={10} className="flex-shrink-0" />
                      {mfaEnabled ? 'Authenticator code required to change email' : 'Password required to change email'}
                    </p>
                  )
                )}
              </div>
              <Input
                label="Phone Number"
                type="tel"
                placeholder="e.g. +44 7700 900000"
                value={profilePhone}
                onChange={e => setProfilePhone(e.target.value)}
              />
              <Input
                label="Race Number"
                placeholder="e.g. 42"
                value={profileRaceNum}
                onChange={e => setProfileRaceNum(e.target.value.replace(/\D/g, '').slice(0, 3))}
              />
              {profileError && (
                <p className="text-xs text-red-400">{profileError}</p>
              )}
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={saveProfile} loading={savingProfile}>
                  Save Profile
                </Button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={savingProfile}
                  className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors cursor-pointer disabled:opacity-50"
                >
                  <X size={12} /> Cancel
                </button>
              </div>
            </div>
          )}

          {avatarError && (
            <p className="text-xs text-amber-400 mt-2">{avatarError}</p>
          )}
        </Card>

        {/* Preferences */}
        <Card>
          <h3 className="font-heading text-sm uppercase tracking-wider text-text-primary mb-4">{t('settings.preferences')}</h3>
          <SegmentedControl
            label={t('settings.pressure_unit')}
            options={[
              { label: 'Bar', value: 'bar' },
              { label: 'PSI', value: 'psi' },
            ]}
            value={pressureUnit}
            onChange={v => savePressureUnit(v as PressureUnit)}
          />
          <div className="mt-4">
            <SegmentedControl
              label={t('settings.altitude_unit')}
              options={[
                { label: 'Metres (m)', value: 'm' },
                { label: 'Feet (ft)', value: 'ft' },
              ]}
              value={altUnit}
              onChange={v => saveAltUnit(v as AltUnit)}
            />
          </div>
          <div className="mt-4">
            <SegmentedControl
              label={t('settings.temperature_unit')}
              options={[
                { label: 'Celsius (°C)', value: 'c' },
                { label: 'Fahrenheit (°F)', value: 'f' },
              ]}
              value={tempUnit}
              onChange={v => saveTempUnit(v as TempUnit)}
            />
          </div>
          <div className="mt-4">
            <SegmentedControl
              label={t('settings.speed_unit')}
              options={[
                { label: 'KPH', value: 'kph' },
                { label: 'MPH', value: 'mph' },
              ]}
              value={speedUnit}
              onChange={v => saveSpeedUnit(v as SpeedUnit)}
            />
          </div>

          {/* Language */}
          <div className="mt-5 pt-4 border-t border-border-color">
            <p className="font-heading text-xs uppercase tracking-wider text-text-muted mb-3">{t('settings.language')}</p>
            <div className="grid grid-cols-2 gap-2">
              {LANGUAGES.map(lang => {
                const isActive = language === lang.code
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setLanguage(lang.code)}
                    className={[
                      'flex items-center gap-2 px-3 py-2 rounded-card border text-left transition-all cursor-pointer text-sm',
                      isActive
                        ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                        : 'border-border-color bg-bg-elevated text-text-muted hover:text-text-primary hover:border-accent-primary/40',
                    ].join(' ')}
                  >
                    <span className="text-lg leading-none">{lang.flag}</span>
                    <span className="font-heading font-bold text-xs truncate">{lang.native}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </Card>

        {/* Billing & Subscription */}
        <Card>
          <button
            type="button"
            onClick={() => setBillingOpen(o => !o)}
            className="w-full flex items-center gap-2 cursor-pointer"
          >
            <Zap size={14} className="text-accent-primary flex-shrink-0" />
            <h3 className="font-heading text-sm uppercase tracking-wider text-text-primary flex-1 text-left">
              Billing &amp; Subscription
            </h3>
            {billingOpen ? <ChevronUp size={15} className="text-text-muted" /> : <ChevronDown size={15} className="text-text-muted" />}
          </button>

          {billingOpen && (
            <div className="mt-4 space-y-4">
              {/* Debug: log subscription state whenever billing section opens */}
              {void console.log('[billing] section rendered | subscription:', JSON.stringify(subscription), '| tier:', tier, '| stripe_customer_id:', (subscription as any)?.stripe_customer_id ?? null, '| stripe_subscription_id:', subscription?.stripe_subscription_id ?? null, '| status:', subscription?.status ?? null)}

              {/* Current plan */}
              <div className="rounded-card border border-accent-primary/40 bg-accent-primary/5 p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="font-heading font-bold text-sm text-text-primary">
                      {BILLING_TIERS.find(t => t.id === tier)?.name ?? 'Free Trial'}
                    </p>
                    <p className="font-mono text-lg text-accent-primary font-semibold leading-none mt-0.5">
                      {BILLING_TIERS.find(t => t.id === tier)?.monthlyPrice ?? 'Free'}
                      {tier && <span className="text-xs text-text-muted font-sans ml-1">/ month</span>}
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-accent-primary/20 text-accent-primary border border-accent-primary/30 font-heading uppercase tracking-wide flex-shrink-0">
                    Current Plan
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                  {subscription?.status === 'trialing' ? (
                    <span className="text-green-400 font-semibold">{trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} left in trial</span>
                  ) : subscription?.status === 'active' ? (
                    <span className="text-green-400 font-semibold">Active</span>
                  ) : (
                    <span className="text-red-400 font-semibold capitalize">{subscription?.status ?? 'No active plan'}</span>
                  )}
                  {subscription?.current_period_end && (
                    <span className="text-text-muted">
                      · Renews {new Date(subscription.current_period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>

              {/* Manage subscription via Stripe portal */}
              <div className="space-y-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void openBillingPortal()}
                  loading={portalLoading}
                  className="w-full"
                >
                  Manage Subscription
                </Button>
                {portalError && (
                  <p className="text-xs text-red-400">{portalError}</p>
                )}
                <p className="text-xs text-text-muted">
                  Upgrade, downgrade, update payment method or cancel — all managed securely through Stripe.
                </p>
              </div>

              <p className="text-xs text-text-muted pt-1">
                {t('settings.billing_contact')}{' '}
                <a href="mailto:info@kc.co.uk" className="text-accent-primary hover:underline">info@kc.co.uk</a>
              </p>
            </div>
          )}
        </Card>

        {/* Two-Factor Authentication */}
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck size={14} className={mfaEnabled ? 'text-green-400' : 'text-text-muted'} />
            <h3 className="font-heading text-sm uppercase tracking-wider text-text-primary flex-1">
              Two-Factor Authentication
            </h3>
            {mfaEnabled && (
              <span className="text-xs text-green-400 font-semibold">Enabled</span>
            )}
          </div>

          {mfaStep === 'confirmed' && (
            <div className="flex items-center gap-2 mb-3 text-sm text-green-400">
              <CheckCircle2 size={14} /> 2FA successfully enabled
            </div>
          )}

          {!mfaEnabled && mfaStep !== 'scan' && (
            <>
              <p className="text-xs text-text-muted mb-3">
                Add an extra layer of security. After signing in you'll be asked for a 6-digit code from your authenticator app.
              </p>
              <Button size="sm" onClick={() => void startEnroll()}>Enable 2FA</Button>
            </>
          )}

          {mfaStep === 'scan' && enrollUri && (
            <div className="space-y-4">
              <p className="text-xs text-text-muted">
                1. Download <strong className="text-text-primary">Google Authenticator</strong> or <strong className="text-text-primary">Authy</strong> on your phone
              </p>
              <p className="text-xs text-text-muted">2. Scan this QR code with the app</p>
              <div className="flex justify-center py-2">
                <div className="bg-white p-3 rounded-card">
                  <QRCodeSVG value={enrollUri} size={180} />
                </div>
              </div>
              <p className="text-xs text-text-muted">3. Enter the 6-digit code shown in the app</p>
              <Input
                label="Verification Code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={mfaCode}
                onChange={e => { setMfaCode(e.target.value.replace(/\D/g, '')); setMfaError(null) }}
                placeholder="000000"
              />
              {mfaError && <p className="text-xs text-red-400">{mfaError}</p>}
              <div className="flex gap-2">
                <Button size="sm" onClick={() => void confirmEnroll()} loading={mfaVerifying} disabled={mfaCode.length !== 6}>
                  Confirm
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setMfaStep('idle'); setEnrollUri(null); setMfaError(null) }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {mfaEnabled && mfaStep !== 'scan' && (
            <button
              type="button"
              onClick={() => void disableMfa()}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors cursor-pointer mt-1"
            >
              <ShieldOff size={12} /> Disable 2FA
            </button>
          )}
        </Card>

        {/* Team Branding — Pro Team only */}
        {tier === 'pro_team' && (
          <Card>
            <h3 className="font-heading text-sm uppercase tracking-wider text-text-primary mb-1">Team Branding</h3>
            <p className="text-xs text-text-muted mb-4">Your logo and team name appear on all exported setup sheet PDFs and throughout the app.</p>

            {/* Dual logo upload */}
            <div className="mb-4">
              <p className="font-heading text-xs uppercase tracking-wider text-text-muted mb-2">Team Logo</p>
              <p className="text-xs text-text-muted mb-3">
                Use a <span className="text-text-primary font-semibold">transparent PNG</span> for the most professional look on any background.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {/* Light background logo */}
                <div>
                  <p className="text-xs text-text-muted mb-1.5 font-medium">Light / White background</p>
                  <div className="rounded-card border border-border-color bg-white flex items-center justify-center overflow-hidden h-20 mb-2">
                    {brandingLogoUrl ? (
                      <img src={brandingLogoUrl} alt="Logo on light background" className="max-w-full max-h-full object-contain p-2" />
                    ) : (
                      <ImagePlus size={18} className="text-gray-300" />
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Button size="sm" variant="secondary" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}>
                      {uploadingLogo ? 'Uploading…' : brandingLogoUrl ? 'Change' : 'Upload'}
                    </Button>
                    {brandingLogoUrl && (
                      <button type="button" onClick={() => setBrandingLogoUrl(null)}
                        className="flex items-center gap-1 text-xs text-text-muted hover:text-accent-secondary cursor-pointer transition-colors">
                        <Trash2 size={10} /> Remove
                      </button>
                    )}
                  </div>
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                </div>

                {/* Dark background logo */}
                <div>
                  <p className="text-xs text-text-muted mb-1.5 font-medium">Dark / Black background</p>
                  <div className="rounded-card border border-border-color bg-[#12121A] flex items-center justify-center overflow-hidden h-20 mb-2">
                    {brandingLogoDarkUrl ? (
                      <img src={brandingLogoDarkUrl} alt="Logo on dark background" className="max-w-full max-h-full object-contain p-2" />
                    ) : (
                      <ImagePlus size={18} className="text-[#3A3A4A]" />
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Button size="sm" variant="secondary" onClick={() => logoDarkInputRef.current?.click()} disabled={uploadingLogoDark}>
                      {uploadingLogoDark ? 'Uploading…' : brandingLogoDarkUrl ? 'Change' : 'Upload'}
                    </Button>
                    {brandingLogoDarkUrl && (
                      <button type="button" onClick={() => setBrandingLogoDarkUrl(null)}
                        className="flex items-center gap-1 text-xs text-text-muted hover:text-accent-secondary cursor-pointer transition-colors">
                        <Trash2 size={10} /> Remove
                      </button>
                    )}
                  </div>
                  <input ref={logoDarkInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoDarkChange} />
                </div>
              </div>
              <p className="text-xs text-text-muted mt-2">Used on PDFs (light) and in the app interface (dark).</p>
            </div>

            {/* Team name */}
            <div className="mb-4">
              <Input
                label="Team Name"
                placeholder="e.g. Apex Racing"
                value={brandingName}
                onChange={e => setBrandingName(e.target.value)}
              />
              <p className="text-xs text-text-muted mt-1">Shown on PDF exports alongside your logo.</p>
            </div>

            <Button size="sm" onClick={() => void handleSaveBranding()} loading={savingBranding}>
              {brandingSaved ? '✓ Saved' : 'Save Branding'}
            </Button>
            {brandingError && (
              <p className="text-xs text-red-400 mt-2">{brandingError}</p>
            )}
          </Card>
        )}

        {/* Sign Out */}
        <Card>
          <button
            type="button"
            disabled={signingOut}
            onClick={() => void signOut()}
            className="w-full py-2 px-4 bg-black text-white text-sm font-semibold rounded-card cursor-pointer hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            {signingOut ? t('settings.signing_out') : t('settings.sign_out')}
          </button>
        </Card>

        {/* Danger Zone */}
        <Card>
          <h3 className="font-heading text-sm uppercase tracking-wider text-red-400 mb-2">Danger Zone</h3>
          <p className="text-xs text-text-muted mb-3">
            Permanently delete your account and all associated data. This cannot be reversed.
          </p>
          <button
            type="button"
            onClick={() => setDeleteModalOpen(true)}
            className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 font-semibold transition-colors cursor-pointer"
          >
            <Trash2 size={14} /> Delete Account
          </button>
        </Card>
      </div>

      {/* TOTP gate — preferred when Google Authenticator is set up */}
      <ConfirmTotpModal
        open={totpModalOpen}
        factorId={mfaFactorId}
        onCancel={() => setTotpModalOpen(false)}
        onConfirmed={() => {
          setTotpModalOpen(false)
          void executeSaveProfile()
        }}
      />

      {/* Password gate — fallback for users without TOTP (email changes only) */}
      <ConfirmPasswordModal
        open={confirmModalOpen}
        title="Confirm your identity"
        description="Enter your current password to change your email address."
        onCancel={() => setConfirmModalOpen(false)}
        onConfirmed={() => {
          setConfirmModalOpen(false)
          void executeSaveProfile()
        }}
      />

      {/* Delete Account Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-bg-card rounded-card border border-border-color w-full max-w-sm p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={18} className="text-red-400 flex-shrink-0" />
              <h3 className="font-heading text-base font-bold text-text-primary">Delete Account</h3>
            </div>
            <p className="text-sm text-text-muted mb-2">
              <strong className="text-text-primary">This cannot be undone.</strong> All data stored against your account will be permanently deleted, including:
            </p>
            <ul className="text-sm text-text-muted mb-5 space-y-1 list-disc list-inside">
              <li>All sessions and setup data</li>
              <li>All kart profiles</li>
              <li>All race weekends</li>
              <li>Team branding &amp; settings</li>
            </ul>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deletingAccount}
              >
                Cancel
              </Button>
              <button
                type="button"
                onClick={() => void deleteAccount()}
                disabled={deletingAccount}
                className="flex-1 py-1.5 px-3 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-card cursor-pointer transition-colors disabled:opacity-50"
              >
                {deletingAccount ? 'Deleting…' : 'Yes, Delete Everything'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
