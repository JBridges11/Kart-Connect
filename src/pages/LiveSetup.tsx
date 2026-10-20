import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2, AlertTriangle, Clock, Loader2, ChevronLeft, Plus, Camera, X } from 'lucide-react'
import { SetupForm } from '@/components/forms/SetupForm'
import { setupDefaults } from '@/lib/setupDefaults'
import type { SetupFormData } from '@/types'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const DEFAULT_NUM_SLOTS = 8

interface WeekendFormat {
  practice: number
  qualifying: number
  heats: number
  finals: number
}

function getSessionLabels(format: WeekendFormat): string[] {
  const labels: string[] = []
  for (let i = 1; i <= format.practice; i++)   labels.push(`Practice ${i}`)
  for (let i = 1; i <= format.qualifying; i++) labels.push(`Qualifying ${i}`)
  for (let i = 1; i <= format.heats; i++)      labels.push(`Heat ${i}`)
  for (let i = 1; i <= format.finals; i++)     labels.push(`Final ${i}`)
  return labels
}

const cacheKey  = (t: string) => `kc_live_${t}`
const queueKey  = (t: string) => `kc_live_queue_${t}`

interface QueueEntry {
  token: string
  slot: number
  setup_data: Partial<SetupFormData>
  selected_engine_rank: number | null
  is_final: boolean
  queued_at: number
}

type ErrorCode = 'invalid_token' | 'not_live_yet' | 'session_ended' | 'session_expired' | 'server_error'
type PageState = 'loading' | 'error' | 'slots' | 'form'

interface SlotState {
  setup: Partial<SetupFormData> | null
  submitted: boolean
}

interface GuestData {
  driver_name: string
  driver_class: string | null
  kart_make: string | null
  kart_model: string | null
  chassis_number: string | null
  chassis_stiffness: string | null
  engines: Array<{ rank: number; make: string; number: string }>
  track_name: string
  session_name: string
  session_date: string
  expires_at: string | null
  weekend_format: WeekendFormat | null
  slots: Record<string, SlotState>
  previous_setup: Partial<SetupFormData> | null
  pressure_unit: 'bar' | 'psi'
  alt_unit: 'm' | 'ft'
  temp_unit: 'c' | 'f'
  speed_unit: 'kph' | 'mph'
}

interface DashScanResult {
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
}

function ErrorScreen({ code }: { code: ErrorCode }) {
  const messages: Record<ErrorCode, { title: string; body: string }> = {
    invalid_token: {
      title: 'Invalid Link',
      body: 'This setup link is not valid. Please check the URL or ask your team manager for a new QR code.',
    },
    not_live_yet: {
      title: 'Not Live Yet',
      body: "The session hasn't gone live yet. Your manager will activate it shortly.",
    },
    session_ended: {
      title: 'Session Ended',
      body: 'This session has ended. Your setup link is no longer active.',
    },
    session_expired: {
      title: 'Session Expired',
      body: 'This session has expired. Contact your manager if you need access.',
    },
    server_error: {
      title: 'Something went wrong',
      body: 'A server error occurred. Please try again in a moment.',
    },
  }
  const msg = messages[code]
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center">
        <AlertTriangle size={40} className="mx-auto mb-4 text-orange-500" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">{msg.title}</h1>
        <p className="text-gray-500 text-sm">{msg.body}</p>
        <img src="/logo-pdf.png" alt="Kart Connect" className="h-10 mx-auto mt-10 opacity-50" />
      </div>
    </div>
  )
}

function LiveDot() {
  return (
    <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-green-500">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
      </span>
      Live Setup
    </span>
  )
}

async function compressToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
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
}

export function LiveSetupPage() {
  const { token } = useParams<{ token: string }>()

  const [guestData, setGuestData] = useState<GuestData | null>(null)
  const [errorCode, setErrorCode] = useState<ErrorCode | null>(null)
  const [pageState, setPageState] = useState<PageState>('loading')

  const [currentSlot, setCurrentSlot] = useState<number>(1)
  const [currentSetup, setCurrentSetup] = useState<Partial<SetupFormData>>({})
  const [formKey, setFormKey] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [slotJustSubmitted, setSlotJustSubmitted] = useState(false)
  const [submittedOffline, setSubmittedOffline] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  const [queuedCount, setQueuedCount] = useState(0)

  // Auto-save
  const [isDirty, setIsDirty] = useState(false)
  const [autoSaveState, setAutoSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isAutoSavingRef = useRef(false)

  // Dashboard scan
  const dashFileRef = useRef<HTMLInputElement>(null)
  const [scanningDash, setScanningDash] = useState(false)
  const [dashResult, setDashResult] = useState<DashScanResult | null>(null)

  // Tyre pressure scan
  const pressureFileRef = useRef<HTMLInputElement>(null)
  const [scanningPressures, setScanningPressures] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/guest-session-read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        setErrorCode((json.error as ErrorCode) ?? 'server_error')
        setPageState('error')
        return
      }
      try { localStorage.setItem(cacheKey(token!), JSON.stringify(json)) } catch {}
      setIsOffline(false)
      setGuestData(json as GuestData)
      setPageState('slots')
    } catch {
      // Network failure — try local cache so mechanics can work offline
      try {
        const cached = localStorage.getItem(cacheKey(token!))
        if (cached) {
          setGuestData(JSON.parse(cached) as GuestData)
          setIsOffline(true)
          const q: QueueEntry[] = JSON.parse(localStorage.getItem(queueKey(token!)) ?? '[]')
          setQueuedCount(q.length)
          setPageState('slots')
          return
        }
      } catch {}
      setErrorCode('server_error')
      setPageState('error')
    }
  }, [token])

  useEffect(() => { void loadData() }, [loadData])

  // Auto-save: debounce 1.5s after any setup/engine change
  useEffect(() => {
    if (!isDirty || pageState !== 'form') return
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = setTimeout(async () => {
      if (isAutoSavingRef.current) return
      isAutoSavingRef.current = true
      setAutoSaveState('saving')
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/guest-session-save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            slot: currentSlot,
            setup_data: currentSetup,
            selected_engine_rank: currentSetup.engine_rank ?? null,
            is_final: false,
          }),
        })
        const json = await res.json()
        if (res.ok && !json.error) {
          setAutoSaveState('saved')
          setIsDirty(false)
          setGuestData(prev => {
            if (!prev) return prev
            return {
              ...prev,
              slots: {
                ...prev.slots,
                [String(currentSlot)]: {
                  setup: currentSetup,
                  submitted: prev.slots[String(currentSlot)]?.submitted ?? false,
                },
              },
            }
          })
        } else {
          setAutoSaveState('idle')
        }
      } catch {
        // Offline — queue this draft save so nothing is lost
        enqueueOfflineSave({
          token: token!, slot: currentSlot, setup_data: currentSetup,
          selected_engine_rank: currentSetup.engine_rank ?? null,
          is_final: false, queued_at: Date.now(),
        })
        setIsOffline(true)
        setAutoSaveState('idle')
      } finally {
        isAutoSavingRef.current = false
      }
    }, 1500)
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current) }
  }, [currentSetup, isDirty, pageState, token, currentSlot])

  // Clear 'saved' badge after 3 seconds
  useEffect(() => {
    if (autoSaveState !== 'saved') return
    const t = setTimeout(() => setAutoSaveState('idle'), 3000)
    return () => clearTimeout(t)
  }, [autoSaveState])

  // ── Offline queue helpers ──────────────────────────────────────────────────

  function enqueueOfflineSave(entry: QueueEntry) {
    try {
      const key = queueKey(token!)
      const existing: QueueEntry[] = JSON.parse(localStorage.getItem(key) ?? '[]')
      // Replace any existing queued entry for the same slot+finality
      const filtered = existing.filter(e => !(e.slot === entry.slot && e.is_final === entry.is_final))
      filtered.push(entry)
      localStorage.setItem(key, JSON.stringify(filtered))
      setQueuedCount(filtered.length)
    } catch {}
  }

  function updateLocalCache(updatedData: GuestData) {
    try { localStorage.setItem(cacheKey(token!), JSON.stringify(updatedData)) } catch {}
  }

  const drainOfflineQueue = useCallback(async () => {
    try {
      const key = queueKey(token!)
      const queue: QueueEntry[] = JSON.parse(localStorage.getItem(key) ?? '[]')
      if (!queue.length) return
      const remaining: QueueEntry[] = []
      for (const entry of queue) {
        try {
          const res = await fetch(`${SUPABASE_URL}/functions/v1/guest-session-save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entry),
          })
          if (!res.ok) remaining.push(entry)
        } catch {
          remaining.push(entry)
        }
      }
      if (remaining.length === 0) {
        localStorage.removeItem(key)
        setQueuedCount(0)
        setIsOffline(false)
      } else {
        localStorage.setItem(key, JSON.stringify(remaining))
        setQueuedCount(remaining.length)
      }
    } catch {}
  }, [token])

  // Drain queue whenever connectivity returns
  useEffect(() => {
    const handleOnline = () => { setIsOffline(false); void drainOfflineQueue() }
    window.addEventListener('online', handleOnline)
    // Also drain on mount in case we came back online between page loads
    if (navigator.onLine) void drainOfflineQueue()
    return () => window.removeEventListener('online', handleOnline)
  }, [drainOfflineQueue])

  function openSlot(slotNum: number) {
    if (!guestData) return
    const slot = guestData.slots[String(slotNum)]
    setCurrentSlot(slotNum)
    setCurrentSetup(slot?.setup ? { ...slot.setup } : { ...setupDefaults })
    setFormKey(0)

    setSaveError(null)
    setSlotJustSubmitted(false)
    setDashResult(null)
    setIsDirty(false)
    setAutoSaveState('idle')
    setPageState('form')
  }

  const POST_SESSION_KEYS: Array<keyof SetupFormData> = [
    'hot_pressure_fl', 'hot_pressure_fr', 'hot_pressure_rl', 'hot_pressure_rr',
    'max_engine_temp_c', 'low_engine_temp_c', 'max_exhaust_temp_c', 'low_exhaust_temp_c',
    'max_rpm', 'low_rpm', 'top_speed_kph', 'low_speed_kph',
  ]

  function copyFromSlot(slotNum: number) {
    if (!guestData) return
    const source = guestData.slots[String(slotNum)]?.setup
    if (!source) return
    const copied = { ...source }
    POST_SESSION_KEYS.forEach(k => { (copied as Record<string, unknown>)[k] = null })
    setCurrentSetup(copied)
    setFormKey(k => k + 1)
  }

  function loadPreviousSetup() {
    if (!guestData?.previous_setup) return
    const loaded = { ...guestData.previous_setup } as Partial<SetupFormData>
    POST_SESSION_KEYS.forEach(k => { delete (loaded as Record<string, unknown>)[k] })
    setCurrentSetup(loaded)
    setFormKey(k => k + 1)
    setIsDirty(true)
  }

  function backToSlots() {
    setSlotJustSubmitted(false)
    setDashResult(null)
    setPageState('slots')
  }

  async function saveSetup(isFinal: boolean) {
    setSaving(true)
    setSaveError(null)
    const payload: QueueEntry = {
      token: token!,
      slot: currentSlot,
      setup_data: currentSetup,
      selected_engine_rank: currentSetup.engine_rank ?? null,
      is_final: isFinal,
      queued_at: Date.now(),
    }

    // Short-circuit to queue immediately if we know we're offline
    if (!navigator.onLine) {
      enqueueOfflineSave(payload)
      setIsOffline(true)
      setGuestData(prev => {
        if (!prev) return prev
        const updated = {
          ...prev,
          slots: {
            ...prev.slots,
            [String(currentSlot)]: {
              setup: currentSetup,
              submitted: isFinal || (prev.slots[String(currentSlot)]?.submitted ?? false),
            },
          },
        }
        updateLocalCache(updated)
        return updated
      })
      if (isFinal) { setSubmittedOffline(true); setSlotJustSubmitted(true) }
      setSaving(false)
      return
    }

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/guest-session-save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        const errMap: Record<string, string> = {
          session_inactive: 'This session is no longer active.',
          session_closed: 'This session has ended.',
          rate_limited: 'Too many requests. Please wait a moment.',
        }
        setSaveError(errMap[json.error] ?? 'Failed to save. Please try again.')
      } else {
        setGuestData(prev => {
          if (!prev) return prev
          const updated = {
            ...prev,
            slots: {
              ...prev.slots,
              [String(currentSlot)]: {
                setup: currentSetup,
                submitted: isFinal || (prev.slots[String(currentSlot)]?.submitted ?? false),
              },
            },
          }
          updateLocalCache(updated)
          return updated
        })
        if (isFinal) { setSubmittedOffline(false); setSlotJustSubmitted(true) }
      }
    } catch {
      // No network — save to offline queue, treat as success for UX
      enqueueOfflineSave(payload)
      setIsOffline(true)
      setGuestData(prev => {
        if (!prev) return prev
        const updated = {
          ...prev,
          slots: {
            ...prev.slots,
            [String(currentSlot)]: {
              setup: currentSetup,
              submitted: isFinal || (prev.slots[String(currentSlot)]?.submitted ?? false),
            },
          },
        }
        updateLocalCache(updated)
        return updated
      })
      if (isFinal) { setSubmittedOffline(true); setSlotJustSubmitted(true) }
    }
    setSaving(false)
  }

  async function handleDashScanFile(file: File) {
    setScanningDash(true)
    try {
      const base64 = await compressToBase64(file)
      const res = await fetch(`${SUPABASE_URL}/functions/v1/scan-dashboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mimeType: 'image/jpeg' }),
      })
      const data = await res.json() as DashScanResult
      if (!res.ok) throw new Error('Scan failed')
      setDashResult(data)
    } catch (err) {
      alert(`Dashboard scan failed: ${String(err)}`)
    } finally {
      setScanningDash(false)
      if (dashFileRef.current) dashFileRef.current.value = ''
    }
  }

  async function handlePressureScanFile(file: File) {
    setScanningPressures(true)
    try {
      const base64 = await compressToBase64(file)
      const res = await fetch(`${SUPABASE_URL}/functions/v1/scan-tyre-pressures`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mimeType: 'image/jpeg' }),
      })
      const r = await res.json() as { fl: number | null; fr: number | null; rl: number | null; rr: number | null }
      if (!res.ok) throw new Error('Scan failed')
      setCurrentSetup(prev => ({
        ...prev,
        ...(r.fl != null && { hot_pressure_fl: r.fl }),
        ...(r.fr != null && { hot_pressure_fr: r.fr }),
        ...(r.rl != null && { hot_pressure_rl: r.rl }),
        ...(r.rr != null && { hot_pressure_rr: r.rr }),
      }))
    } catch (err) {
      alert(`Pressure scan failed: ${String(err)}`)
    } finally {
      setScanningPressures(false)
      if (pressureFileRef.current) pressureFileRef.current.value = ''
    }
  }

  function applyDashResult() {
    if (!dashResult) return
    const updates: Partial<SetupFormData> = {}
    if (dashResult.best_lap_time      != null) updates.best_lap_time      = dashResult.best_lap_time
    if (dashResult.max_engine_temp_c  != null) updates.max_engine_temp_c  = dashResult.max_engine_temp_c
    if (dashResult.low_engine_temp_c  != null) updates.low_engine_temp_c  = dashResult.low_engine_temp_c
    if (dashResult.max_exhaust_temp_c != null) updates.max_exhaust_temp_c = dashResult.max_exhaust_temp_c
    if (dashResult.low_exhaust_temp_c != null) updates.low_exhaust_temp_c = dashResult.low_exhaust_temp_c
    if (dashResult.max_rpm            != null) updates.max_rpm            = dashResult.max_rpm
    if (dashResult.low_rpm            != null) updates.low_rpm            = dashResult.low_rpm
    if (dashResult.top_speed != null) {
      const factor = dashResult.top_speed_unit === 'mph' ? 1.60934 : 1
      updates.top_speed_kph = Math.round(dashResult.top_speed * factor * 100) / 100
    }
    if (dashResult.low_speed != null) {
      const factor = dashResult.top_speed_unit === 'mph' ? 1.60934 : 1
      updates.low_speed_kph = Math.round(dashResult.low_speed * factor * 100) / 100
    }
    setCurrentSetup(prev => ({ ...prev, ...updates }))
    setDashResult(null)
  }

  if (pageState === 'loading') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-yellow-400" />
      </div>
    )
  }

  if (pageState === 'error') {
    return <ErrorScreen code={errorCode ?? 'server_error'} />
  }

  const d = guestData!
  const sessionLabels = d.weekend_format ? getSessionLabels(d.weekend_format) : []
  const numSlots = sessionLabels.length > 0 ? sessionLabels.length : DEFAULT_NUM_SLOTS
  const slotLabel = (slot: number) => sessionLabels[slot - 1] ?? `Test ${slot}`

  if (slotJustSubmitted) {
    return (
      <div className="min-h-screen bg-white">
        <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 text-center">
          {submittedOffline ? (
            <>
              <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center mb-4">
                <Clock size={28} className="text-orange-500" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{slotLabel(currentSlot)} Saved Offline</h1>
              <p className="text-gray-500 text-sm mb-1">No internet right now — your setup is stored on this device and will sync to your team manager automatically as soon as you're back online.</p>
              <div className="mt-4 px-4 py-3 rounded-xl bg-orange-50 border border-orange-100 text-xs text-orange-700 max-w-xs">
                Keep this page open or come back to it when you have signal — it will sync in the background.
              </div>
            </>
          ) : (
            <>
              <CheckCircle2 size={52} className="text-green-500 mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{slotLabel(currentSlot)} Submitted!</h1>
              <p className="text-gray-500 text-sm mb-1">Your setup for <strong>{d.session_name}</strong> at <strong>{d.track_name}</strong> has been sent to your team manager.</p>
            </>
          )}
          <button
            type="button"
            onClick={backToSlots}
            className="mt-6 w-full max-w-xs py-3 px-4 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:border-gray-400 transition-colors cursor-pointer"
          >
            ← Back to Sessions
          </button>
          <img src="/logo-pdf.png" alt="Kart Connect" className="h-10 mx-auto mt-10 opacity-40" />
        </div>
      </div>
    )
  }

  // Slot list view
  if (pageState === 'slots') {
    const submittedCount  = Object.entries(d.slots).filter(([n, s]) => Number(n) <= numSlots && s?.submitted).length
    const inProgressCount = Object.entries(d.slots).filter(([n, s]) => Number(n) <= numSlots && s?.setup && !s.submitted).length

    return (
      <div className="min-h-screen bg-gray-50 pb-12">
        <div className="max-w-xl mx-auto px-4 pt-8 space-y-4">

          <div className="flex justify-center pb-2">
            <img src="/logo-pdf.png" alt="Kart Connect" className="h-14 object-contain" />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-start justify-between mb-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{d.session_name}</p>
              <LiveDot />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-0.5">Welcome, {d.driver_name}</h1>
            <p className="text-gray-500 text-sm">
              {d.track_name} · {new Date(d.session_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            {(d.kart_make || d.kart_model) && (
              <p className="text-gray-400 text-xs mt-1">{d.kart_make} {d.kart_model}</p>
            )}
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-50 text-xs">
              {submittedCount  > 0 && <span className="text-green-600 font-medium">{submittedCount} submitted</span>}
              {inProgressCount > 0 && <span className="text-yellow-600 font-medium">{inProgressCount} in progress</span>}
              {d.expires_at && (
                <span className="flex items-center gap-1 text-gray-400 ml-auto">
                  <Clock size={11} />
                  Expires {new Date(d.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </span>
              )}
            </div>
          </div>

          {isOffline && (
            <div className="flex items-start gap-2.5 px-4 py-3 rounded-2xl bg-orange-50 border border-orange-200 text-sm text-orange-800">
              <Clock size={16} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Working offline</p>
                <p className="text-xs text-orange-600 mt-0.5">
                  {queuedCount > 0
                    ? `${queuedCount} session${queuedCount !== 1 ? 's' : ''} queued — will sync when you're back online.`
                    : 'Your submissions will sync automatically when signal returns.'}
                </p>
              </div>
            </div>
          )}

          {d.previous_setup && (
            <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-yellow-50 border border-yellow-200">
              <div>
                <p className="text-sm font-semibold text-gray-800">Previous setup found</p>
                <p className="text-xs text-gray-500 mt-0.5">Load {d.driver_name}'s last known setup as a starting point for any session.</p>
              </div>
            </div>
          )}

          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-1">Sessions</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: numSlots }, (_, i) => i + 1).map(slot => {
              const slotData   = d.slots[String(slot)]
              const submitted  = slotData?.submitted ?? false
              const inProgress = !!slotData?.setup && !submitted
              const label      = slotLabel(slot)

              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => openSlot(slot)}
                  className={[
                    'rounded-2xl border p-4 text-left transition-all cursor-pointer',
                    submitted
                      ? 'border-green-200 bg-green-50'
                      : inProgress
                      ? 'border-yellow-200 bg-yellow-50'
                      : 'border-gray-100 bg-white hover:border-gray-300 hover:shadow-sm',
                  ].join(' ')}
                >
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">{label}</p>
                  {submitted ? (
                    <div className="flex items-center gap-1.5 text-green-600 text-xs font-medium">
                      <CheckCircle2 size={13} /> Submitted
                    </div>
                  ) : inProgress ? (
                    <div className="flex items-center gap-1.5 text-yellow-600 text-xs font-medium">
                      <div className="w-2 h-2 rounded-full bg-yellow-400" /> In Progress
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                      <Plus size={13} /> Start
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // Setup form view
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-xl mx-auto px-4 pt-5 space-y-4">

        {/* Back nav + auto-save indicator */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={backToSlots}
            className="flex items-center gap-1 text-gray-500 hover:text-gray-800 text-sm transition-colors cursor-pointer"
          >
            <ChevronLeft size={16} /> Sessions
          </button>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-semibold text-gray-800">{slotLabel(currentSlot)}</span>
          <div className="ml-auto flex items-center gap-1.5 text-xs transition-opacity duration-500"
               style={{ opacity: autoSaveState === 'idle' ? 0 : 1 }}>
            {autoSaveState === 'saving' ? (
              <>
                <Loader2 size={12} className="animate-spin text-gray-400" />
                <span className="text-gray-400">Saving…</span>
              </>
            ) : autoSaveState === 'saved' ? (
              <>
                <CheckCircle2 size={12} className="text-green-500" />
                <span className="text-green-600 font-medium">Progress saved</span>
              </>
            ) : null}
          </div>
        </div>

        {/* Offline indicator */}
        {isOffline && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-50 border border-orange-200 text-xs text-orange-700">
            <Clock size={12} className="flex-shrink-0" />
            <span>Offline — setup will sync when connected{queuedCount > 0 ? ` (${queuedCount} queued)` : ''}</span>
          </div>
        )}

        {/* Copy from another session or previous race weekend */}
        {(() => {
          const filledSlots = Object.entries(d.slots)
            .filter(([num, s]) => Number(num) !== currentSlot && s?.setup)
            .map(([num]) => Number(num))
          const hasPrev = !!d.previous_setup
          if (filledSlots.length === 0 && !hasPrev) return null
          return (
            <div className="bg-white border border-yellow-200 rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3">
              {filledSlots.length > 0 && (
                <>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider shrink-0">Copy from:</span>
                  <div className="flex gap-2 flex-wrap">
                    {filledSlots.map(num => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => copyFromSlot(num)}
                        className="px-3 py-1 rounded-full bg-yellow-400 text-black text-xs font-bold hover:bg-yellow-300 transition-colors cursor-pointer"
                      >
                        Test {num}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {hasPrev && (
                <>
                  {filledSlots.length > 0 && <span className="text-gray-200 text-sm">|</span>}
                  <button
                    type="button"
                    onClick={loadPreviousSetup}
                    className="px-3 py-1 rounded-full bg-gray-800 text-white text-xs font-bold hover:bg-gray-700 transition-colors cursor-pointer"
                  >
                    Load Previous Setup
                  </button>
                </>
              )}
            </div>
          )
        })()}

        {/* Kart info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Your Kart</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            {d.kart_make      && <><span className="text-gray-400">Make</span><span className="text-gray-800 font-medium">{d.kart_make}</span></>}
            {d.kart_model     && <><span className="text-gray-400">Model</span><span className="text-gray-800 font-medium">{d.kart_model}</span></>}
            {d.chassis_number && <><span className="text-gray-400">Chassis #</span><span className="text-gray-800 font-mono text-xs">{d.chassis_number}</span></>}
            {d.chassis_stiffness && <><span className="text-gray-400">Stiffness</span><span className="text-gray-800 font-medium">{d.chassis_stiffness}</span></>}
            {d.driver_class   && <><span className="text-gray-400">Class</span><span className="text-gray-800 font-medium">{d.driver_class}</span></>}
          </div>
        </div>


        {/* Setup form */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Setup</p>
          </div>
          <SetupForm
            key={formKey}
            initialSetup={currentSetup}
            onChange={updated => { setCurrentSetup(updated); setIsDirty(true) }}
            pressureUnit={d.pressure_unit}
            hideIdentifiers
            engines={d.engines as import('@/types').KartEngine[]}
          />
        </div>

        {/* Post-Session Data */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Post-Session Data</p>

          {/* Best Lap Time */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Best Lap Time</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="e.g. 0.45.52"
              value={currentSetup.best_lap_time ?? ''}
              onChange={e => { setCurrentSetup(prev => ({ ...prev, best_lap_time: e.target.value || null })); setIsDirty(true) }}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-yellow-400"
            />
          </div>

          {/* Hot Tyre Pressures */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3">Hot Tyre Pressures</p>
            <button
              type="button"
              onClick={() => pressureFileRef.current?.click()}
              disabled={scanningPressures}
              className="w-full flex items-center justify-center gap-2 py-2.5 mb-4 rounded-xl border border-dashed border-yellow-400/60 text-yellow-600 text-xs font-bold uppercase tracking-wider hover:bg-yellow-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-default"
            >
              {scanningPressures ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
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
            <div className="grid grid-cols-2 gap-3">
              {(['FL', 'FR', 'RL', 'RR'] as const).map(corner => {
                const key = `hot_pressure_${corner.toLowerCase()}` as keyof SetupFormData
                return (
                  <div key={corner}>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{corner}</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={currentSetup[key] as number | '' ?? ''}
                        onChange={e => { setCurrentSetup(prev => ({ ...prev, [key]: e.target.value ? Number(e.target.value) : null })); setIsDirty(true) }}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 pr-12 focus:outline-none focus:border-yellow-400"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{d.pressure_unit}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Dashboard / Engine Data */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3">Dashboard &amp; Engine Data</p>
            <button
              type="button"
              onClick={() => dashFileRef.current?.click()}
              disabled={scanningDash}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-yellow-400/60 text-yellow-600 text-xs font-bold uppercase tracking-wider hover:bg-yellow-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-default"
            >
              {scanningDash ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                  Scanning dashboard…
                </>
              ) : (
                <>
                  <Camera size={14} />
                  Scan Dashboard
                </>
              )}
            </button>
            <input
              ref={dashFileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) void handleDashScanFile(f) }}
            />

            <div className="mt-4 grid grid-cols-2 gap-3">
              {([
                { label: 'Engine Temp Max',  unit: d.temp_unit  === 'f' ? '°F' : '°C', key: 'max_engine_temp_c'  },
                { label: 'Engine Temp Low',  unit: d.temp_unit  === 'f' ? '°F' : '°C', key: 'low_engine_temp_c'  },
                { label: 'Exhaust Temp Max', unit: d.temp_unit  === 'f' ? '°F' : '°C', key: 'max_exhaust_temp_c' },
                { label: 'Exhaust Temp Low', unit: d.temp_unit  === 'f' ? '°F' : '°C', key: 'low_exhaust_temp_c' },
                { label: 'Max RPM',          unit: 'rpm',                                key: 'max_rpm'           },
                { label: 'Low RPM',          unit: 'rpm',                                key: 'low_rpm'           },
                { label: 'Top Speed',        unit: d.speed_unit,                         key: 'top_speed_kph'     },
                { label: 'Low Speed',        unit: d.speed_unit,                         key: 'low_speed_kph'     },
              ] as const).map(({ label, unit, key }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="—"
                      value={currentSetup[key] ?? ''}
                      onChange={e => { setCurrentSetup(prev => ({ ...prev, [key]: e.target.value ? Number(e.target.value) : null })); setIsDirty(true) }}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 pr-12 focus:outline-none focus:border-yellow-400"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Error */}
        {saveError && (
          <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
            {saveError}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-1">
          <button
            type="button"
            disabled={saving}
            onClick={() => void saveSetup(true)}
            className="w-full py-3 px-4 rounded-xl bg-yellow-400 text-black text-sm font-bold hover:bg-yellow-300 transition-colors cursor-pointer disabled:opacity-50"
          >
            {saving ? (isOffline ? 'Queuing…' : 'Submitting…') : `Submit Test ${currentSlot}`}
          </button>
        </div>
      </div>

      {/* Dashboard Scan Review modal */}
      {dashResult && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4 sm:pb-0">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
              <p className="font-bold text-gray-900">Dashboard Scan — Review</p>
              <button type="button" onClick={() => setDashResult(null)} className="text-gray-400 hover:text-gray-700 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
              <p className="text-xs text-gray-500">Check the values Claude extracted. Edit anything wrong before applying.</p>

              {dashResult.best_lap_time != null && (
                <ScanField
                  label="Best Lap Time"
                  value={dashResult.best_lap_time}
                  onChange={v => setDashResult(r => r ? { ...r, best_lap_time: v || null } : r)}
                />
              )}

              <div className="grid grid-cols-2 gap-3">
                {dashResult.max_engine_temp_c != null && (
                  <ScanNumField label="Engine Temp Max (°C)" value={dashResult.max_engine_temp_c}
                    onChange={v => setDashResult(r => r ? { ...r, max_engine_temp_c: v } : r)} />
                )}
                {dashResult.low_engine_temp_c != null && (
                  <ScanNumField label="Engine Temp Low (°C)" value={dashResult.low_engine_temp_c}
                    onChange={v => setDashResult(r => r ? { ...r, low_engine_temp_c: v } : r)} />
                )}
                {dashResult.max_exhaust_temp_c != null && (
                  <ScanNumField label="Exhaust Temp Max (°C)" value={dashResult.max_exhaust_temp_c}
                    onChange={v => setDashResult(r => r ? { ...r, max_exhaust_temp_c: v } : r)} />
                )}
                {dashResult.low_exhaust_temp_c != null && (
                  <ScanNumField label="Exhaust Temp Low (°C)" value={dashResult.low_exhaust_temp_c}
                    onChange={v => setDashResult(r => r ? { ...r, low_exhaust_temp_c: v } : r)} />
                )}
                {dashResult.max_rpm != null && (
                  <ScanNumField label="Max RPM" value={dashResult.max_rpm}
                    onChange={v => setDashResult(r => r ? { ...r, max_rpm: v } : r)} />
                )}
                {dashResult.low_rpm != null && (
                  <ScanNumField label="Low RPM" value={dashResult.low_rpm}
                    onChange={v => setDashResult(r => r ? { ...r, low_rpm: v } : r)} />
                )}
                {dashResult.top_speed != null && (
                  <ScanNumField label={`Top Speed (${dashResult.top_speed_unit ?? 'kph'})`} value={dashResult.top_speed}
                    onChange={v => setDashResult(r => r ? { ...r, top_speed: v } : r)} />
                )}
                {dashResult.low_speed != null && (
                  <ScanNumField label={`Low Speed (${dashResult.top_speed_unit ?? 'kph'})`} value={dashResult.low_speed}
                    onChange={v => setDashResult(r => r ? { ...r, low_speed: v } : r)} />
                )}
              </div>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
              <button
                type="button"
                onClick={() => setDashResult(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold cursor-pointer hover:border-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyDashResult}
                className="flex-1 py-2.5 rounded-xl bg-yellow-400 text-black text-sm font-bold cursor-pointer hover:bg-yellow-300 transition-colors"
              >
                Apply to Setup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ScanField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-yellow-400"
      />
    </div>
  )
}

function ScanNumField({ label, value, onChange }: { label: string; value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</label>
      <input
        type="number"
        value={value ?? ''}
        onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}
        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-yellow-400"
      />
    </div>
  )
}
