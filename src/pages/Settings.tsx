import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, ChevronDown, ChevronUp, Zap, Camera, ShieldCheck, ShieldOff, ImagePlus, Trash2, AlertTriangle } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Card, Button, Input, SegmentedControl } from '@/components/ui'
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

const TIER_ORDER = ['privateer', 'team', 'pro_team']

export function SettingsPage() {
  const navigate = useNavigate()
  const { user }  = useAuth()
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
  const [billingOpen, setBillingOpen] = useState(false)
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
    void supabase.auth.mfa.listFactors().then(({ data }) => {
      const verified = data?.totp?.find(f => f.status === 'verified')
      if (verified) { setMfaEnabled(true); setMfaFactorId(verified.id) }
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

  const [fullName, setFullName] = useState<string>(
    (user?.user_metadata?.full_name as string | undefined) ?? ''
  )
  const [savingName, setSavingName] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    (user?.user_metadata?.avatar_url as string | undefined) ?? null
  )
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
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

  async function saveName() {
    if (!fullName.trim()) return
    setSavingName(true)
    await supabase.auth.updateUser({ data: { full_name: fullName.trim() } })
    setSavingName(false)
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
          <h3 className="font-heading text-sm uppercase tracking-wider text-text-primary mb-4">{t('settings.profile')}</h3>
          <div className="flex items-center gap-4 mb-4">
            {/* Avatar */}
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
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary truncate">{displayName}</p>
              <p className="text-xs text-text-muted truncate">{user?.email ?? '—'}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder={t('settings.full_name')}
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && void saveName()}
              />
            </div>
            <Button size="sm" onClick={() => void saveName()} loading={savingName} disabled={!fullName.trim()}>
              {t('settings.save')}
            </Button>
          </div>
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

              {/* Change plan */}
              <div>
                <p className="font-heading text-xs uppercase tracking-wider text-text-muted mb-2">Change Plan</p>
                <div className="space-y-2">
                  {BILLING_TIERS.filter(t => t.id !== tier).map(plan => {
                    const currentIdx = tier ? TIER_ORDER.indexOf(tier) : -1
                    const planIdx = TIER_ORDER.indexOf(plan.id)
                    const isUpgrade = planIdx > currentIdx
                    return (
                      <div key={plan.id} className="rounded-card border border-border-color bg-bg-elevated p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-heading font-bold text-sm text-text-primary">{plan.name}</p>
                            <p className="font-mono text-base text-text-secondary leading-none mt-0.5">
                              {plan.monthlyPrice}
                              <span className="text-xs text-text-muted font-sans ml-1">/ month</span>
                            </p>
                            <ul className="mt-2 space-y-0.5">
                              {plan.features.map(f => (
                                <li key={f} className="flex items-center gap-1.5 text-xs text-text-muted">
                                  <CheckCircle2 size={10} className="text-accent-primary flex-shrink-0" />
                                  {f}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="flex-shrink-0">
                            <Button
                              size="sm"
                              variant={isUpgrade ? 'primary' : 'secondary'}
                              onClick={() => navigate('/subscribe')}
                            >
                              {isUpgrade ? 'Upgrade' : 'Downgrade'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
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
