import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Clock, Thermometer, Wind, Droplets, FileDown, Camera, Sparkles, Gauge, Zap, Trash2, Download, X } from 'lucide-react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
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

// Fields owned exclusively by their own modals — the form auto-save must never touch these.
// Supabase UPDATE is a PATCH, so omitting them leaves DB values untouched.
const MODAL_OWNED: Array<keyof SetupFormData> = [
  'max_rpm', 'low_rpm',
  'max_engine_temp_c', 'low_engine_temp_c',
  'max_exhaust_temp_c', 'low_exhaust_temp_c',
  'top_speed_kph', 'low_speed_kph',
  'hot_pressure_fl', 'hot_pressure_fr', 'hot_pressure_rl', 'hot_pressure_rr',
]
function stripModalOwned(data: Partial<SetupFormData>): Partial<SetupFormData> {
  const copy = { ...data }
  MODAL_OWNED.forEach(k => delete copy[k])
  return copy
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
  const [setupSaveError, setSetupSaveError] = useState<string | null>(null)
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const autoSaveTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingSetup   = useRef<Partial<SetupFormData> | null>(null)
  // Tracks whether each post-session modal has ever been opened this session
  // so auto-save fires after modal close without being tripped by initial empty state
  const engineMonEverOpened  = useRef(false)
  const hotPressureEverOpened = useRef(false)
  // Always-current ref so autoSave never captures a stale setup via closure
  const setupRef       = useRef(setup)
  useEffect(() => { setupRef.current = setup }, [setup])
  const [savingHot, setSavingHot] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [showPDFPreview, setShowPDFPreview] = useState(false)
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null)
  const [pdfFilename, setPdfFilename] = useState('session.pdf')
  const [pdfNumPages, setPdfNumPages] = useState(1)
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
  const fileInputRef       = useRef<HTMLInputElement>(null) // gallery
  const dashboardCameraRef = useRef<HTMLInputElement>(null) // camera

  const [siblingLapSeries, setSiblingLapSeries] = useState<Array<{ label: string; laps: Array<{ lap_number: number; lap_time_ms: number }> }>>([])
  const [currentSessionLabel, setCurrentSessionLabel] = useState<string>('')
  const [prevSessionRec, setPrevSessionRec] = useState<{
    fl: number | null; fr: number | null; rl: number | null; rr: number | null; sessionLabel: string
  } | null>(null)

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

        // Fetch previous session's recommended cold pressures
        const currentIdx = labeled.findIndex(s => s.id === id)
        if (currentIdx > 0) {
          const prev = labeled[currentIdx - 1]
          const { data: prevSetup } = await supabase
            .from('setups')
            .select('tyre_pressure_fl, tyre_pressure_fr, tyre_pressure_rl, tyre_pressure_rr, hot_pressure_fl, hot_pressure_fr, hot_pressure_rl, hot_pressure_rr')
            .eq('session_id', prev.id)
            .maybeSingle()
          if (prevSetup) {
            const { hot_pressure_fl: hfl, hot_pressure_fr: hfr, hot_pressure_rl: hrl, hot_pressure_rr: hrr } = prevSetup
            if (hfl != null && hfr != null && hrl != null && hrr != null) {
              const avg = (hfl + hfr + hrl + hrr) / 4
              const calc = (hot: number, cold: number | null) =>
                cold != null ? Math.round((cold + (avg - hot)) * 100) / 100 : null
              setPrevSessionRec({
                fl: calc(hfl, prevSetup.tyre_pressure_fl),
                fr: calc(hfr, prevSetup.tyre_pressure_fr),
                rl: calc(hrl, prevSetup.tyre_pressure_rl),
                rr: calc(hrr, prevSetup.tyre_pressure_rr),
                sessionLabel: prev.label,
              })
            }
          }
        }
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
      // Open review modal so user can check/edit before saving
      setScanResult(data)
    } catch (err) {
      alert(`Scan failed: ${String(err)}`)
    } finally {
      setScanning(false)
      if (fileInputRef.current)       fileInputRef.current.value = ''
      if (dashboardCameraRef.current) dashboardCameraRef.current.value = ''
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
        const bestMs = lapTimes.length > 0 ? Math.min(ms, ...lapTimes.map(l => l.lap_time_ms)) : ms
        await supabase.from('sessions').update({ best_lap_time_ms: bestMs, total_laps: nextNum }).eq('id', id)
        void refetchSession()
        void refetchLaps()
      }
    }
    await refetchSetup()
    setSavingScan(false)
    setScanResult(null)      // close review modal
    setEngineMonOpen(false)  // close engine monitoring modal → stats card shows on page
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

  async function deleteLap(lapId: string) {
    if (!id) return
    await supabase.from('lap_times').delete().eq('id', lapId)
    // Renumber remaining laps sequentially (sorted by original lap_number)
    const remaining = lapTimes
      .filter(l => l.id !== lapId)
      .sort((a, b) => a.lap_number - b.lap_number)
    // Run renumbers one at a time to avoid race conditions
    for (let i = 0; i < remaining.length; i++) {
      await supabase.from('lap_times').update({ lap_number: i + 1 }).eq('id', remaining[i].id)
    }
    const bestMs    = remaining.length > 0 ? Math.min(...remaining.map(l => l.lap_time_ms)) : null
    const totalLaps = remaining.length
    await supabase.from('sessions').update({ best_lap_time_ms: bestMs, total_laps: totalLaps }).eq('id', id)
    // Await both refetches so they read the fully-updated DB state
    await refetchSession()
    await refetchLaps()
  }

  // localStorage draft key — one entry per session, persists across refreshes
  const draftKey = id ? `kc_setup_draft_${id}` : null

  function saveDraftToStorage(data: Partial<SetupFormData>) {
    if (!draftKey) return
    try { localStorage.setItem(draftKey, JSON.stringify(data)) } catch {}
  }

  async function saveSetup(data: Partial<SetupFormData>) {
    if (!id) return
    setSaving(true)
    setSetupSaveError(null)
    const safe = stripModalOwned(data)
    const current = setupRef.current
    const { error: saveErr } = current
      ? await supabase.from('setups').update(safe).eq('id', current.id)
      : await supabase.from('setups').insert({ session_id: id, ...safe })
    if (saveErr) {
      console.error('[saveSetup] error:', saveErr.message)
      setSetupSaveError('Setup could not be saved — ' + saveErr.message)
      setSaving(false)
      return
    }
    saveDraftToStorage(safe)
    await refetchSetup()
    setSaving(false)
    setEditSetupOpen(false)
    setAutoSaveStatus('saved')
    // Navigate back to the event page (tests list) if this session belongs to an event
    if (session?.event_id) {
      navigate(`/events/${session.event_id}`)
    }
  }

  // Auto-save to Supabase — fires 300 ms after last change (down from 1 s)
  // Uses setupRef so it always sees the current DB row even inside a stale closure
  const autoSave = useCallback(async () => {
    const data = pendingSetup.current
    if (!data || !id) return
    setAutoSaveStatus('saving')
    const current = setupRef.current
    const { error } = current
      ? await supabase.from('setups').update(data).eq('id', current.id)
      : await supabase.from('setups').insert({ session_id: id, ...data })
    if (!error) {
      // Keep draft in localStorage — still the freshest copy if page refreshes
      saveDraftToStorage(data)
      await refetchSetup()
      setAutoSaveStatus('saved')
      setTimeout(() => setAutoSaveStatus('idle'), 3000)
    } else {
      console.warn('[autoSave] error:', error.message)
      setAutoSaveStatus('idle')
    }
  }, [id, refetchSetup]) // no `setup` dependency — we use setupRef instead

  function handleSetupChange(data: Partial<SetupFormData>) {
    // Strip modal-owned fields (engine monitoring, hot pressures) so the form
    // auto-save never writes them — those fields are only written by their own
    // save functions. Supabase UPDATE is a PATCH so omitted fields are untouched.
    const safe = stripModalOwned(data)
    pendingSetup.current = safe
    saveDraftToStorage(safe)
    setAutoSaveStatus('idle')
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => void autoSave(), 300)
  }

  // Flush to Supabase whenever the tab goes hidden (covers refresh, tab close, navigate away)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden' && pendingSetup.current) {
        void autoSave()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [autoSave])

  // On mount: if localStorage has a draft but no DB row yet, push it to Supabase immediately.
  // Strip modal-owned fields from the flush — those are owned by their own save functions
  // and must never be written by the form auto-save path (avoids overwriting DB with stale nulls).
  useEffect(() => {
    if (!draftKey || !id) return
    try {
      const raw = localStorage.getItem(draftKey)
      if (!raw) return
      const draft = JSON.parse(raw) as Partial<SetupFormData>
      if (!setupRef.current) {
        pendingSetup.current = stripModalOwned(draft)
        void autoSave()
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally empty — runs once on mount only

  // Clean up timer on unmount
  useEffect(() => () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current) }, [])


  // ── Auto-save engine monitoring ──────────────────────────────────────────────
  // NOTE: engineMonOpen is intentionally NOT in the dep array — the timer must
  // survive modal-close so a save in progress isn't cancelled when the user
  // dismisses the modal. engineMonEverOpened guards against saving the empty
  // initial state before the modal has ever been opened.
  useEffect(() => {
    if (!engineMonEverOpened.current || !setup?.id) return
    const timer = setTimeout(() => {
      void supabase.from('setups').update({
        max_engine_temp_c:  inputTempToC(emMaxEngineTemp,  tempUnit),
        low_engine_temp_c:  inputTempToC(emLowEngineTemp,  tempUnit),
        max_exhaust_temp_c: inputTempToC(emMaxExhaustTemp, tempUnit),
        low_exhaust_temp_c: inputTempToC(emLowExhaustTemp, tempUnit),
        max_rpm:      emMaxRpm  ? Number(emMaxRpm)  : null,
        low_rpm:      emLowRpm  ? Number(emLowRpm)  : null,
        top_speed_kph: inputSpeedToKph(emMaxSpeed, speedUnit),
        low_speed_kph: inputSpeedToKph(emLowSpeed, speedUnit),
      }).eq('id', setup.id)
    }, 600)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emMaxEngineTemp, emLowEngineTemp, emMaxExhaustTemp, emLowExhaustTemp, emMaxRpm, emLowRpm, emMaxSpeed, emLowSpeed])

  // ── Auto-save hot pressures ───────────────────────────────────────────────────
  // Same pattern — hotPressureOpen intentionally excluded from deps.
  useEffect(() => {
    if (!hotPressureEverOpened.current || !setup?.id) return
    const timer = setTimeout(() => {
      void supabase.from('setups').update({
        hot_pressure_fl: hotFL ? Number(hotFL) : null,
        hot_pressure_fr: hotFR ? Number(hotFR) : null,
        hot_pressure_rl: hotRL ? Number(hotRL) : null,
        hot_pressure_rr: hotRR ? Number(hotRR) : null,
      }).eq('id', setup.id)
    }, 600)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotFL, hotFR, hotRL, hotRR])


  function openHotPressures() {
    hotPressureEverOpened.current = true
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
    engineMonEverOpened.current = true
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

  async function openPDFPreview() {
    if (!session) return
    setExporting(true)
    try {
      const { generateSessionPDFUrl } = await import('@/components/SessionPDF')
      const result = await generateSessionPDFUrl({
        session, setup: setup ?? null, lapTimes, changes, bestLap: bestLap ?? null,
        sessionLabel: currentSessionLabel ?? session.session_name ?? undefined,
        teamName: teamBranding.team_name,
        teamLogoUrl: teamBranding.logo_url,
        teamPrimaryColor: teamBranding.primary_color,
        teamSecondaryColor: teamBranding.secondary_color,
      })
      setPdfPreviewUrl(result.url)
      setPdfFilename(result.filename)
      setShowPDFPreview(true)
    } finally {
      setExporting(false)
    }
  }

  function savePDF() {
    if (!pdfPreviewUrl) return
    const a = document.createElement('a')
    a.href = pdfPreviewUrl
    a.download = pdfFilename
    a.click()
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
          <Button variant="secondary" size="sm" onClick={() => setEngineMonOpen(true)} loading={scanning}>
            <Camera size={14} /> Scan Dashboard
          </Button>
          <Button variant="secondary" size="sm" onClick={() => void openPDFPreview()} loading={exporting}>
            <FileDown size={14} /> Preview PDF
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
            {(session.track?.location || session.track?.country) && (
              <p className="text-text-muted/60 text-xs font-mono mt-0.5">
                {[session.track.location, session.track.country].filter(Boolean).join(' · ')}
              </p>
            )}
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
                    <th className="px-2 py-1.5" />
                  </tr>
                </thead>
                <tbody>
                  {lapTimes.map((lap, idx) => {
                    const displayNum = idx + 1
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
                        <td className="px-2 py-1.5 font-mono text-text-muted">{displayNum}</td>
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
                        <td className="px-2 py-1.5 text-right">
                          <button
                            type="button"
                            onClick={() => { if (window.confirm(`Delete Lap ${displayNum} (${lapMsToString(lap.lap_time_ms)})?`)) void deleteLap(lap.id) }}
                            className="p-1 rounded text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
                            title="Delete lap"
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
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
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-sm uppercase tracking-wider text-text-primary">Setup</h3>
          <span className={[
            'text-xs font-medium transition-opacity duration-300',
            autoSaveStatus === 'saving' ? 'text-text-muted opacity-100' :
            autoSaveStatus === 'saved'  ? 'text-green-400 opacity-100' :
            'opacity-0',
          ].join(' ')}>
            {autoSaveStatus === 'saving' ? 'Saving…' : '✓ Saved'}
          </span>
        </div>
        {setupLoading && !draftKey ? (
          <p className="text-text-muted text-sm">Loading…</p>
        ) : (
          <>
            <SetupForm
              key={id}
              initialSetup={(() => {
                // Prefer localStorage draft for form fields — it captures keystrokes
                // between auto-saves. But engine monitoring and hot pressure fields
                // are saved independently (via their modals / scan) and must always
                // come from the DB so a stale draft can't overwrite them on refresh.
                let draft: Partial<SetupFormData> | null = null
                if (draftKey) {
                  try {
                    const raw = localStorage.getItem(draftKey)
                    if (raw) draft = JSON.parse(raw) as Partial<SetupFormData>
                  } catch {}
                }
                if (!draft) return (setup ?? {})
                // Strip modal-owned fields from draft so DB wins for those
                const {
                  max_rpm: _mr, low_rpm: _lr,
                  max_engine_temp_c: _met, low_engine_temp_c: _let,
                  max_exhaust_temp_c: _mxt, low_exhaust_temp_c: _lxt,
                  top_speed_kph: _ts, low_speed_kph: _ls,
                  hot_pressure_fl: _hfl, hot_pressure_fr: _hfr,
                  hot_pressure_rl: _hrl, hot_pressure_rr: _hrr,
                  ...draftRest
                } = draft
                return { ...(setup ?? {}), ...draftRest }
              })()}
              onChange={handleSetupChange}
              onSave={saveSetup}
              saving={saving}
              pressureUnit={pressureUnit}
              showSaveButton
              prevPressureRec={prevSessionRec}
            />
            {setupSaveError && (
              <p className="mt-3 text-sm text-red-400">{setupSaveError}</p>
            )}
          </>
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
      <Modal isOpen={engineMonOpen} onClose={() => setEngineMonOpen(false)} title="Engine Monitoring" maxWidth="max-w-2xl">
        <p className="text-xs text-text-muted mb-4 uppercase tracking-wider font-heading">Post-session engine data</p>

        {/* Scan Dashboard — camera or gallery */}
        {scanning ? (
          <div className="w-full flex items-center justify-center gap-2 py-2.5 mb-5 rounded-card border border-dashed border-accent-primary/40 text-accent-primary text-xs font-heading font-bold uppercase tracking-wider">
            <span className="w-3.5 h-3.5 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
            Scanning dashboard…
          </div>
        ) : (
          <div className="flex gap-2 mb-5">
            <button type="button" onClick={() => dashboardCameraRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-card border border-dashed border-accent-primary/40 text-accent-primary text-xs font-heading font-bold uppercase tracking-wider hover:bg-accent-primary/5 transition-colors cursor-pointer">
              <Camera size={14} /> Take Photo
            </button>
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-card border border-dashed border-accent-primary/40 text-accent-primary text-xs font-heading font-bold uppercase tracking-wider hover:bg-accent-primary/5 transition-colors cursor-pointer">
              <Camera size={14} /> From Gallery
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {/* Engine Temp */}
          <div className="rounded-card border border-border-color bg-bg-elevated p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-red-500/15 flex items-center justify-center flex-shrink-0">
                <Thermometer size={14} className="text-red-400" />
              </div>
              <p className="font-heading text-xs uppercase tracking-wider text-text-primary">Engine Temp</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Max" type="number" unit={tempUnitLabel(tempUnit)} value={emMaxEngineTemp} onChange={e => setEmMaxEngineTemp(e.target.value)} placeholder="—" />
              <Input label="Low" type="number" unit={tempUnitLabel(tempUnit)} value={emLowEngineTemp} onChange={e => setEmLowEngineTemp(e.target.value)} placeholder="—" />
            </div>
          </div>
          {/* Exhaust Temp */}
          <div className="rounded-card border border-border-color bg-bg-elevated p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-orange-500/15 flex items-center justify-center flex-shrink-0">
                <Thermometer size={14} className="text-orange-400" />
              </div>
              <p className="font-heading text-xs uppercase tracking-wider text-text-primary">Exhaust Temp</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Max" type="number" unit={tempUnitLabel(tempUnit)} value={emMaxExhaustTemp} onChange={e => setEmMaxExhaustTemp(e.target.value)} placeholder="—" />
              <Input label="Low" type="number" unit={tempUnitLabel(tempUnit)} value={emLowExhaustTemp} onChange={e => setEmLowExhaustTemp(e.target.value)} placeholder="—" />
            </div>
          </div>
          {/* RPM */}
          <div className="rounded-card border border-border-color bg-bg-elevated p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-accent-primary/10 flex items-center justify-center flex-shrink-0">
                <Gauge size={14} className="text-accent-primary" />
              </div>
              <p className="font-heading text-xs uppercase tracking-wider text-text-primary">RPM</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Max" type="number" unit="rpm" value={emMaxRpm} onChange={e => setEmMaxRpm(e.target.value)} placeholder="—" />
              <Input label="Low" type="number" unit="rpm" value={emLowRpm} onChange={e => setEmLowRpm(e.target.value)} placeholder="—" />
            </div>
          </div>
          {/* Speed */}
          <div className="rounded-card border border-border-color bg-bg-elevated p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                <Zap size={14} className="text-blue-400" />
              </div>
              <p className="font-heading text-xs uppercase tracking-wider text-text-primary">Speed</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Max" type="number" unit={speedUnitLabel(speedUnit)} value={emMaxSpeed} onChange={e => setEmMaxSpeed(e.target.value)} placeholder="—" />
              <Input label="Low" type="number" unit={speedUnitLabel(speedUnit)} value={emLowSpeed} onChange={e => setEmLowSpeed(e.target.value)} placeholder="—" />
            </div>
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

        <div className="grid grid-cols-2 gap-4 mb-5">
          <Input id="hot-fl" label="Front Left" type="number" unit={pressureUnit} value={hotFL} placeholder="0.00"
            onChange={e => { setHotFL(e.target.value); if (/^\d+\.\d{2}$/.test(e.target.value)) document.getElementById('hot-fr')?.focus() }}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('hot-fr')?.focus() } }} />
          <Input id="hot-fr" label="Front Right" type="number" unit={pressureUnit} value={hotFR} placeholder="0.00"
            onChange={e => { setHotFR(e.target.value); if (/^\d+\.\d{2}$/.test(e.target.value)) document.getElementById('hot-rl')?.focus() }}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('hot-rl')?.focus() } }} />
          <Input id="hot-rl" label="Rear Left" type="number" unit={pressureUnit} value={hotRL} placeholder="0.00"
            onChange={e => { setHotRL(e.target.value); if (/^\d+\.\d{2}$/.test(e.target.value)) document.getElementById('hot-rr')?.focus() }}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('hot-rr')?.focus() } }} />
          <Input id="hot-rr" label="Rear Right" type="number" unit={pressureUnit} value={hotRR} placeholder="0.00"
            onChange={e => { setHotRR(e.target.value); if (/^\d+\.\d{2}$/.test(e.target.value)) (document.querySelector('[data-hot-save]') as HTMLButtonElement)?.focus() }}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); (document.querySelector('[data-hot-save]') as HTMLButtonElement)?.click() } }} />
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={() => setHotPressureOpen(false)}>Cancel</Button>
          <Button size="sm" onClick={() => void saveHotPressures()} loading={savingHot} data-hot-save>Save</Button>
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

      {/* Hidden file inputs for dashboard scan */}
      <input ref={dashboardCameraRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) void handleScanFile(f) }} />
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) void handleScanFile(f) }} />

      {/* Scan Results — review & edit before saving */}
      <Modal isOpen={!!scanResult} onClose={() => setScanResult(null)} title="Review Scan Results" maxWidth="max-w-2xl">
        <p className="text-sm text-text-muted mb-5">Check the values extracted from your dashboard photo. Edit anything that looks wrong, then press Save.</p>
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
              <p className="text-xs font-heading font-bold text-text-muted uppercase mb-3">Engine Temp</p>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Max" type="number" unit="°C" value={scanResult.max_engine_temp_c ?? ''}
                  onChange={e => setScanResult(r => r ? { ...r, max_engine_temp_c: e.target.value ? Number(e.target.value) : null } : r)} />
                <Input label="Low" type="number" unit="°C" value={scanResult.low_engine_temp_c ?? ''}
                  onChange={e => setScanResult(r => r ? { ...r, low_engine_temp_c: e.target.value ? Number(e.target.value) : null } : r)} />
              </div>
            </div>
            <div>
              <p className="text-xs font-heading font-bold text-text-muted uppercase mb-3">Exhaust Temp</p>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Max" type="number" unit="°C" value={scanResult.max_exhaust_temp_c ?? ''}
                  onChange={e => setScanResult(r => r ? { ...r, max_exhaust_temp_c: e.target.value ? Number(e.target.value) : null } : r)} />
                <Input label="Low" type="number" unit="°C" value={scanResult.low_exhaust_temp_c ?? ''}
                  onChange={e => setScanResult(r => r ? { ...r, low_exhaust_temp_c: e.target.value ? Number(e.target.value) : null } : r)} />
              </div>
            </div>
            <div>
              <p className="text-xs font-heading font-bold text-text-muted uppercase mb-3">RPM</p>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Max" type="number" unit="rpm" value={scanResult.max_rpm ?? ''}
                  onChange={e => setScanResult(r => r ? { ...r, max_rpm: e.target.value ? Number(e.target.value) : null } : r)} />
                <Input label="Low" type="number" unit="rpm" value={scanResult.low_rpm ?? ''}
                  onChange={e => setScanResult(r => r ? { ...r, low_rpm: e.target.value ? Number(e.target.value) : null } : r)} />
              </div>
            </div>
            {(scanResult.top_speed != null || scanResult.low_speed != null) && (
              <div>
                <p className="text-xs font-heading font-bold text-text-muted uppercase mb-3">Speed ({scanResult.top_speed_unit ?? 'kph'})</p>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Max" type="number" unit={scanResult.top_speed_unit ?? 'kph'} value={scanResult.top_speed ?? ''}
                    onChange={e => setScanResult(r => r ? { ...r, top_speed: e.target.value ? Number(e.target.value) : null } : r)} />
                  <Input label="Low" type="number" unit={scanResult.top_speed_unit ?? 'kph'} value={scanResult.low_speed ?? ''}
                    onChange={e => setScanResult(r => r ? { ...r, low_speed: e.target.value ? Number(e.target.value) : null } : r)} />
                </div>
              </div>
            )}
            <div className="flex gap-2 justify-end pt-2 border-t border-border-color">
              <Button variant="ghost" size="sm" onClick={() => setScanResult(null)}>Discard</Button>
              <Button size="sm" onClick={() => void saveScanResult()} loading={savingScan}>Save</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* PDF Preview modal */}
      {showPDFPreview && pdfPreviewUrl && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/80">
          <div className="flex items-center justify-between px-4 py-2 bg-bg-card border-b border-border-color flex-shrink-0">
            <span className="text-sm font-semibold text-text-primary">PDF Preview</span>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={savePDF}>
                <Download size={13} /> Save PDF
              </Button>
              <button
                onClick={() => { setShowPDFPreview(false); if (pdfPreviewUrl) { URL.revokeObjectURL(pdfPreviewUrl); setPdfPreviewUrl(null) } }}
                className="p-1.5 rounded hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto bg-gray-700 flex flex-col items-center py-6 gap-4">
            <Document
              file={pdfPreviewUrl}
              onLoadSuccess={({ numPages: n }) => setPdfNumPages(n)}
              loading={<p className="text-white text-sm">Loading pages…</p>}
            >
              {Array.from({ length: pdfNumPages }, (_, i) => (
                <Page
                  key={i + 1}
                  pageNumber={i + 1}
                  width={Math.min(window.innerWidth - 48, 800)}
                  className="shadow-2xl"
                />
              ))}
            </Document>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
