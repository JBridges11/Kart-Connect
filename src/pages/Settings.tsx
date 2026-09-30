import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  CheckCircle2, ChevronDown, Zap, Camera, ShieldCheck, ShieldOff,
  ImagePlus, Trash2, AlertTriangle, Pencil, X, Lock,
  User, Palette, CalendarDays, Bell, Globe, Tag, Shield, LogOut,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Card, Button, Input, SegmentedControl, Select, ConfirmPasswordModal, ConfirmTotpModal } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { LANGUAGES } from '@/i18n'
import { supabase } from '@/lib/supabase'
import { useSubscription } from '@/hooks/useSubscription'
import { useTeamBranding } from '@/hooks/useTeamBranding'
import { useTracks } from '@/hooks/useTracks'
import { useKarts } from '@/hooks/useKarts'
import type { PressureUnit, TempUnit, SpeedUnit } from '@/types'

// ─── Billing tiers ────────────────────────────────────────────────────────────
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

// ─── Accordion section wrapper ────────────────────────────────────────────────
function AccSection({
  icon, title, open, onToggle, children,
}: {
  icon: React.ReactNode
  title: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <Card>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2 cursor-pointer"
      >
        <span className="flex-shrink-0 text-accent-primary">{icon}</span>
        <h3 className="font-heading text-sm uppercase tracking-wider text-text-primary flex-1 text-left">
          {title}
        </h3>
        <ChevronDown
          size={15}
          className={`text-text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <div className="mt-4">{children}</div>}
    </Card>
  )
}

// ─── On/off toggle switch ─────────────────────────────────────────────────────
function SwitchRow({
  label, desc, checked, onChange,
}: {
  label: string
  desc?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-3 border-b border-border-color last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-primary font-medium">{label}</p>
        {desc && <p className="text-xs text-text-muted mt-0.5">{desc}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={[
          'relative flex-shrink-0 w-10 h-5 rounded-full transition-colors duration-200 cursor-pointer mt-0.5',
          checked ? 'bg-accent-primary' : 'bg-bg-elevated border border-border-color',
        ].join(' ')}
      >
        <span className={[
          'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200',
          checked ? 'translate-x-5' : 'translate-x-0',
        ].join(' ')} />
      </button>
    </div>
  )
}

// ─── Main settings page ───────────────────────────────────────────────────────
export function SettingsPage() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { user }  = useAuth()
  const { language, setLanguage, t } = useLanguage()
  const { subscription, tier, trialDaysLeft } = useSubscription()
  const { branding, save: saveBranding, uploadLogo, uploadLogoDark } = useTeamBranding()
  const { data: tracks } = useTracks()
  const { data: karts }  = useKarts()

  // ── Accordion open state — persisted to sessionStorage so a mid-save auth
  //    state change (which remounts this component) doesn't collapse everything
  const OPENS_KEY = 'kc_settings_opens'
  const [opens, setOpens] = useState(() => {
    try {
      const saved = sessionStorage.getItem(OPENS_KEY)
      if (saved) return JSON.parse(saved) as Record<string, boolean>
    } catch { /* ignore */ }
    return {
      profile: false, appearance: false, sessionDefaults: false,
      notifications: false, language: false, branding: false,
      billing: false, privacy: false, security: false, account: false,
    }
  })
  function toggle(key: keyof typeof opens) {
    setOpens(o => {
      const next = { ...o, [key]: !o[key] }
      try { sessionStorage.setItem(OPENS_KEY, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }

  // ── Theme ─────────────────────────────────────────────────────────────────
  const [theme, setTheme] = useState<'light' | 'dark'>(
    (localStorage.getItem('kc_theme') as 'light' | 'dark') ?? 'light'
  )
  function applyTheme(t: 'light' | 'dark') {
    setTheme(t)
    localStorage.setItem('kc_theme', t)
    document.documentElement.setAttribute('data-theme', t)
  }

  // ── Units ─────────────────────────────────────────────────────────────────
  const [pressureUnit, setPressureUnit] = useState<PressureUnit>(
    (localStorage.getItem('kc_pressure_unit') as PressureUnit) ?? 'bar'
  )
const [tempUnit, setTempUnit] = useState<TempUnit>(
    (localStorage.getItem('kc_temp_unit') as TempUnit) ?? 'c'
  )
  const [speedUnit, setSpeedUnit] = useState<SpeedUnit>(
    (localStorage.getItem('kc_speed_unit') as SpeedUnit) ?? 'kph'
  )
  function savePressureUnit(u: PressureUnit) { setPressureUnit(u); localStorage.setItem('kc_pressure_unit', u) }
function saveTempUnit(u: TempUnit)         { setTempUnit(u);     localStorage.setItem('kc_temp_unit', u) }
  function saveSpeedUnit(u: SpeedUnit)       { setSpeedUnit(u);    localStorage.setItem('kc_speed_unit', u) }

  // ── Session defaults ──────────────────────────────────────────────────────
  const [sessDefaults, setSessDefaults] = useState({
    track_id:   '',
    kart_id:    '',
    visibility: 'private' as 'private' | 'team',
  })
  const [savingSessDefaults, setSavingSessDefaults] = useState(false)
  const [sessDefaultsSaved, setSessDefaultsSaved]   = useState(false)

  async function saveSessDefaults() {
    setSavingSessDefaults(true)
    await supabase.auth.updateUser({ data: { session_defaults: sessDefaults } })
    setSavingSessDefaults(false)
    setSessDefaultsSaved(true)
    setTimeout(() => setSessDefaultsSaved(false), 3000)
  }

  // ── Notifications ─────────────────────────────────────────────────────────
  const [notifs, setNotifs] = useState({
    setup_shared:     true,
    teammate_joined:  true,
    session_comments: true,
    billing_emails:   true,
    product_updates:  false,
  })
  const [savingNotifs, setSavingNotifs]   = useState(false)
  const [notifsSaved, setNotifsSaved]     = useState(false)

  async function saveNotifs() {
    setSavingNotifs(true)
    await supabase.auth.updateUser({ data: { notifications: notifs } })
    setSavingNotifs(false)
    setNotifsSaved(true)
    setTimeout(() => setNotifsSaved(false), 3000)
  }

  // ── Load prefs from user_metadata on mount ────────────────────────────────
  useEffect(() => {
    if (!user) return
    const meta = user.user_metadata as Record<string, unknown> | undefined ?? {}
    if (meta.session_defaults) setSessDefaults(prev => ({ ...prev, ...(meta.session_defaults as typeof sessDefaults) }))
    if (meta.notifications)    setNotifs(prev =>       ({ ...prev, ...(meta.notifications as typeof notifs) }))
  }, [user])

  // ── Profile ───────────────────────────────────────────────────────────────
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileName,    setProfileName]    = useState('')
  const [profileEmail,   setProfileEmail]   = useState('')
  const [profilePhone,   setProfilePhone]   = useState('')
  const [profileRaceNum, setProfileRaceNum] = useState('')
  const [savingProfile,  setSavingProfile]  = useState(false)
  const [profileError,   setProfileError]   = useState<string | null>(null)
  const [profileSaved,   setProfileSaved]   = useState(false)
  const [emailChangePending,    setEmailChangePending]    = useState(false)
  const [pendingNewEmail,       setPendingNewEmail]       = useState('')
  const [emailChangeConfirmed,  setEmailChangeConfirmed]  = useState(false)
  const [totpModalOpen,    setTotpModalOpen]    = useState(false)
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const pendingEmailRef      = useRef('')
  const initialHash          = useRef(window.location.hash)
  const initialSearch        = useRef(window.location.search)
  const emailConfirmingRef   = useRef(false)
  const fullName             = profileName

  useEffect(() => {
    const locState = location.state as Record<string, unknown> | null
    const fromEmailConfirm = locState?.emailChanged === true
    const hashParams  = new URLSearchParams(initialHash.current.replace(/^#/, ''))
    const queryParams = new URLSearchParams(initialSearch.current)
    const typeParam   = hashParams.get('type') ?? queryParams.get('type')
    if (!fromEmailConfirm && typeParam !== 'email_change') return
    emailConfirmingRef.current = true
    window.history.replaceState({}, '', window.location.pathname)
    supabase.auth.getUser().then(({ data: { user: freshUser } }) => {
      const freshEmail = freshUser?.email
      if (freshEmail) {
        setProfileEmail(freshEmail)
        setEmailChangePending(false)
        setPendingNewEmail('')
        setEmailChangeConfirmed(true)
        setTimeout(() => setEmailChangeConfirmed(false), 6000)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (user) {
      setProfileName((user.user_metadata?.full_name as string | undefined) ?? '')
      if (!emailConfirmingRef.current) setProfileEmail(user.email ?? '')
      setProfilePhone((user.user_metadata?.phone_number as string | undefined) ?? '')
      setProfileRaceNum((user.user_metadata?.race_number as string | undefined) ?? '')
    }
  }, [user])

  const hasPasswordAuth = user?.identities?.some(id => id.provider === 'email') ?? false
  const [mfaEnabled, setMfaEnabled]   = useState(false)
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null)

  useEffect(() => {
    void supabase.auth.mfa.listFactors().then(({ data, error }) => {
      if (error) return
      const fromTotp = data?.totp?.find(f => f.status === 'verified')
      const fromAll  = (data as any)?.all?.find(
        (f: { factor_type: string; status: string }) => f.factor_type === 'totp' && f.status === 'verified'
      )
      const verified = fromTotp ?? fromAll ?? null
      if (verified) { setMfaEnabled(true); setMfaFactorId(verified.id) }
    })
  }, [])

  function saveProfile() {
    const trimmedEmail  = profileEmail.trim()
    const emailChanging = trimmedEmail !== '' && trimmedEmail !== (user?.email ?? '')
    if (emailChanging) {
      pendingEmailRef.current = trimmedEmail
      if (mfaEnabled && mfaFactorId) { setTotpModalOpen(true); return }
      if (hasPasswordAuth) { setConfirmModalOpen(true); return }
    }
    void executeSaveProfile()
  }

  async function executeSaveProfile() {
    const intendedEmail = pendingEmailRef.current
    pendingEmailRef.current = ''
    setSavingProfile(true)
    setProfileError(null)
    setEmailChangePending(false)
    try {
      const { error: metaErr } = await supabase.auth.updateUser({
        data: { full_name: profileName.trim(), phone_number: profilePhone.trim(), race_number: profileRaceNum.trim() },
      })
      if (metaErr) throw metaErr
      const newEmail    = intendedEmail || profileEmail.trim()
      const emailChanging = newEmail !== '' && newEmail !== (user?.email ?? '')
      if (emailChanging) {
        await supabase.auth.updateUser({ data: { _pending_email_change: newEmail } })
        const { error: fnErr } = await supabase.functions.invoke('update-email', { body: { newEmail } })
        if (fnErr) {
          void supabase.auth.updateUser({ data: { _pending_email_change: null } })
          throw new Error(fnErr.message ?? 'Failed to update email')
        }
        await supabase.auth.refreshSession()
        setEmailChangePending(false)
        setPendingNewEmail('')
      }
      setProfileSaved(true)
      setEditingProfile(false)
      setTimeout(() => setProfileSaved(false), 4000)
    } catch (e) {
      setProfileError(e instanceof Error ? e.message : 'Failed to save profile')
    } finally {
      setSavingProfile(false)
    }
  }

  function cancelEdit() {
    setProfileName((user?.user_metadata?.full_name as string | undefined) ?? '')
    setProfileEmail(user?.email ?? '')
    setProfilePhone((user?.user_metadata?.phone_number as string | undefined) ?? '')
    setProfileRaceNum((user?.user_metadata?.race_number as string | undefined) ?? '')
    setProfileError(null)
    setPendingNewEmail('')
    setEmailChangePending(false)
    setEditingProfile(false)
  }

  const [avatarUrl,       setAvatarUrl]       = useState<string | null>((user?.user_metadata?.avatar_url as string | undefined) ?? null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarError,     setAvatarError]     = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setAvatarError(null)
    setUploadingAvatar(true)
    // Resize to max 256px and convert to base64 for reliable storage
    const canvas = document.createElement('canvas')
    const img    = new Image()
    const url    = URL.createObjectURL(file)
    img.onload = async () => {
      const size = Math.min(img.width, img.height)
      canvas.width  = 256
      canvas.height = 256
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, (img.width - size) / 2, (img.height - size) / 2, size, size, 0, 0, 256, 256)
      URL.revokeObjectURL(url)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
      setAvatarUrl(dataUrl)
      const { error } = await supabase.auth.updateUser({ data: { avatar_url: dataUrl } })
      if (error) setAvatarError('Could not save profile photo.')
      setUploadingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      setAvatarError('Could not read image file.')
      setUploadingAvatar(false)
    }
    img.src = url
  }

  // ── Team branding ─────────────────────────────────────────────────────────
  const [brandingName,        setBrandingName]        = useState('')
  const [brandingLogoUrl,     setBrandingLogoUrl]     = useState<string | null>(null)
  const [brandingLogoDarkUrl, setBrandingLogoDarkUrl] = useState<string | null>(null)
  const [brandingPrimary,     setBrandingPrimary]     = useState('#CA8A04')
  const [brandingSecondary,   setBrandingSecondary]   = useState('#12121A')
  const [uploadingLogo,       setUploadingLogo]       = useState(false)
  const [uploadingLogoDark,   setUploadingLogoDark]   = useState(false)
  const [savingBranding,      setSavingBranding]      = useState(false)
  const [brandingSaved,       setBrandingSaved]       = useState(false)
  const [brandingError,       setBrandingError]       = useState<string | null>(null)
  const logoInputRef     = useRef<HTMLInputElement>(null)
  const logoDarkInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setBrandingName(branding.team_name ?? '')
    setBrandingLogoUrl(branding.logo_url ?? null)
    setBrandingLogoDarkUrl(branding.logo_url_dark ?? null)
    setBrandingPrimary(branding.primary_color ?? '#E8FF00')
    setBrandingSecondary(branding.secondary_color ?? '#12121A')
  }, [branding])

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
      if (err) setBrandingError(err)
      else { setBrandingSaved(true); setTimeout(() => setBrandingSaved(false), 3000) }
    } catch (e) {
      setBrandingError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSavingBranding(false)
    }
  }

  // ── Billing portal ────────────────────────────────────────────────────────
  const [portalLoading, setPortalLoading] = useState(false)
  const [portalError,   setPortalError]   = useState<string | null>(null)

  async function openBillingPortal() {
    setPortalLoading(true)
    setPortalError(null)
    const { data, error } = await supabase.functions.invoke('create-portal-session', {})
    setPortalLoading(false)
    if (error || !data?.url) { setPortalError('Could not open billing portal — please try again or contact support.'); return }
    window.location.href = data.url
  }

  // ── Data export ───────────────────────────────────────────────────────────
  const [exporting,    setExporting]    = useState(false)
  const [exportError,  setExportError]  = useState<string | null>(null)

  async function exportData() {
    setExporting(true)
    setExportError(null)
    const { data, error } = await supabase.functions.invoke('export-user-data', {})
    setExporting(false)
    if (error || !data?.url) {
      setExportError('Data export is not available yet. Contact info@kart-connect.com to request your data.')
      return
    }
    window.location.href = data.url
  }

  // ── 2FA ───────────────────────────────────────────────────────────────────
  const [enrollUri,       setEnrollUri]       = useState<string | null>(null)
  const [enrollFactorId,  setEnrollFactorId]  = useState<string | null>(null)
  const [mfaCode,         setMfaCode]         = useState('')
  const [mfaVerifying,    setMfaVerifying]    = useState(false)
  const [mfaError,        setMfaError]        = useState<string | null>(null)
  const [mfaStep,         setMfaStep]         = useState<'idle' | 'scan' | 'confirmed'>('idle')

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

  // ── Account actions ───────────────────────────────────────────────────────
  const [signingOut,      setSigningOut]      = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)

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

  // ── Display helpers ───────────────────────────────────────────────────────
  const displayName = (fullName.trim() || user?.email?.split('@')[0] || '?')
  const initials    = displayName.slice(0, 2).toUpperCase()

  // ── Deleting screen ───────────────────────────────────────────────────────
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
      <div className="max-w-lg mx-auto space-y-3">

        {/* ── 1. Profile ─────────────────────────────────────────────────── */}
        <AccSection icon={<User size={14} />} title={t('settings.profile')} open={opens.profile} onToggle={() => toggle('profile')}>
          {/* Avatar row */}
          <div className="flex items-center gap-4 mb-5">
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 rounded-full bg-accent-primary/20 flex items-center justify-center overflow-hidden">
                {avatarUrl
                  ? <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                  : <span className="text-accent-primary font-bold text-lg">{initials}</span>
                }
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
            {!editingProfile && (
              <button
                type="button"
                onClick={() => setEditingProfile(true)}
                className="flex items-center gap-1.5 text-xs text-accent-primary hover:text-accent-primary/80 font-semibold transition-colors cursor-pointer flex-shrink-0"
              >
                <Pencil size={11} /> Edit
              </button>
            )}
          </div>

          {/* Read-only view */}
          {!editingProfile && (
            <div className="space-y-0">
              {[
                { label: 'Full Name',    value: profileName    || '—' },
                { label: 'Email',        value: profileEmail   || '—' },
                { label: 'Phone Number', value: profilePhone   || '—' },
                { label: 'Race Number',  value: profileRaceNum ? `#${profileRaceNum}` : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-2.5 border-b border-border-color last:border-0">
                  <span className="text-xs text-text-muted font-heading uppercase tracking-wider">{label}</span>
                  <span className="text-sm text-text-primary font-medium">{value}</span>
                </div>
              ))}
              {profileSaved && (
                <p className="text-xs text-green-400 flex items-center gap-1 pt-2"><CheckCircle2 size={11} /> Profile saved</p>
              )}
              {emailChangeConfirmed && (
                <p className="text-xs text-green-400 flex items-center gap-1 pt-2"><CheckCircle2 size={11} /> Email updated successfully.</p>
              )}
              {emailChangePending && !emailChangeConfirmed && (
                <p className="text-xs text-amber-400 pt-2">
                  Verification sent to <strong>{pendingNewEmail}</strong>. Click the link in your inbox to confirm.
                </p>
              )}
            </div>
          )}

          {/* Edit form */}
          {editingProfile && (
            <div className="space-y-3">
              <Input label="Full Name" placeholder="e.g. Jack Smith" value={profileName} onChange={e => setProfileName(e.target.value)} />
              <div>
                <Input label="Email Address" type="email" placeholder="you@example.com" value={profileEmail} onChange={e => setProfileEmail(e.target.value)} />
                {profileEmail !== (user?.email ?? '') ? (
                  <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                    <Lock size={10} className="flex-shrink-0" />
                    {mfaEnabled ? "You'll be asked for your authenticator code." : "You'll be asked to confirm your password."}
                  </p>
                ) : (mfaEnabled || hasPasswordAuth) && (
                  <p className="text-xs text-text-muted mt-1 flex items-center gap-1">
                    <Lock size={10} className="flex-shrink-0" />
                    {mfaEnabled ? 'Authenticator code required to change email' : 'Password required to change email'}
                  </p>
                )}
              </div>
              <Input label="Phone Number" type="tel" placeholder="e.g. +44 7700 900000" value={profilePhone} onChange={e => setProfilePhone(e.target.value)} />
              <div>
                <Input
                  label="Race Number"
                  placeholder="e.g. 42"
                  value={profileRaceNum}
                  onChange={e => setProfileRaceNum(e.target.value.replace(/\D/g, '').slice(0, 3))}
                />
                <p className="text-xs text-text-muted mt-1">Shown on exported setup PDFs</p>
              </div>
              {profileError && <p className="text-xs text-red-400">{profileError}</p>}
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={saveProfile} loading={savingProfile}>Save Profile</Button>
                <button type="button" onClick={cancelEdit} disabled={savingProfile}
                  className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors cursor-pointer disabled:opacity-50">
                  <X size={12} /> Cancel
                </button>
              </div>
            </div>
          )}
          {avatarError && <p className="text-xs text-amber-400 mt-2">{avatarError}</p>}
        </AccSection>

        {/* ── 2. Appearance ──────────────────────────────────────────────── */}
        <AccSection icon={<Palette size={14} />} title="Appearance" open={opens.appearance} onToggle={() => toggle('appearance')}>
          <div className="space-y-5">
            {/* Theme */}
            <div>
              <p className="font-heading text-xs uppercase tracking-wider text-text-muted mb-3">Theme</p>
              <div className="grid grid-cols-2 gap-2">
                {(['light', 'dark'] as const).map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => applyTheme(opt)}
                    className={[
                      'py-2 px-3 rounded-card border text-xs font-heading font-bold uppercase tracking-wider transition-all cursor-pointer capitalize',
                      theme === opt
                        ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                        : 'border-border-color bg-bg-elevated text-text-muted hover:border-accent-primary/40 hover:text-text-primary',
                    ].join(' ')}
                  >
                    {opt === 'light' ? '☀️ Light' : '🌙 Dark'}
                  </button>
                ))}
              </div>
            </div>

            {/* Units */}
            <div className="pt-2 border-t border-border-color space-y-4">
              <p className="font-heading text-xs uppercase tracking-wider text-text-muted">Units</p>
              <SegmentedControl
                label={t('settings.pressure_unit')}
                options={[{ label: 'Bar', value: 'bar' }, { label: 'PSI', value: 'psi' }]}
                value={pressureUnit}
                onChange={v => savePressureUnit(v as PressureUnit)}
              />
<SegmentedControl
                label={t('settings.temperature_unit')}
                options={[{ label: 'Celsius (°C)', value: 'c' }, { label: 'Fahrenheit (°F)', value: 'f' }]}
                value={tempUnit}
                onChange={v => saveTempUnit(v as TempUnit)}
              />
              <SegmentedControl
                label={t('settings.speed_unit')}
                options={[{ label: 'KPH', value: 'kph' }, { label: 'MPH', value: 'mph' }]}
                value={speedUnit}
                onChange={v => saveSpeedUnit(v as SpeedUnit)}
              />
            </div>
          </div>
        </AccSection>

        {/* ── 3. Session defaults ─────────────────────────────────────────── */}
        <AccSection icon={<CalendarDays size={14} />} title="Session Defaults" open={opens.sessionDefaults} onToggle={() => toggle('sessionDefaults')}>
          <div className="space-y-4">
            <Select
              label="Default Track"
              placeholder="No default"
              value={sessDefaults.track_id}
              onChange={e => setSessDefaults(d => ({ ...d, track_id: e.target.value }))}
              options={tracks.map(t => ({ label: t.name, value: t.id }))}
            />
            <Select
              label="Default Kart"
              placeholder="No default"
              value={sessDefaults.kart_id}
              onChange={e => setSessDefaults(d => ({ ...d, kart_id: e.target.value }))}
              options={karts.map(k => ({ label: k.nickname || k.kart_class || 'Unnamed kart', value: k.id }))}
            />
            <SegmentedControl
              label="Default Visibility"
              options={[{ label: 'Private', value: 'private' }, { label: 'Team', value: 'team' }]}
              value={sessDefaults.visibility}
              onChange={v => setSessDefaults(d => ({ ...d, visibility: v as 'private' | 'team' }))}
            />
            <div className="pt-1">
              <Button size="sm" onClick={() => void saveSessDefaults()} loading={savingSessDefaults}>
                {sessDefaultsSaved ? '✓ Saved' : 'Save Defaults'}
              </Button>
            </div>
          </div>
        </AccSection>

        {/* ── 4. Notifications ───────────────────────────────────────────── */}
        <AccSection icon={<Bell size={14} />} title="Notifications" open={opens.notifications} onToggle={() => toggle('notifications')}>
          <div className="space-y-0">
            <SwitchRow
              label="Setup shared"
              desc="When someone shares a setup sheet with you"
              checked={notifs.setup_shared}
              onChange={v => setNotifs(n => ({ ...n, setup_shared: v }))}
            />
            <SwitchRow
              label="Teammate joins session"
              desc="When a team member starts a new session"
              checked={notifs.teammate_joined}
              onChange={v => setNotifs(n => ({ ...n, teammate_joined: v }))}
            />
            <SwitchRow
              label="Session comments"
              desc="Replies and mentions on your sessions"
              checked={notifs.session_comments}
              onChange={v => setNotifs(n => ({ ...n, session_comments: v }))}
            />
            <SwitchRow
              label="Billing emails"
              desc="Receipts, renewal reminders, and payment alerts"
              checked={notifs.billing_emails}
              onChange={v => setNotifs(n => ({ ...n, billing_emails: v }))}
            />
            <SwitchRow
              label="Product updates"
              desc="New features, tips, and release notes"
              checked={notifs.product_updates}
              onChange={v => setNotifs(n => ({ ...n, product_updates: v }))}
            />
          </div>
          <div className="pt-4">
            <Button size="sm" onClick={() => void saveNotifs()} loading={savingNotifs}>
              {notifsSaved ? '✓ Saved' : 'Save Preferences'}
            </Button>
          </div>
        </AccSection>

        {/* ── 5. Language ────────────────────────────────────────────────── */}
        <AccSection icon={<Globe size={14} />} title={t('settings.language')} open={opens.language} onToggle={() => toggle('language')}>
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
        </AccSection>

        {/* ── 6. Team branding ───────────────────────────────────────────── */}
        {tier === 'pro_team' && (
          <AccSection icon={<Tag size={14} />} title="Team Branding" open={opens.branding} onToggle={() => toggle('branding')}>
            <p className="text-xs text-text-muted mb-4">Your logo and team name appear on all exported setup sheet PDFs and throughout the app.</p>

            <div className="mb-4">
              <p className="font-heading text-xs uppercase tracking-wider text-text-muted mb-2">Team Logo</p>
              <p className="text-xs text-text-muted mb-3">
                Use a <span className="text-text-primary font-semibold">transparent PNG</span> for the most professional look.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-text-muted mb-1.5 font-medium">Light / White background</p>
                  <div className="rounded-card border border-border-color bg-white flex items-center justify-center overflow-hidden h-20 mb-2">
                    {brandingLogoUrl
                      ? <img src={brandingLogoUrl} alt="Logo light" className="max-w-full max-h-full object-contain p-2" />
                      : <ImagePlus size={18} className="text-gray-300" />
                    }
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
                <div>
                  <p className="text-xs text-text-muted mb-1.5 font-medium">Dark / Black background</p>
                  <div className="rounded-card border border-border-color bg-[#12121A] flex items-center justify-center overflow-hidden h-20 mb-2">
                    {brandingLogoDarkUrl
                      ? <img src={brandingLogoDarkUrl} alt="Logo dark" className="max-w-full max-h-full object-contain p-2" />
                      : <ImagePlus size={18} className="text-[#3A3A4A]" />
                    }
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

            <div className="mb-4">
              <Input label="Team Name" placeholder="e.g. Apex Racing" value={brandingName} onChange={e => setBrandingName(e.target.value)} />
              <p className="text-xs text-text-muted mt-1">Shown on PDF exports alongside your logo.</p>
            </div>

            <Button size="sm" onClick={() => void handleSaveBranding()} loading={savingBranding}>
              {brandingSaved ? '✓ Saved' : 'Save Branding'}
            </Button>
            {brandingError && <p className="text-xs text-red-400 mt-2">{brandingError}</p>}
          </AccSection>
        )}

        {/* ── 7. Billing & Subscription ──────────────────────────────────── */}
        <AccSection icon={<Zap size={14} />} title="Billing &amp; Subscription" open={opens.billing} onToggle={() => toggle('billing')}>
          <div className="space-y-4">
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

            <div className="space-y-2">
              <Button type="button" size="sm" onClick={() => void openBillingPortal()} loading={portalLoading} className="w-full">
                Manage Subscription
              </Button>
              {portalError && <p className="text-xs text-red-400">{portalError}</p>}
              <p className="text-xs text-text-muted">
                Upgrade, downgrade, update payment method or cancel — managed securely through Stripe.
              </p>
            </div>

            <p className="text-xs text-text-muted pt-1">
              {t('settings.billing_contact')}{' '}
              <a href="mailto:info@kart-connect.com" className="text-accent-primary hover:underline">info@kart-connect.com</a>
            </p>
          </div>
        </AccSection>

        {/* ── 8. Privacy & data ──────────────────────────────────────────── */}
        <AccSection icon={<Shield size={14} />} title="Privacy &amp; Data" open={opens.privacy} onToggle={() => toggle('privacy')}>
          <div className="space-y-4">
            {/* Trust badge */}
            <div className="flex items-center gap-3 p-3 rounded-card border border-green-400/30 bg-green-400/5">
              <ShieldCheck size={18} className="text-green-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-text-primary">Session data protected</p>
                <p className="text-xs text-text-muted mt-0.5">Your setup data is encrypted at rest and in transit. Only you can access it.</p>
              </div>
            </div>

            {/* Export */}
            <div>
              <p className="text-sm font-medium text-text-primary mb-1">Export your data</p>
              <p className="text-xs text-text-muted mb-3">
                Download a copy of all your sessions, setups, and account information as a ZIP file.
              </p>
              <Button size="sm" variant="secondary" onClick={() => void exportData()} loading={exporting}>
                Export Data
              </Button>
              {exportError && <p className="text-xs text-amber-400 mt-2">{exportError}</p>}
            </div>

            {/* Links */}
            <div className="pt-2 border-t border-border-color flex gap-4">
              <a href="/privacy" target="_blank" rel="noopener noreferrer"
                className="text-xs text-accent-primary hover:underline">
                Privacy Policy
              </a>
              <a href="/terms" target="_blank" rel="noopener noreferrer"
                className="text-xs text-accent-primary hover:underline">
                Terms &amp; Conditions
              </a>
            </div>
          </div>
        </AccSection>

        {/* ── 9. Security ────────────────────────────────────────────────── */}
        <AccSection icon={<ShieldCheck size={14} />} title="Security" open={opens.security} onToggle={() => toggle('security')}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-heading uppercase tracking-wider text-text-muted">Two-Factor Authentication</span>
            {mfaEnabled && <span className="text-xs text-green-400 font-semibold">Enabled</span>}
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
              <p className="text-xs text-text-muted">1. Download <strong className="text-text-primary">Google Authenticator</strong> or <strong className="text-text-primary">Authy</strong> on your phone</p>
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
                <Button size="sm" onClick={() => void confirmEnroll()} loading={mfaVerifying} disabled={mfaCode.length !== 6}>Confirm</Button>
                <Button size="sm" variant="ghost" onClick={() => { setMfaStep('idle'); setEnrollUri(null); setMfaError(null) }}>Cancel</Button>
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
        </AccSection>

        {/* ── 10. Account ────────────────────────────────────────────────── */}
        <AccSection icon={<LogOut size={14} />} title="Account" open={opens.account} onToggle={() => toggle('account')}>
          <div className="space-y-5">
            {/* Sign out */}
            <button
              type="button"
              disabled={signingOut}
              onClick={() => void signOut()}
              className="w-full py-2.5 px-4 bg-black text-white text-sm font-semibold rounded-card cursor-pointer hover:bg-neutral-800 transition-colors disabled:opacity-50"
            >
              {signingOut ? t('settings.signing_out') : t('settings.sign_out')}
            </button>

            {/* Danger zone */}
            <div className="pt-3 border-t border-border-color">
              <p className="font-heading text-xs uppercase tracking-wider text-red-400 mb-2">Danger Zone</p>
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
            </div>
          </div>
        </AccSection>

      </div>

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      <ConfirmTotpModal
        open={totpModalOpen}
        factorId={mfaFactorId}
        onCancel={() => setTotpModalOpen(false)}
        onConfirmed={() => { setTotpModalOpen(false); void executeSaveProfile() }}
      />
      <ConfirmPasswordModal
        open={confirmModalOpen}
        title="Confirm your identity"
        description="Enter your current password to change your email address."
        onCancel={() => setConfirmModalOpen(false)}
        onConfirmed={() => { setConfirmModalOpen(false); void executeSaveProfile() }}
      />

      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-bg-card rounded-card border border-border-color w-full max-w-sm p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={18} className="text-red-400 flex-shrink-0" />
              <h3 className="font-heading text-base font-bold text-text-primary">Delete Account</h3>
            </div>
            <p className="text-sm text-text-muted mb-2">
              <strong className="text-text-primary">This cannot be undone.</strong> All data will be permanently deleted, including:
            </p>
            <ul className="text-sm text-text-muted mb-5 space-y-1 list-disc list-inside">
              <li>All sessions and setup data</li>
              <li>All kart profiles</li>
              <li>All race weekends</li>
              <li>Team branding &amp; settings</li>
            </ul>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setDeleteModalOpen(false)} disabled={deletingAccount}>Cancel</Button>
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
