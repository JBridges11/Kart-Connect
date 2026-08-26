import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Clock, Thermometer, Wind, Droplets, FileDown, Camera, Sparkles } from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Card, Badge, Button, Modal, Input, Textarea, VoiceTextarea } from '@/components/ui'
import { SetupForm } from '@/components/forms/SetupForm'
import { useSession } from '@/hooks/useSessions'
import { useSetup } from '@/hooks/useSetup'
import { useLapTimes } from '@/hooks/useLapTimes'
import { useSetupChanges } from '@/hooks/useSetupChanges'
import { useTeamBranding } from '@/hooks/useTeamBranding'
import { supabase } from '@/lib/supabase'
import { lapMsToString, lapMsDelta, formatDate } from '@/lib/formatters'
import type { SetupFormData, PressureUnit, TempUnit, SpeedUnit } from '@/types'
import {
  displayTemp, inputTempToC, tempUnitLabel,
  displaySpeed, inputSpeedToKph, speedUnitLabel,
  displayWind,
} from '@/lib/units'

const conditionVariant: Record<string, 'info' | 'positive' | 'neutral'> = {
  dry: 'positive', wet: 'info', damp: 'neutral',
}

const SIBLING_COLORS = ['#60A5FA', '#34D399', '#F472B6', '#A78BFA', '#FB923C', '#38BDF8', '#4ADE80']

export function SessionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: session, loading: sessionLoading, refetch: refetchSession } = useSession(id ?? null)
  const { data: setup, loading: setupLoading, refetch: refetchSetup } = useSetup(id ?? null)
  const { data: lapTimes, bestLap, refetch: refetchLaps } = useLapTimes(id ?? null)
  const { data: changes, refetch: refetchChanges } = useSetupChanges(id ?? null)
  const { branding: teamBranding } = useTeamBranding()

  const [_editSetupOpen, setEditSetupOpen] = useState(false)
  const [hotPressureOpen, setHotPressureOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingHot, setSavingHot] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [changeOpen, setChangeOpen] = useState(false)
  const [changeDesc, setChangeDesc] = useState('')
  const [lapDelta, setLapDelta] = useState('')
  const [feedback, setFeedback] = useState('')
  const [hotFL, setHotFL] = useState('')
  const [hotFR, setHotFR] = useState('')
  const [hotRL, setHotRL] = useState('')
  const [hotRR, setHotRR] = useState('')
  const [engineMonOpen, setEngineMonOpen] = useState(false)
  const [savingEngineMon, setSavingEngineMon] = useState(false)
  const [emMaxEngineTemp, setEmMaxEngineTemp] = useState('')
  const [emLowEngineTemp, setEmLowEngineTemp] = useState('')
  const [emMaxExhaustTemp, setEmMaxExhaustTemp] = useState('')
  const [emLowExhaustTemp, setEmLowExhaustTemp] = useState('')
  const [emMaxRpm, setEmMaxRpm] = useState('')
  const [emLowRpm, setEmLowRpm] = useState('')
  const [emMaxSpeed, setEmMaxSpeed] = useState('')
  const [emLowSpeed, setEmLowSpeed] = useState('')
  const [lapInput, setLapInput] = useState('')
  const [lapInputError, setLapInputError] = useState(false)
  const [savingLap, setSavingLap] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanningPressures, setScanningPressures] = useState(false)
  const pressureFileRef = useRef<HTMLInputElement>(null)
  const [advisorOpen, setAdvisorOpen] = useState(false)
  const [advisorFeedback, setAdvisorFeedback] = useState('')
  const [advisorCategory, setAdvisorCategory] = useState<'Handling' | 'Engine' | 'Both'>('Handling')
  const [advisorLoading, setAdvisorLoading] = useState(false)
  const [advisorResult, setAdvisorResult] = useState<Array<{
    priority: number
    change: string
    from: string
    to: string
    explanation: string
  }> | null>(null)
  const [scanResult, setScanResult] = useState<{
    best_lap_time: string | null
    max_engine_temp_c: number | null
    low_engine_temp_c: number | null
    max_exhaust_temp_c: number | null
    low_exhaust_temp_c: number | null
    max_rpm: number | null
    low_rpm: number | null
    top_speed: number | null
    low_speed: number | null
    top_speed_unit: 'kph' | 'mph' | null
  } | null>(null)
  const [savingScan, setSavingScan] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [siblingLapSeries, setSiblingLapSeries] = useState<Array<{ label: string; laps: Array<{ lap_number: number; lap_time_ms: number }> }>>([])
  const [currentSessionLabel, setCurrentSessionLabel] = useState<string>('')

  useEffect(() => {
    if (!session?.event_id || !id) return
    supabase
      .from('sessions')
      .select('id, session_name, created_at')
      .eq('event_id', session.event_id)
      .order('created_at', { ascending: true })
      .then(async ({ data: siblings }) => {
        if (!siblings?.length) return
        // Label every session by position in the day so numbering is always consistent
        const labeled = siblings.map((s, i) => ({
          ...s,
          label: s.session_name ?? `Test ${i + 1}`,
        }))
        const currentLabel = labeled.find(s => s.id === id)?.label ?? session.session_name ?? 'This Session'
        setCurrentSessionLabel(currentLabel)

        const allIds = siblings.map(s => s.id)
        const { data: laps } = await supabase
          .from('lap_times')
          .select('session_id, lap_number, lap_time_ms')
          .in('session_id', allIds)
          .order('lap_number', { ascending: true })
        if (!laps) return
        const series = labeled
          .filter(s => s.id !== id)
          .map(s => ({
            label: s.label,
            laps: laps.filter(l => l.session_id === s.id).map(l => ({ lap_number: l.lap_number, lap_time_ms: l.lap_time_ms })),
          }))
          .filter(s => s.laps.length > 0)
        setSiblingLapSeries(series)
      })
  }, [session?.event_id, id])

  const pressureUnit: PressureUnit = (localStorage.getItem('kc_pressure_unit') as PressureUnit) ?? 'bar'
  const tempUnit: TempUnit   = (localStorage.getItem('kc_temp_unit')  as TempUnit)  ?? 'c'
  const speedUnit: SpeedUnit = (localStorage.getItem('kc_speed_unit') as SpeedUnit) ?? 'kph'

  async function handleScanFile(file: File) {
    setScanning(true)
    try {
      // Resize + compress to max 800px / JPEG 75% to keep payload under 1MB
      const base64 = await new Promise<string>((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
          const MAX = 800
          const scale = Math.min(1, MAX / Math.max(img.width, img.height))
          const canvas = document.createElement('canvas')
          canvas.width  = Math.round(img.width  * scale)
          canvas.height = Math.round(img.height * scale)
          canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
          resolve(canvas.toDataURL('image/jpeg', 0.75).split(',')[1])
        }
        img.onerror = reject
        img.src = URL.createObjectURL(file)
      })
      const { data, error } = await supabase.functions.invoke('scan-dashboard', {
        body: { image: base64, mimeType: 'image/jpeg' },
      })
      if (error) {
        const detail = (error as { context?: { json?: () => Promise<unknown> } }).context
          ? await (error as { context: { json: () => Promise<unknown> } }).context.json().catch(() => null)
          : null
        throw new Error(detail ? JSON.stringify(detail) : error.message)
      }
      setScanResult(data)
    } catch (err) {
      alert(`Scan failed: ${String(err)}`)
    } finally {
      setScanning(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handlePressureScanFile(file: File) {
    setScanningPressures(true)
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
          const MAX = 800
          const scale = Math.min(1, MAX / Math.max(img.width, img.height))
          const canvas = document.createElement('canvas')
          canvas.width  = Math.round(img.width  * scale)
          canvas.height = Math.round(img.height * scale)
          canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
          resolve(canvas.toDataURL('image/jpeg', 0.75).split(',')[1])
        }
        img.onerror = reject
        img.src = URL.createObjectURL(file)
      })
      const { data, error } = await supabase.functions.invoke('scan-tyre-pressures', {
        body: { image: base64, mimeType: 'image/jpeg' },
      })
      if (error) throw new Error(error.message)
      const r = data as { fl: number | null; fr: number | null; rl: number | null; rr: number | null; unit: string | null }
      if (r.fl != null) setHotFL(String(r.fl))
      if (r.fr != null) setHotFR(String(r.fr))
      if (r.rl != null) setHotRL(String(r.rl))
      if (r.rr != null) setHotRR(String(r.rr))
    } catch (err) {
      alert(`Pressure scan failed: ${String(err)}`)
    } finally {
      setScanningPressures(false)
      if (pressureFileRef.current) pressureFileRef.current.value = ''
    }
  }

  async function saveScanResult() {
    if (!scanResult || !id || !setup) return
    setSavingScan(true)
    const patch: Record<string, unknown> = {}
    if (scanResult.max_engine_temp_c  != null) patch.max_engine_temp_c  = scanResult.max_engine_temp_c
    if (scanResult.low_engine_temp_c  != null) patch.low_engine_temp_c  = scanResult.low_engine_temp_c
    if (scanResult.max_exhaust_temp_c != null) patch.max_exhaust_temp_c = scanResult.max_exhaust_temp_c
    if (scanResult.low_exhaust_temp_c != null) patch.low_exhaust_temp_c = scanResult.low_exhaust_temp_c
    if (scanResult.max_rpm            != null) patch.max_rpm            = scanResult.max_rpm
    if (scanResult.low_rpm            != null) patch.low_rpm            = scanResult.low_rpm
    if (scanResult.top_speed != null) {
      const factor = scanResult.top_speed_unit === 'mph' ? 1.60934 : 1
      patch.top_speed_kph = Math.round(scanResult.top_speed * factor * 100) / 100
    }
    if (scanResult.low_speed != null) {
      const factor = scanResult.top_speed_unit === 'mph' ? 1.60934 : 1
      patch.low_speed_kph = Math.round(scanResult.low_speed * factor * 100) / 100
    }
    if (Object.keys(patch).length > 0) {
      await supabase.from('setups').update(patch).eq('id', setup.id)
    }
    if (scanResult.best_lap_time) {
      const { stringToLapMs } = await import('@/lib/formatters')
      const ms = stringToLapMs(scanResult.best_lap_time)
      if (ms) {
        const nextNum = lapTimes.length > 0 ? Math.max(...lapTimes.map(l => l.lap_number)) + 1 : 1
        await supabase.from('lap_times').insert({ session_id: id, lap_number: nextNum, lap_time_ms: ms, notes: 'Scanned from dashboard' })
        // Always recalculate best from all manager-entered laps — overrides any incorrect driver-submitted value
        const bestMs = lapTimes.length > 0 ? Math.min(ms, ...lapTimes.map(l => l.lap_time_ms)) : ms
        await supabase.from('sessions').update({ best_lap_time_ms: bestMs, total_laps: nextNum }).eq('id', id)
        void refetchSession()
        void refetchLaps()
      }
    }
    await refetchSetup()
    setSavingScan(false)
    setScanResult(null)
  }

  async function runAdvisor() {
    if (!advisorFeedback.trim() || !setup) return
    setAdvisorLoading(true)
    setAdvisorResult(null)
    try {
      const { data, error } = await supabase.functions.invoke('setup-advisor', {
        body: { setup, feedback: advisorFeedback, category: advisorCategory, session },
      })
      if (error) throw error
      setAdvisorResult(data.recommendations ?? [])
    } catch (err) {
      alert(`Advisor error: ${String(err)}`)
    } finally {
      setAdvisorLoading(false)
    }
  }

  function getPressureRecommendation() {
    if (!setup) return null
    const { hot_pressure_fl: fl, hot_pressure_fr: fr, hot_pressure_rl: rl, hot_pressure_rr: rr } = setup
    if (fl == null || fr == null || rl == null || rr == null) return null

    const avg = (fl + fr + rl + rr) / 4
    const range = Math.max(fl, fr, rl, rr) - Math.min(fl, fr, rl, rr)
    const extremeThreshold = pressureUnit === 'psi' ? 1.45 : 0.10

    const corners = [
      { label: 'FL', hot: fl, cold: setup.tyre_pressure_fl },
      { label: 'FR', hot: fr, cold: setup.tyre_pressure_fr },
      { label: 'RL', hot: rl, cold: setup.tyre_pressure_rl },
      { label: 'RR', hot: rr, cold: setup.tyre_pressure_rr },
    ]

    return {
      range,
      extreme: range > extremeThreshold,
      corners: corners.map(c => {
        const adjustment = avg - c.hot
        return {
          label:       c.label,
          adjustment,
          recommended: c.cold != null ? Math.round((c.cold + adjustment) * 100) / 100 : null,
        }
      }),
    }
  }

  async function addLap() {
    const { stringToLapMs } = await import('@/lib/formatters')
    const ms = stringToLapMs(lapInput)
    if (!ms || !id) { setLapInputError(true); return }
    setLapInputError(false)
    setSavingLap(true)
    const nextNum = lapTimes.length > 0 ? Math.max(...lapTimes.map(l => l.lap_number)) + 1 : 1
    await supabase.from('lap_times').insert({ session_id: id, lap_number: nextNum, lap_time_ms: ms, notes: null })
    // Always recalculate best from all manager-entered laps — overrides any incorrect driver-submitted value
    const bestMs = lapTimes.length > 0 ? Math.min(ms, ...lapTimes.map(l => l.lap_time_ms)) : ms
    await supabase.from('sessions').update({ best_lap_time_ms: bestMs, total_laps: nextNum }).eq('id', id)
    void refetchSession()
    void refetchLaps()
    setLapInput('')
    setSavingLap(false)
  }

  async function saveSetup(data: Partial<SetupFormData>) {
    if (!id || !data.chassis_type || !data.engine_type) return
    setSaving(true)
    if (setup) {
      await supabase.from('setups').update(data).eq('id', setup.id)
    } else {
      await supabase.from('setups').insert({ session_id: id, ...data })
    }
    await refetchSetup()
    setSaving(false)
    setEditSetupOpen(false)
  }

  function openHotPressures() {
    setHotFL(String(setup?.hot_pressure_fl ?? ''))
    setHotFR(String(setup?.hot_pressure_fr ?? ''))
    setHotRL(String(setup?.hot_pressure_rl ?? ''))
    setHotRR(String(setup?.hot_pressure_rr ?? ''))
    setHotPressureOpen(true)
  }

  async function saveHotPressures() {
    if (!id || !setup) return
    setSavingHot(true)
    const patch = {
      hot_pressure_fl: hotFL ? Number(hotFL) : null,
      hot_pressure_fr: hotFR ? Number(hotFR) : null,
      hot_pressure_rl: hotRL ? Number(hotRL) : null,
      hot_pressure_rr: hotRR ? Number(hotRR) : null,
    }
    await supabase.from('setups').update(patch).eq('id', setup.id)
    await refetchSetup()
    setSavingHot(false)
    setHotPressureOpen(false)
  }

  function openEngineMon() {
    const d = (c: number | null | undefined) => String(displayTemp(c ?? null, tempUnit) ?? '')
    const s = (kph: number | null | undefined) => String(displaySpeed(kph ?? null, speedUnit) ?? '')
    setEmMaxEngineTemp(d(setup?.max_engine_temp_c))
    setEmLowEngineTemp(d(setup?.low_engine_temp_c))
    setEmMaxExhaustTemp(d(setup?.max_exhaust_temp_c))
    setEmLowExhaustTemp(d(setup?.low_exhaust_temp_c))
    setEmMaxRpm(String(setup?.max_rpm ?? ''))
    setEmLowRpm(String(setup?.low_rpm ?? ''))
    setEmMaxSpeed(s(setup?.top_speed_kph))
    setEmLowSpeed(s(setup?.low_speed_kph))
    setEngineMonOpen(true)
  }

  async function saveEngineMon() {
    if (!id || !setup) return
    setSavingEngineMon(true)
    await supabase.from('setups').update({
      max_engine_temp_c:  inputTempToC(emMaxEngineTemp,  tempUnit),
      low_engine_temp_c:  inputTempToC(emLowEngineTemp,  tempUnit),
      max_exhaust_temp_c: inputTempToC(emMaxExhaustTemp, tempUnit),
      low_exhaust_temp_c: inputTempToC(emLowExhaustTemp, tempUnit),
      max_rpm:            emMaxRpm   ? Number(emMaxRpm)   : null,
      low_rpm:            emLowRpm   ? Number(emLowRpm)   : null,
      top_speed_kph:      inputSpeedToKph(emMaxSpeed, speedUnit),
      low_speed_kph:      inputSpeedToKph(emLowSpeed, speedUnit),
    }).eq('id', setup.id)
    await refetchSetup()
    setSavingEngineMon(false)
    setEngineMonOpen(false)
  }

  async function saveChange() {
    if (!id || !changeDesc.trim()) return
    const delta = lapDelta.trim() ? parseInt(lapDelta, 10) : null
    await supabase.from('setup_changes').insert({
      session_id: id,
      change_description: changeDesc.trim(),
      lap_delta_ms: isNaN(delta as number) ? null : delta,
      driver_feedback: feedback.trim() || null,
    })
    await refetchChanges()
    await refetchSession()
    setChangeOpen(false)
    setChangeDesc('')
    setLapDelta('')
    setFeedback('')
  }

  async function exportPDF() {
    if (!session) return
    setExporting(true)
    try {
      const { generateSessionPDF } = await import('@/components/SessionPDF')
      await generateSessionPDF({ session, setup: setup ?? null, lapTimes, changes, bestLap: bestLap ?? null, teamLogoUrl: teamBranding.logo_url, teamName: teamBranding.team_name, teamPrimaryColor: teamBranding.primary_color, teamSecondaryColor: teamBranding.secondary_color })
    } finally {
      setExporting(false)
    }
  }

  if (sessionLoading) {
    return (
      <PageWrapper title="Session">
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </PageWrapper>
    )
  }

  if (!session) {
    return (
      <PageWrapper title="Session">
        <p className="text-text-muted">Session not found.</p>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper
      title="Session Detail"
      action={
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft size={14} /> Back
          </Button>
          <Button variant="secondary" size="sm" onClick={() => { setAdvisorResult(null); setAdvisorFeedback(''); setAdvisorOpen(true) }}>
            <Sparkles size={14} /> Setup Advisor
          </Button>
          <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} loading={scanning}>
            <Camera size={14} /> Scan Dashboard
          </Button>
          <Button variant="secondary" size="sm" onClick={() => void exportPDF()} loading={exporting}>
            <FileDown size={14} /> Export PDF
          </Button>
        </div>
      }
    >
      {/* Header card */}
      <Card className="mb-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-heading text-2xl font-bold text-text-primary">
              {session.track?.name ?? 'Unknown Track'}
            </h2>
            <p className="text-text-muted text-sm mt-0.5">
              {session.session_name && (
                <span className="text-accent-primary font-semibold mr-2">{session.session_name}</span>
              )}
              {session.kart?.nickname ?? '—'} &middot; {formatDate(session.session_date)}
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge label={session.session_type} variant="neutral" />
              {session.conditions && <Badge label={session.conditions} variant={conditionVariant[session.conditions] ?? 'neutral'} />}
              {session.best_lap_time_ms && (
                <Badge label={lapMsToString(session.best_lap_time_ms)} variant="warning" />
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1 text-xs text-text-muted font-mono">
            {session.air_temp_c !== null && (
              <span className="flex items-center gap-1"><Thermometer size={12} /> Air {displayTemp(session.air_temp_c, tempUnit)}{tempUnitLabel(tempUnit)}</span>
            )}
            {session.humidity_pct !== null && (
              <span className="flex items-center gap-1"><Droplets size={12} /> {session.humidity_pct}% RH</span>
            )}
            {session.wind_speed_mph !== null && (
              <span className="flex items-center gap-1"><Wind size={12} /> {displayWind(session.wind_speed_mph, speedUnit)} {speedUnitLabel(speedUnit)}</span>
            )}
          </div>
        </div>
        {session.notes && (
          <p className="mt-3 text-sm text-text-muted border-t border-border-color pt-3">{session.notes}</p>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Lap Times */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-sm uppercase tracking-wider text-text-primary">
              <Clock size={14} className="inline mr-2 text-accent-primary" />
              Lap Times
            </h3>
            <span className="text-xs text-text-muted font-mono">{lapTimes.length} laps</span>
          </div>
          {/* Add lap time */}
          <div className="flex gap-2 mt-3">
            <div className="flex-1">
              <Input
                value={lapInput}
                onChange={e => { setLapInput(e.target.value); setLapInputError(false) }}
                onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && void addLap()}
                placeholder="0.00.00"
                error={lapInputError ? 'Use format 0.45.52' : undefined}
              />
            </div>
            <Button size="sm" onClick={() => void addLap()} loading={savingLap} className="flex-shrink-0">
              <Plus size={13} /> Add Lap
            </Button>
          </div>

          {lapTimes.length > 0 && (
            <div className="overflow-x-auto mt-3">
              {/* Individual lap table */}
              <table className="w-full text-xs mb-4">
                <thead>
                  <tr className="border-b border-border-color">
                    <th className="px-2 py-1.5 text-left text-text-muted font-heading uppercase tracking-wider">#</th>
                    <th className="px-2 py-1.5 text-left text-text-muted font-heading uppercase tracking-wider">Time</th>
                    <th className="px-2 py-1.5 text-left text-text-muted font-heading uppercase tracking-wider">Delta</th>
                    <th className="px-2 py-1.5 text-left text-text-muted font-heading uppercase tracking-wider">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {lapTimes.map(lap => {
                    const isBest = lap.lap_time_ms === bestLap?.lap_time_ms
                    const delta  = bestLap ? lapMsDelta(lap.lap_time_ms, bestLap.lap_time_ms) : null
                    return (
                      <tr
                        key={lap.id}
                        className={[
                          'border-b border-border-color last:border-0',
                          isBest ? 'bg-accent-primary/5 border-l-2 border-l-accent-primary' : '',
                        ].join(' ')}
                      >
                        <td className="px-2 py-1.5 font-mono text-text-muted">{lap.lap_number}</td>
                        <td className="px-2 py-1.5 font-mono text-text-primary">{lapMsToString(lap.lap_time_ms)}</td>
                        <td className="px-2 py-1.5">
                          {isBest
                            ? <Badge label="BEST" variant="warning" />
                            : delta && !delta.equal && (
                                <Badge label={delta.label} variant={delta.faster ? 'positive' : 'negative'} />
                              )
                          }
                        </td>
                        <td className="px-2 py-1.5 text-text-muted">{lap.notes ?? ''}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Session comparison table — one row per session ranked by best lap */}
              {siblingLapSeries.length > 0 && (() => {
                const thisLabel  = currentSessionLabel || session?.session_name || 'This Session'
                const thisBest   = bestLap?.lap_time_ms ?? null

                const rows = [
                  { label: thisLabel, best: thisBest, color: '#CA8A04' },
                  ...siblingLapSeries.map((s, i) => ({
                    label: s.label,
                    best: s.laps.length ? Math.min(...s.laps.map(l => l.lap_time_ms)) : null,
                    color: SIBLING_COLORS[i % SIBLING_COLORS.length],
                  })),
                ]
                  .filter(r => r.best != null)
                  .sort((a, b) => (a.best as number) - (b.best as number))

                const dayBest = rows[0]?.best ?? null

                return (
                  <>
                    <p className="text-xs text-text-muted font-heading uppercase tracking-wider mb-2">Session Comparison</p>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border-color">
                          <th className="px-2 py-1.5 text-left text-text-muted font-heading uppercase tracking-wider">#</th>
                          <th className="px-2 py-1.5 text-left text-text-muted font-heading uppercase tracking-wider">Time</th>
                          <th className="px-2 py-1.5 text-left text-text-muted font-heading uppercase tracking-wider">Session</th>
                          <th className="px-2 py-1.5 text-left text-text-muted font-heading uppercase tracking-wider">Delta</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, i) => {
                          const delta = dayBest != null && r.best != null ? r.best - dayBest : 0
                          const isBest = delta === 0
                          return (
                            <tr key={r.label} className="border-b border-border-color last:border-0">
                              <td className="px-2 py-2 font-mono text-text-muted">{i + 1}</td>
                              <td className="px-2 py-2 font-mono font-semibold" style={{ color: r.color }}>
                                {lapMsToString(r.best as number)}
                              </td>
                              <td className="px-2 py-2 font-semibold" style={{ color: r.color }}>{r.label}</td>
                              <td className="px-2 py-2">
                                {isBest
                                  ? <Badge label="Best" variant="warning" />
                                  : <span className="font-mono text-red-400">+{lapMsToString(delta)}</span>
                                }
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </>
                )
              })()}
            </div>
          )}
        </Card>

        {/* Changes Log */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-sm uppercase tracking-wider text-text-primary">
              Changes Log
            </h3>
            <Button size="sm" variant="secondary" onClick={() => setChangeOpen(true)}>
              <Plus size={12} /> Log Change
            </Button>
          </div>
          {changes.length === 0 ? (
            <p className="text-text-muted text-sm">No changes logged yet.</p>
          ) : (
            <div className="space-y-3">
              {changes.map(c => (
                <div key={c.id} className="border-l-2 border-border-color pl-3">
                  <p className="text-sm text-text-primary">{c.change_description}</p>
                  {c.lap_delta_ms !== null && (
                    <Badge
                      label={`${c.lap_delta_ms < 0 ? '' : '+'}${c.lap_delta_ms}ms`}
                      variant={c.lap_delta_ms < 0 ? 'positive' : 'negative'}
                      className="mt-1"
                    />
                  )}
                  {c.driver_feedback && (
                    <p className="text-xs text-text-muted mt-1">{c.driver_feedback}</p>
                  )}
                  <p className="text-xs text-text-muted mt-1 font-mono">
                    {new Date(c.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Setup Display */}
      <Card>
        <h3 className="font-heading text-sm uppercase tracking-wider text-text-primary mb-4">Setup</h3>
        {setupLoading ? (
          <p className="text-text-muted text-sm">Loading…</p>
        ) : (
          <SetupForm
            key={setup?.id ?? 'new'}
            initialSetup={setup ?? {}}
            onSave={saveSetup}
            saving={saving}
            pressureUnit={pressureUnit}
            showSaveButton
          />
        )}
      </Card>

      {/* Engine Monitoring */}
      {setup && (
        <Card className="mt-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-sm uppercase tracking-wider text-text-primary">
              Engine Monitoring
              <span className="ml-2 text-xs font-normal normal-case text-text-muted">(post-session)</span>
            </h3>
            <Button size="sm" variant="secondary" onClick={openEngineMon}>
              {setup.max_engine_temp_c || setup.max_exhaust_temp_c || setup.max_rpm ? 'Edit' : 'Record'}
            </Button>
          </div>
          {setup.max_engine_temp_c || setup.max_exhaust_temp_c || setup.max_rpm || setup.top_speed_kph ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { heading: 'Engine Temp', max: displayTemp(setup.max_engine_temp_c, tempUnit), low: displayTemp(setup.low_engine_temp_c, tempUnit), unit: tempUnitLabel(tempUnit) },
                { heading: 'RPM', max: setup.max_rpm, low: setup.low_rpm, unit: 'rpm' },
                { heading: 'Speed', max: displaySpeed(setup.top_speed_kph, speedUnit), low: displaySpeed(setup.low_speed_kph, speedUnit), unit: speedUnitLabel(speedUnit) },
                { heading: 'Exhaust Temp', max: displayTemp(setup.max_exhaust_temp_c, tempUnit), low: displayTemp(setup.low_exhaust_temp_c, tempUnit), unit: tempUnitLabel(tempUnit) },
              ].map(({ heading, max, low, unit }) => (
                <div key={heading} className="bg-bg-elevated rounded-card p-3">
                  <p className="text-xs text-text-muted font-heading uppercase tracking-wider mb-2 text-center">{heading}</p>
                  {[{ label: 'Max', value: max }, { label: 'Low', value: low }].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between py-1">
                      <span className="text-xs text-text-muted">{label}</span>
                      <span className="font-mono text-sm text-accent-primary font-semibold">
                        {value ?? '—'}{value !== null && value !== undefined && <span className="text-xs text-text-muted ml-0.5">{unit}</span>}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-text-muted text-sm">No engine monitoring data recorded yet.</p>
          )}
        </Card>
      )}

      {/* Hot Pressures + Recommendation */}
      {setup && (
        <Card className="mt-5">
          {(() => {
            const rec = getPressureRecommendation()
            const hasHot = setup.hot_pressure_fl || setup.hot_pressure_fr || setup.hot_pressure_rl || setup.hot_pressure_rr
            return (
              <>
                {/* 50/50 header row */}
                <div className="flex flex-col md:flex-row mb-4">
                  <div className="flex-1 flex items-center justify-between pr-0 md:pr-6">
                    <h3 className="font-heading text-sm uppercase tracking-wider text-text-primary">
                      Hot Pressures
                      <span className="ml-2 text-xs font-normal normal-case text-text-muted">(post-session)</span>
                    </h3>
                    <Button size="sm" variant="secondary" onClick={openHotPressures}>
                      {setup.hot_pressure_fl ? 'Edit' : 'Record'}
                    </Button>
                  </div>
                  {rec && hasHot && (
                    <>
                      <div className="hidden md:block w-px bg-border-color mx-0" />
                      <div className="flex-1 flex items-center gap-2 flex-wrap pl-0 md:pl-6 mt-2 md:mt-0">
                        <h3 className="font-heading text-sm uppercase tracking-wider text-text-primary">
                          Recommended Cold — Next Test
                        </h3>
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${rec.extreme ? 'bg-red-500' : 'bg-amber-400'}`} />
                        <span className="text-xs text-text-muted font-normal normal-case">
                          {rec.extreme ? 'Extremely staggered' : 'Staggered'} ({rec.range.toFixed(2)} {pressureUnit} range)
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {hasHot ? (
                  <div className="flex flex-col md:flex-row">
                    {/* Hot pressures grid */}
                    <div className="flex-1 grid grid-cols-2 gap-3 pr-0 md:pr-6">
                      {[
                        { label: 'FL', value: setup.hot_pressure_fl },
                        { label: 'FR', value: setup.hot_pressure_fr },
                        { label: 'RL', value: setup.hot_pressure_rl },
                        { label: 'RR', value: setup.hot_pressure_rr },
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-bg-elevated rounded-card p-3 text-center">
                          <p className="text-xs text-text-muted font-heading uppercase tracking-wider mb-1">{label}</p>
                          <p className="font-mono text-lg text-accent-primary font-semibold">
                            {value ?? '—'}
                            {value != null && <span className="text-xs text-text-muted ml-1">{pressureUnit}</span>}
                          </p>
                        </div>
                      ))}
                    </div>

                    {rec && <div className="hidden md:block w-px bg-border-color self-stretch" />}

                    {/* Recommendation grid */}
                    {rec && (
                      <div className="flex-1 grid grid-cols-2 gap-3 pl-0 md:pl-6 mt-4 md:mt-0">
                        {rec.corners.map(c => (
                          <div key={c.label} className="bg-bg-elevated rounded-card p-3 text-center">
                            <p className="text-xs text-text-muted font-heading uppercase tracking-wider mb-1">{c.label}</p>
                            <p className="font-mono text-lg text-accent-primary font-semibold">
                              {c.recommended != null ? c.recommended.toFixed(2) : '—'}
                              {c.recommended != null && <span className="text-xs text-text-muted ml-1">{pressureUnit}</span>}
                            </p>
                            {Math.abs(c.adjustment) > 0.001 && (
                              <p className={`text-xs font-mono mt-0.5 ${c.adjustment > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {c.adjustment > 0 ? '↑' : '↓'} {Math.abs(c.adjustment).toFixed(2)}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-text-muted text-sm">No hot pressures recorded yet.</p>
                )}
              </>
            )
          })()}
        </Card>
      )}

      {/* Engine Monitoring Modal */}
      <Modal isOpen={engineMonOpen} onClose={() => setEngineMonOpen(false)} title="Engine Monitoring (Post-Session)">
        <p className="text-sm text-text-muted mb-4">Record engine data from the session.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-5">
          <div className="space-y-3">
            <p className="font-heading text-xs uppercase tracking-wider text-text-muted">Engine Temp</p>
            <Input label="Max" type="number" unit={tempUnitLabel(tempUnit)} value={emMaxEngineTemp} onChange={e => setEmMaxEngineTemp(e.target.value)} placeholder="—" />
            <Input label="Low" type="number" unit={tempUnitLabel(tempUnit)} value={emLowEngineTemp} onChange={e => setEmLowEngineTemp(e.target.value)} placeholder="—" />
          </div>
          <div className="space-y-3">
            <p className="font-heading text-xs uppercase tracking-wider text-text-muted">Exhaust Temp</p>
            <Input label="Max" type="number" unit={tempUnitLabel(tempUnit)} value={emMaxExhaustTemp} onChange={e => setEmMaxExhaustTemp(e.target.value)} placeholder="—" />
            <Input label="Low" type="number" unit={tempUnitLabel(tempUnit)} value={emLowExhaustTemp} onChange={e => setEmLowExhaustTemp(e.target.value)} placeholder="—" />
          </div>
          <div className="space-y-3">
            <p className="font-heading text-xs uppercase tracking-wider text-text-muted">RPM</p>
            <Input label="Max" type="number" unit="rpm" value={emMaxRpm} onChange={e => setEmMaxRpm(e.target.value)} placeholder="—" />
            <Input label="Low" type="number" unit="rpm" value={emLowRpm} onChange={e => setEmLowRpm(e.target.value)} placeholder="—" />
          </div>
          <div className="space-y-3">
            <p className="font-heading text-xs uppercase tracking-wider text-text-muted">Speed</p>
            <Input label="Max" type="number" unit={speedUnitLabel(speedUnit)} value={emMaxSpeed} onChange={e => setEmMaxSpeed(e.target.value)} placeholder="—" />
            <Input label="Low" type="number" unit={speedUnitLabel(speedUnit)} value={emLowSpeed} onChange={e => setEmLowSpeed(e.target.value)} placeholder="—" />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={() => setEngineMonOpen(false)}>Cancel</Button>
          <Button size="sm" onClick={() => void saveEngineMon()} loading={savingEngineMon}>Save</Button>
        </div>
      </Modal>

      {/* Hot Pressures Modal */}
      <Modal isOpen={hotPressureOpen} onClose={() => setHotPressureOpen(false)} title="Hot Pressures (Post-Session)">
        <p className="text-sm text-text-muted mb-4">Record tyre pressures immediately after the session.</p>

        {/* Scan button */}
        <button
          type="button"
          onClick={() => pressureFileRef.current?.click()}
          disabled={scanningPressures}
          className="w-full flex items-center justify-center gap-2 py-2.5 mb-5 rounded-card border border-dashed border-accent-primary/40 text-accent-primary text-xs font-heading font-bold uppercase tracking-wider hover:bg-accent-primary/5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-default"
        >
          {scanningPressures ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
              Scanning gauges…
            </>
          ) : (
            <>
              <Camera size={14} />
              Scan Pressure Gauges
            </>
          )}
        </button>
        <input
          ref={pressureFileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) void handlePressureScanFile(f) }}
        />

        <div className="grid grid-cols-2 gap-4 mb-5">
          <Input label="Front Left" type="number" unit={pressureUnit} value={hotFL} onChange={e => setHotFL(e.target.value)} placeholder="0.00" />
          <Input label="Front Right" type="number" unit={pressureUnit} value={hotFR} onChange={e => setHotFR(e.target.value)} placeholder="0.00" />
          <Input label="Rear Left" type="number" unit={pressureUnit} value={hotRL} onChange={e => setHotRL(e.target.value)} placeholder="0.00" />
          <Input label="Rear Right" type="number" unit={pressureUnit} value={hotRR} onChange={e => setHotRR(e.target.value)} placeholder="0.00" />
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={() => setHotPressureOpen(false)}>Cancel</Button>
          <Button size="sm" onClick={() => void saveHotPressures()} loading={savingHot}>Save</Button>
        </div>
      </Modal>

      {/* Log Change Modal */}
      <Modal isOpen={changeOpen} onClose={() => setChangeOpen(false)} title="Log a Change">
        <div className="space-y-4">
          <Textarea
            label="What changed? *"
            value={changeDesc}
            onChange={e => setChangeDesc(e.target.value)}
            placeholder="e.g. Raised axle height from Low to Med"
          />
          <Input
            label="Lap Delta (ms)"
            type="number"
            unit="ms"
            value={lapDelta}
            onChange={e => setLapDelta(e.target.value)}
            placeholder="e.g. -230 (negative = faster)"
            hint="Negative = faster, positive = slower"
          />
          <VoiceTextarea
            label="Driver Feedback"
            value={feedback}
            onChange={setFeedback}
            placeholder="How did the kart feel after the change?"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setChangeOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={() => void saveChange()} disabled={!changeDesc.trim()}>Save</Button>
          </div>
        </div>
      </Modal>

      {/* Setup Advisor Modal */}
      <Modal isOpen={advisorOpen} onClose={() => setAdvisorOpen(false)} title="Setup Advisor" maxWidth="max-w-2xl">
        {!advisorResult ? (
          <div className="space-y-5">
            <p className="text-sm text-text-muted">
              Describe how the kart felt and the AI will suggest 3 setup changes in priority order.
            </p>
            <div>
              <p className="text-xs font-heading font-bold text-text-muted uppercase mb-2">Category</p>
              <div className="flex gap-2">
                {(['Handling', 'Engine', 'Both'] as const).map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setAdvisorCategory(c)}
                    className={[
                      'px-4 py-1.5 rounded-card text-sm font-semibold border transition-colors cursor-pointer',
                      advisorCategory === c
                        ? 'bg-accent-primary text-bg-primary border-accent-primary'
                        : 'bg-bg-elevated text-text-muted border-border-color hover:text-text-primary',
                    ].join(' ')}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <VoiceTextarea
              label="Driver Feedback *"
              value={advisorFeedback}
              onChange={setAdvisorFeedback}
              placeholder="e.g. The kart was understeering heavily in slow corners, felt very stiff and wouldn't rotate. In fast corners it was fine but I couldn't get the front to turn in."
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setAdvisorOpen(false)}>Cancel</Button>
              <Button
                size="sm"
                onClick={() => void runAdvisor()}
                loading={advisorLoading}
                disabled={!advisorFeedback.trim()}
              >
                <Sparkles size={13} /> Get Recommendations
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-text-muted">Based on your feedback, here are the recommended changes in priority order:</p>
            {advisorResult.map(rec => (
              <div key={rec.priority} className="bg-bg-elevated rounded-card p-4 border border-border-color">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-accent-primary text-bg-primary flex items-center justify-center font-heading font-bold text-sm flex-shrink-0">
                    {rec.priority}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-heading font-bold text-text-primary text-sm">{rec.change}</p>
                    <div className="flex items-center gap-2 mt-1 mb-2 flex-wrap">
                      <span className="font-mono text-xs bg-bg-primary px-2 py-0.5 rounded text-text-muted">{rec.from}</span>
                      <span className="text-text-muted text-xs">→</span>
                      <span className="font-mono text-xs bg-accent-primary/10 text-accent-primary px-2 py-0.5 rounded font-semibold">{rec.to}</span>
                    </div>
                    <p className="text-xs text-text-muted leading-relaxed">{rec.explanation}</p>
                  </div>
                </div>
              </div>
            ))}
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="ghost" size="sm" onClick={() => { setAdvisorResult(null) }}>Ask Again</Button>
              <Button size="sm" onClick={() => setAdvisorOpen(false)}>Done</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Hidden file input for dashboard scan */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) void handleScanFile(f) }}
      />

      {/* Scan Results Modal */}
      <Modal isOpen={!!scanResult} onClose={() => setScanResult(null)} title="Scan Results — Review & Save">
        <p className="text-sm text-text-muted mb-5">
          Check the values Claude extracted from your dashboard photo. Edit anything that looks wrong before saving.
        </p>
        {scanResult && (
          <div className="space-y-5">
            {scanResult.best_lap_time != null && (
              <Input
                label="Best Lap Time"
                value={scanResult.best_lap_time}
                onChange={e => setScanResult(r => r ? { ...r, best_lap_time: e.target.value } : r)}
                placeholder="1:23.456"
              />
            )}
            <div>
              <p className="text-xs font-heading font-bold text-text-muted uppercase mb-3">Engine Temp (°C)</p>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Max"
                  type="number"
                  unit="°C"
                  value={scanResult.max_engine_temp_c ?? ''}
                  onChange={e => setScanResult(r => r ? { ...r, max_engine_temp_c: e.target.value ? Number(e.target.value) : null } : r)}
                />
                <Input
                  label="Low"
                  type="number"
                  unit="°C"
                  value={scanResult.low_engine_temp_c ?? ''}
                  onChange={e => setScanResult(r => r ? { ...r, low_engine_temp_c: e.target.value ? Number(e.target.value) : null } : r)}
                />
              </div>
            </div>
            <div>
              <p className="text-xs font-heading font-bold text-text-muted uppercase mb-3">Exhaust Temp (°C)</p>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Max"
                  type="number"
                  unit="°C"
                  value={scanResult.max_exhaust_temp_c ?? ''}
                  onChange={e => setScanResult(r => r ? { ...r, max_exhaust_temp_c: e.target.value ? Number(e.target.value) : null } : r)}
                />
                <Input
                  label="Low"
                  type="number"
                  unit="°C"
                  value={scanResult.low_exhaust_temp_c ?? ''}
                  onChange={e => setScanResult(r => r ? { ...r, low_exhaust_temp_c: e.target.value ? Number(e.target.value) : null } : r)}
                />
              </div>
            </div>
            <div>
              <p className="text-xs font-heading font-bold text-text-muted uppercase mb-3">RPM</p>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Max"
                  type="number"
                  unit="rpm"
                  value={scanResult.max_rpm ?? ''}
                  onChange={e => setScanResult(r => r ? { ...r, max_rpm: e.target.value ? Number(e.target.value) : null } : r)}
                />
                <Input
                  label="Low"
                  type="number"
                  unit="rpm"
                  value={scanResult.low_rpm ?? ''}
                  onChange={e => setScanResult(r => r ? { ...r, low_rpm: e.target.value ? Number(e.target.value) : null } : r)}
                />
              </div>
            </div>
            {(scanResult.top_speed != null || scanResult.low_speed != null) && (
              <div>
                <p className="text-xs font-heading font-bold text-text-muted uppercase mb-3">
                  Speed ({scanResult.top_speed_unit ?? 'kph'})
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Max"
                    type="number"
                    unit={scanResult.top_speed_unit ?? 'kph'}
                    value={scanResult.top_speed ?? ''}
                    onChange={e => setScanResult(r => r ? { ...r, top_speed: e.target.value ? Number(e.target.value) : null } : r)}
                  />
                  <Input
                    label="Low"
                    type="number"
                    unit={scanResult.top_speed_unit ?? 'kph'}
                    value={scanResult.low_speed ?? ''}
                    onChange={e => setScanResult(r => r ? { ...r, low_speed: e.target.value ? Number(e.target.value) : null } : r)}
                  />
                </div>
              </div>
            )}
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="ghost" size="sm" onClick={() => setScanResult(null)}>Discard</Button>
              <Button size="sm" onClick={() => void saveScanResult()} loading={savingScan}>Save to Session</Button>
            </div>
          </div>
        )}
      </Modal>
    </PageWrapper>
  )
}
