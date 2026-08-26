import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Check, Plus, Sun, Cloud, CloudSun, CloudDrizzle, CloudRain, Umbrella, CloudSnow, Loader2, RefreshCw, MapPin } from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Button, Card, Input, SegmentedControl, Textarea } from '@/components/ui'
import { SetupForm } from '@/components/forms/SetupForm'
// import { SessionSlotCard } from '@/components/forms/SessionSlotCard'
import { useTracks } from '@/hooks/useTracks'
import { useKarts } from '@/hooks/useKarts'
import { useSessions } from '@/hooks/useSessions'
import { fetchWeatherForTrack, wmoToFormDescription, precipToConditions } from '@/lib/weather'
import type { WeatherDescription } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { setupDefaults } from '@/lib/setupDefaults'
import { formatDate, lapMsToString } from '@/lib/formatters'
import { TrackWeather, shortLocation } from '@/pages/Tracks'
import type { WizardState, SessionSlot, SetupFormData, PressureUnit, Session } from '@/types'

const STORAGE_KEY = 'kc_wizard_state'
const TOTAL_STEPS = 6

function makeDefaultSlots(): SessionSlot[] {
  return Array.from({ length: 8 }, (_, i) => ({
    slotId: `slot_${i + 1}`,
    label: `Test ${i + 1}`,
    session_type: 'practice' as const,
    enabled: i === 0,
    setupOverrides: {},
    weatherOverrides: {},
    lapTimes: [],
  }))
}

function makeDefaultWizard(): WizardState {
  const today = new Date().toISOString().slice(0, 10)
  return {
    step: 1,
    eventId: crypto.randomUUID(),
    trackId: null,
    newTrack: null,
    kartId: null,
    newKart: null,
    sessionMeta: {
      event_name: null,
      session_date: today,
      conditions: 'dry',
      weather_description: null,
      altitude_m: null,
      air_temp_c: null,
      humidity_pct: null,
      wind_speed_mph: null,
      notes: null,
    },
    baseSetup: { ...setupDefaults },
    slots: makeDefaultSlots(),
    loadedFromSession: false,
  }
}

function loadState(): WizardState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as WizardState
      if (!parsed.slots) return makeDefaultWizard()
      return { ...parsed, step: 1 }
    }
  } catch { /* ignore */ }
  return makeDefaultWizard()
}

function StepIndicator({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-1 mb-6">
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1
        const done = n < step
        const active = n === step
        return (
          <div key={n} className="flex items-center">
            <div
              className={[
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-semibold border',
                done   ? 'bg-accent-primary border-accent-primary text-bg-primary' :
                active ? 'border-accent-primary text-accent-primary' :
                         'border-border-color text-text-muted',
              ].join(' ')}
            >
              {done ? <Check size={12} /> : n}
            </div>
            {n < total && (
              <div className={['h-px w-6 mx-0.5', n < step ? 'bg-accent-primary' : 'bg-border-color'].join(' ')} />
            )}
          </div>
        )
      })}
      <span className="ml-3 text-xs text-text-muted font-mono">Step {step} of {total}</span>
    </div>
  )
}

export function NewSessionPage() {
  const navigate    = useNavigate()
  const [searchParams] = useSearchParams()
  const { user }    = useAuth()

  const [state, setState] = useState<WizardState>(() => {
    const base = loadState()
    const trackId  = searchParams.get('trackId')
    const kartId   = searchParams.get('kartId')
    const date     = searchParams.get('date')
    const eventId  = searchParams.get('eventId')
    // If URL params provided (coming from EventDetail "Add Test"), reuse same event
    if (trackId || kartId || date || eventId) {
      return {
        ...makeDefaultWizard(),
        eventId:  eventId  || crypto.randomUUID(),
        trackId:  trackId  || null,
        kartId:   kartId   || null,
        step: trackId && kartId ? 3 : trackId ? 2 : 1,
        sessionMeta: {
          ...makeDefaultWizard().sessionMeta,
          session_date: date ?? new Date().toISOString().slice(0, 10),
        },
      }
    }
    return base
  })
  const [saving, setSaving]       = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [setupLoadKey, setSetupLoadKey] = useState(0)

  const [wxLoading, setWxLoading] = useState(false)
  const [wxError,   setWxError]   = useState(false)
  const [wxFetched, setWxFetched] = useState(false)
  const weatherAppliedRef = useRef(false)

  const { data: tracks, refetch: refetchTracks } = useTracks()
  const { data: karts,  refetch: refetchKarts  } = useKarts()
  const { data: sessions } = useSessions()

  // Auto-fetch weather when entering step 3 — works even without stored coordinates
  // (falls back to geocoding the track name via Nominatim)
  useEffect(() => {
    if (state.step !== 3) return
    const track = tracks.find(t => t.id === state.trackId)
    if (!track) return
    if (weatherAppliedRef.current) return
    weatherAppliedRef.current = true
    setWxLoading(true)
    setWxError(false)
    void fetchWeatherForTrack(track.lat, track.lng, track.location ?? track.name)
      .then(w => {
        if (!w) { setWxError(true); return }
        const description = wmoToFormDescription(w.code) as WeatherDescription
        const conditions  = precipToConditions(w.precip_mm) as Session['conditions']
        setWxFetched(true)
        update({
          sessionMeta: {
            ...state.sessionMeta,
            conditions,
            weather_description: description,
            air_temp_c:          w.temp_c,
            humidity_pct:        w.humidity,
            wind_speed_mph:      w.wind_mph,
          },
        })
      })
      .catch(() => setWxError(true))
      .finally(() => setWxLoading(false))
  }, [state.step, state.trackId, tracks]) // eslint-disable-line react-hooks/exhaustive-deps

  function retryWeather() {
    weatherAppliedRef.current = false
    setWxFetched(false)
    // trigger the effect by bumping step (no-op visually)
    const track = tracks.find(t => t.id === state.trackId)
    if (!track) return
    setWxLoading(true)
    setWxError(false)
    void fetchWeatherForTrack(track.lat, track.lng, track.location ?? track.name)
      .then(w => {
        if (!w) { setWxError(true); return }
        const description = wmoToFormDescription(w.code) as WeatherDescription
        const conditions  = precipToConditions(w.precip_mm) as Session['conditions']
        setWxFetched(true)
        update({
          sessionMeta: {
            ...state.sessionMeta,
            conditions,
            weather_description: description,
            air_temp_c:          w.temp_c,
            humidity_pct:        w.humidity,
            wind_speed_mph:      w.wind_mph,
          },
        })
      })
      .catch(() => setWxError(true))
      .finally(() => setWxLoading(false))
  }
  const [addingTrack, setAddingTrack] = useState(false)
  const [addingKart,  setAddingKart]  = useState(false)
  const [newTrackError, setNewTrackError] = useState<string | null>(null)
  const [newKartError,  setNewKartError]  = useState<string | null>(null)
  const [newTrackName,    setNewTrackName]    = useState('')
  const [newTrackCountry, setNewTrackCountry] = useState('')
  const [newTrackLat,     setNewTrackLat]     = useState<number | null>(null)
  const [newTrackLng,     setNewTrackLng]     = useState<number | null>(null)
  const [newTrackLocQ,    setNewTrackLocQ]    = useState('')
  const [newTrackLocRes,  setNewTrackLocRes]  = useState<Array<{ label: string; lat: number; lng: number }>>([])
  const [newTrackLocBusy, setNewTrackLocBusy] = useState(false)
  const [newTrackLocPick, setNewTrackLocPick] = useState<string | null>(null)
  const [newKartMake,     setNewKartMake]     = useState('')
  const [newKartModel,    setNewKartModel]    = useState('')
  const [newKartChasNum,  setNewKartChasNum]  = useState('')
  const [newEngineMake,   setNewEngineMake]   = useState('')
  const [newKartClass,    setNewKartClass]    = useState('')
  const [newEngineNum,    setNewEngineNum]    = useState('')
  const pressureUnit: PressureUnit = (localStorage.getItem('kc_pressure_unit') as PressureUnit) ?? 'bar'
  const prefillAttempted = useRef(false)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  // Prefill track + weather from most recent session when starting fresh
  useEffect(() => {
    if (!user || prefillAttempted.current) return
    if (searchParams.get('trackId') || searchParams.get('kartId')) {
      prefillAttempted.current = true
      return
    }
    if (state.trackId || state.kartId) {
      prefillAttempted.current = true
      return
    }
    prefillAttempted.current = true

    async function prefillFromLastSession() {
      const { data: sessions } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(1)

      if (!sessions?.length) return
      const last = sessions[0] as Session & { wind_speed_mph?: number | null }

      update({
        trackId: last.track_id,
        kartId:  last.kart_id,
        step: 1,
        sessionMeta: {
          event_name:          null,
          session_date:        new Date().toISOString().slice(0, 10),
          conditions:          last.conditions,
          weather_description: last.weather_description,
          altitude_m:          last.altitude_m,
          air_temp_c:          last.air_temp_c,
          humidity_pct:        last.humidity_pct,
          wind_speed_mph:      last.wind_speed_mph ?? null,
          notes:               null,
        },
        slots: makeDefaultSlots(),
        // baseSetup loaded by the kart-specific effect below
      })
    }

    prefillFromLastSession()
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  // Whenever kart changes, load the most recent setup for that specific kart
  const prevKartIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (!user || !state.kartId) return
    if (state.kartId === prevKartIdRef.current) return
    prevKartIdRef.current = state.kartId

    async function loadSetupForKart() {
      const { data: sessions } = await supabase
        .from('sessions')
        .select('id, conditions, weather_description, altitude_m, air_temp_c, humidity_pct, wind_speed_mph')
        .eq('user_id', user!.id)
        .eq('kart_id', state.kartId!)
        .order('created_at', { ascending: false })
        .limit(1)

      if (!sessions?.length) {
        setState(prev => prev.step >= 5 ? prev : ({ ...prev, baseSetup: { ...setupDefaults } }))
        setSetupLoadKey(k => k + 1)
        return
      }

      const last = sessions[0] as Session & { wind_speed_mph?: number | null }

      const { data: setup } = await supabase
        .from('setups')
        .select('*')
        .eq('session_id', last.id)
        .maybeSingle()

      const kart = karts.find(k => k.id === state.kartId)
      const kartIdentifiers: Partial<SetupFormData> = kart ? {
        chassis_type: kart.chassis_type,
        chassis_make: kart.kart_make ?? null,
        engine_type:  kart.engine_type,
      } : {}

      const loadedBaseSetup = setup
        ? { ...(({ id, session_id, user_id, created_at, ...rest }) => rest)(setup) as Partial<SetupFormData>, ...kartIdentifiers }
        : { ...setupDefaults, ...kartIdentifiers }

      setState(prev => {
        if (prev.step >= 5) return prev   // user is already editing — don't overwrite
        return {
          ...prev,
          baseSetup: loadedBaseSetup,
          sessionMeta: {
            ...prev.sessionMeta,
            conditions:          last.conditions,
            weather_description: last.weather_description,
            altitude_m:          last.altitude_m,
            air_temp_c:          last.air_temp_c,
            humidity_pct:        last.humidity_pct,
            wind_speed_mph:      last.wind_speed_mph ?? null,
          },
        }
      })
      setSetupLoadKey(k => k + 1)
    }

    loadSetupForKart()
  }, [user, state.kartId]) // eslint-disable-line react-hooks/exhaustive-deps

  function update(patch: Partial<WizardState>) {
    setState(prev => ({ ...prev, ...patch }))
  }

  function nextStep() { update({ step: Math.min(state.step + 1, TOTAL_STEPS) }) }
  function prevStep() { update({ step: Math.max(state.step - 1, 1) }) }

  async function searchNewTrackLocation() {
    if (!newTrackLocQ.trim()) return
    setNewTrackLocBusy(true)
    setNewTrackLocRes([])
    setNewTrackLocPick(null)
    try {
      const res  = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(newTrackLocQ.trim())}&format=json&limit=5`,
        { headers: { 'User-Agent': 'KartConnect/1.0' } },
      )
      const rows = await res.json() as Array<{ lat: string; lon: string; display_name: string }>
      setNewTrackLocRes(rows.map(r => ({ label: r.display_name, lat: parseFloat(r.lat), lng: parseFloat(r.lon) })))
    } finally {
      setNewTrackLocBusy(false)
    }
  }

  async function createTrack() {
    if (!newTrackName.trim()) return
    setNewTrackError(null)
    const { data, error } = await supabase.from('tracks').insert({
      user_id: user!.id,
      name: newTrackName.trim(),
      country: newTrackCountry.trim() || null,
      circuit_type: null,
      lat: newTrackLat,
      lng: newTrackLng,
      location: newTrackLocPick,
    }).select().single()
    if (error) { setNewTrackError(error.message); return }
    if (data) {
      await refetchTracks()
      update({ trackId: data.id })
      setAddingTrack(false)
      setNewTrackName('')
      setNewTrackCountry('')
      setNewTrackLat(null); setNewTrackLng(null)
      setNewTrackLocQ(''); setNewTrackLocRes([]); setNewTrackLocPick(null)
      nextStep()
    }
  }

  async function createKart() {
    if (!newKartMake.trim() || !newKartModel.trim() || !newEngineMake.trim() || !newKartClass.trim()) return
    setNewKartError(null)
    const nickname     = `${newKartMake.trim()} ${newKartModel.trim()}`
    const chassis_type = nickname
    const engine_type  = `${newEngineMake.trim()} ${newKartClass.trim()}`
    const { data, error } = await supabase.from('karts').insert({
      user_id:        user!.id,
      nickname,
      chassis_type,
      engine_type,
      kart_make:      newKartMake.trim(),
      kart_model:     newKartModel.trim(),
      chassis_number: newKartChasNum.trim() || null,
      engine_make:    newEngineMake.trim(),
      kart_class:     newKartClass.trim(),
      engine_number:  newEngineNum.trim() || null,
    }).select().single()
    if (error) { setNewKartError(error.message); return }
    if (data) {
      await refetchKarts()
      update({
        kartId: data.id,
        baseSetup: { ...state.baseSetup, chassis_type: data.chassis_type, engine_type: data.engine_type, chassis_make: data.kart_make ?? null },
      })
      setAddingKart(false)
      setNewKartMake(''); setNewKartModel(''); setNewKartChasNum('')
      setNewEngineMake(''); setNewKartClass(''); setNewEngineNum('')
      nextStep()
    }
  }

  const loadLastSetup = useCallback(async () => {
    if (!state.trackId || !state.kartId) return
    const { data } = await supabase
      .from('sessions')
      .select('id, best_lap_time_ms, session_date, setups(*)')
      .eq('track_id', state.trackId)
      .eq('kart_id', state.kartId)
      .order('session_date', { ascending: false })
      .limit(1)
      .single()

    if (data?.setups) {
      const s = Array.isArray(data.setups) ? data.setups[0] : data.setups
      if (s) {
        const { id: _id, session_id: _sid, created_at: _ca, ...rest } = s as Record<string, unknown>
        update({ baseSetup: rest as Partial<SetupFormData>, loadedFromSession: true })
      }
    }
  }, [state.trackId, state.kartId])

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      // Save a single Test 1 session — more tests added via the event page
      const { data: sessionRows, error: sessionErr } = await supabase
        .from('sessions')
        .insert([{
          user_id:             user!.id,
          track_id:            state.trackId!,
          kart_id:             state.kartId!,
          event_id:            state.eventId,
          event_name:          state.sessionMeta.event_name,
          session_date:        state.sessionMeta.session_date,
          conditions:          state.sessionMeta.conditions,
          weather_description: state.sessionMeta.weather_description,
          altitude_m:          state.sessionMeta.altitude_m,
          air_temp_c:          state.sessionMeta.air_temp_c,
          humidity_pct:        state.sessionMeta.humidity_pct,
          wind_speed_mph:      state.sessionMeta.wind_speed_mph,
          notes:               state.sessionMeta.notes,
          session_name:        'Test 1',
          session_type:        'testing' as const,
          best_lap_time_ms:    null,
          total_laps:          null,
        }])
        .select()

      if (sessionErr) throw sessionErr

      const sessionId = (sessionRows?.[0] as Record<string, unknown>)?.id as string
      if (sessionId && state.baseSetup.chassis_type && state.baseSetup.engine_type) {
        const { error: setupErr } = await supabase.from('setups').insert({
          session_id: sessionId,
          ...state.baseSetup,
        })
        if (setupErr) throw setupErr
      }

      localStorage.removeItem(STORAGE_KEY)
      navigate(`/events/${state.eventId}`)
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === 'object' && e !== null && 'message' in e
            ? String((e as { message: unknown }).message)
            : JSON.stringify(e)
      setSaveError(msg)
      setSaving(false)
    }
  }

  const canProceed = (() => {
    if (state.step === 1) return !!state.trackId
    if (state.step === 2) return !!state.kartId
    if (state.step === 5) return !!state.kartId || !!(state.baseSetup.chassis_type?.trim() && state.baseSetup.engine_type?.trim())
    return true
  })()

  const stepTitles = [
    'Choose Track', 'Choose Driver', 'Event Info',
    'Load Setup', 'Base Setup', 'Review & Save',
  ]

  return (
    <PageWrapper title="New Session">
      <div className="max-w-2xl mx-auto">
        <StepIndicator step={state.step} total={TOTAL_STEPS} />

        <h2 className="font-heading text-lg font-bold uppercase tracking-wide text-text-primary mb-4">
          {stepTitles[state.step - 1]}
        </h2>

        {/* Step 1 — Track */}
        {state.step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {tracks.map(t => {
                const trackSessions = sessions.filter(s => s.track_id === t.id)
                const bestLaps = trackSessions.filter(s => s.best_lap_time_ms !== null)
                const bestLap = bestLaps.length ? Math.min(...bestLaps.map(s => s.best_lap_time_ms!)) : null
                const subtitle = t.location ? shortLocation(t.location) : t.country
                const selected = state.trackId === t.id
                return (
                  <Card
                    key={t.id}
                    onClick={() => { update({ trackId: t.id }); nextStep() }}
                    className={[
                      'cursor-pointer transition-colors',
                      selected
                        ? 'border-accent-primary bg-accent-primary/5'
                        : 'hover:border-accent-primary/30',
                    ].join(' ')}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-heading font-semibold text-base text-text-primary leading-tight">{t.name}</h3>
                        {subtitle && <p className="text-text-muted text-sm mt-0.5">{subtitle}</p>}
                        <TrackWeather lat={t.lat} lng={t.lng} location={t.location} name={t.name} />
                      </div>
                      {selected && <Check size={16} className="text-accent-primary flex-shrink-0 mt-1 ml-2" />}
                    </div>
                    <div className="flex gap-4 mt-3 text-xs text-text-muted">
                      <span>{trackSessions.length} session{trackSessions.length !== 1 ? 's' : ''}</span>
                      {bestLap && (
                        <span className="text-accent-primary font-mono">Best: {lapMsToString(bestLap)}</span>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
            {state.trackId && (
              <div>
                <p className="font-heading text-xs uppercase tracking-wider text-text-muted mb-2">Event Name <span className="normal-case font-normal">(optional)</span></p>
                <Input
                  placeholder="e.g. British Championship Round 1, Club Day…"
                  value={state.sessionMeta.event_name ?? ''}
                  onChange={e => update({ sessionMeta: { ...state.sessionMeta, event_name: e.target.value || null } })}
                  historyKey="event_name"
                />
              </div>
            )}
            {!addingTrack ? (
              <button
                type="button"
                onClick={() => setAddingTrack(true)}
                className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-border-color rounded-card text-sm text-text-muted hover:text-text-primary hover:border-accent-primary/40 transition-colors cursor-pointer"
              >
                <Plus size={14} /> Add new track
              </button>
            ) : (
              <Card>
                <div className="space-y-3">
                  <Input label="Track Name *" value={newTrackName} onChange={e => setNewTrackName(e.target.value)} />
                  <Input label="Country" value={newTrackCountry} onChange={e => setNewTrackCountry(e.target.value)} />

                  {/* Location search — sets lat/lng for auto weather */}
                  <div>
                    <p className="font-heading text-xs uppercase tracking-wider text-text-muted mb-1.5">
                      Location <span className="normal-case font-normal text-text-muted">(enables auto weather)</span>
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTrackLocQ}
                        onChange={e => { setNewTrackLocQ(e.target.value); setNewTrackLocRes([]); setNewTrackLocPick(null) }}
                        onKeyDown={e => { if (e.key === 'Enter') void searchNewTrackLocation() }}
                        placeholder="Search circuit name or address…"
                        className="flex-1 bg-bg-elevated border border-border-color rounded-card px-3 py-2 text-sm text-text-primary placeholder-text-muted outline-none focus:border-accent-primary/50 transition-colors"
                      />
                      <button
                        type="button"
                        disabled={newTrackLocBusy || !newTrackLocQ.trim()}
                        onClick={() => void searchNewTrackLocation()}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-card border border-border-color text-text-primary hover:border-accent-primary/50 text-sm transition-colors disabled:opacity-40 cursor-pointer"
                      >
                        {newTrackLocBusy
                          ? <span className="w-3.5 h-3.5 border-2 border-text-muted border-t-transparent rounded-full animate-spin" />
                          : <MapPin size={14} />}
                      </button>
                    </div>
                    {newTrackLocRes.length > 0 && (
                      <ul className="mt-2 border border-border-color rounded-card overflow-hidden">
                        {newTrackLocRes.map((r, i) => (
                          <li key={i}>
                            <button
                              type="button"
                              onClick={() => { setNewTrackLat(r.lat); setNewTrackLng(r.lng); setNewTrackLocPick(r.label); setNewTrackLocRes([]) }}
                              className="w-full text-left px-3 py-2 text-xs text-text-primary hover:bg-accent-primary/10 hover:text-accent-primary transition-colors border-b border-border-color last:border-b-0"
                            >
                              {r.label}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {newTrackLocPick && (
                      <p className="mt-1.5 text-xs text-green-400 flex items-center gap-1">
                        <Check size={11} /> Location set
                      </p>
                    )}
                  </div>

                  {newTrackError && (
                    <p className="text-xs text-accent-secondary">{newTrackError}</p>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => void createTrack()} disabled={!newTrackName.trim()}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setAddingTrack(false); setNewTrackError(null) }}>Cancel</Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Step 2 — Driver */}
        {state.step === 2 && (
          <div className="space-y-3">
            {karts.map(k => {
              const selected = state.kartId === k.id
              const driverLabel = k.driver_name?.trim() || k.nickname
              const kartLine = [k.kart_make, k.kart_model].filter(Boolean).join(' ') || k.chassis_type
              return (
                <Card
                  key={k.id}
                  onClick={() => {
                    update({
                      kartId: k.id,
                      baseSetup: { ...state.baseSetup, chassis_type: k.chassis_type, engine_type: k.engine_type, chassis_make: k.kart_make ?? null },
                    })
                    nextStep()
                  }}
                  className={[
                    'cursor-pointer transition-colors',
                    selected ? 'border-accent-primary bg-accent-primary/5' : 'hover:border-accent-primary/30',
                  ].join(' ')}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-heading font-semibold text-base text-text-primary">{driverLabel}</p>
                        {k.kart_class && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-accent-primary/15 text-accent-primary font-medium">{k.kart_class}</span>
                        )}
                      </div>
                      <p className="text-sm text-text-muted mt-0.5">{kartLine}</p>
                      {k.chassis_number && (
                        <p className="text-xs text-text-muted/70 mt-0.5 font-mono">#{k.chassis_number}</p>
                      )}
                    </div>
                    {selected && <Check size={16} className="text-accent-primary flex-shrink-0" />}
                  </div>
                </Card>
              )
            })}
            {!addingKart ? (
              <button
                type="button"
                onClick={() => setAddingKart(true)}
                className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-border-color rounded-card text-sm text-text-muted hover:text-text-primary hover:border-accent-primary/40 transition-colors cursor-pointer"
              >
                <Plus size={14} /> Add new driver / kart
              </button>
            ) : (
              <Card>
                <div className="space-y-3">
                  <p className="text-xs font-heading font-bold text-text-muted uppercase">Kart</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Kart Make *" value={newKartMake} onChange={e => setNewKartMake(e.target.value)} placeholder="e.g. Tony Kart" />
                    <Input label="Kart Model *" value={newKartModel} onChange={e => setNewKartModel(e.target.value)} placeholder="e.g. 401R" />
                  </div>
                  <Input label="Chassis Number" value={newKartChasNum} onChange={e => setNewKartChasNum(e.target.value)} placeholder="e.g. TK-2024-001" />
                  <p className="text-xs font-heading font-bold text-text-muted uppercase pt-1">Engine</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Engine Make *" value={newEngineMake} onChange={e => setNewEngineMake(e.target.value)} placeholder="e.g. Rotax" />
                    <Input label="Kart Class *" value={newKartClass} onChange={e => setNewKartClass(e.target.value)} placeholder="e.g. Max Senior" />
                  </div>
                  <Input label="Engine Number" value={newEngineNum} onChange={e => setNewEngineNum(e.target.value)} placeholder="e.g. ROT-56789" />
                  {newKartError && (
                    <p className="text-xs text-accent-secondary">{newKartError}</p>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => void createKart()} disabled={!newKartMake.trim() || !newKartModel.trim() || !newEngineMake.trim() || !newKartClass.trim()}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setAddingKart(false); setNewKartError(null) }}>Cancel</Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Step 3 — Session Info */}
        {state.step === 3 && (() => {
          const selTrack = tracks.find(t => t.id === state.trackId)
          function WeatherIcon({ size = 16 }: { size?: number }) {
            const desc = state.sessionMeta.weather_description
            if (!desc) return <Cloud size={size} className="text-[#6B7A99]" />
            switch (desc) {
              case 'Sunny':      return <Sun size={size} className="text-yellow-400" />
              case 'Light Sun':  return <CloudSun size={size} className="text-yellow-400/80" />
              case 'Overcast':   return <Cloud size={size} className="text-[#6B7A99]" />
              case 'Light Rain': return <CloudDrizzle size={size} className="text-blue-400" />
              case 'Rain':       return <CloudRain size={size} className="text-blue-400" />
              case 'Heavy Rain': return <Umbrella size={size} className="text-blue-500" />
              case 'Snow':       return <CloudSnow size={size} className="text-blue-200" />
            }
          }

          return (
            <div className="space-y-4">
              <Input
                label="Date"
                type="date"
                value={state.sessionMeta.session_date}
                onChange={e => update({ sessionMeta: { ...state.sessionMeta, session_date: e.target.value } })}
              />

              {/* ── Live weather card ── */}
              <div>
                <p className="font-heading text-xs uppercase tracking-wider text-text-muted mb-2">Live Weather</p>
                <Card>
                  {wxLoading ? (
                    <div className="flex items-center gap-2 text-sm text-text-muted py-1">
                      <Loader2 size={14} className="animate-spin" />
                      Fetching weather for {selTrack?.name ?? 'track'}…
                    </div>
                  ) : wxFetched ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <WeatherIcon size={18} />
                          <span className="font-semibold text-text-primary text-sm">
                            {state.sessionMeta.weather_description ?? 'Live conditions'}
                          </span>
                          <span className="text-xs text-text-muted">at {selTrack?.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={retryWeather}
                          className="text-text-muted hover:text-accent-primary transition-colors"
                          title="Refresh weather"
                        >
                          <RefreshCw size={13} />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div>
                          <p className="text-text-muted text-xs mb-0.5">Temperature</p>
                          <input
                            type="number"
                            step="0.1"
                            value={state.sessionMeta.air_temp_c ?? ''}
                            onChange={e => update({ sessionMeta: { ...state.sessionMeta, air_temp_c: e.target.value ? parseFloat(e.target.value) : null } })}
                            className="w-full bg-bg-card border border-border-color rounded px-2 py-1 text-text-primary font-mono text-sm focus:outline-none focus:border-accent-primary"
                            placeholder="—"
                          />
                          <p className="text-text-muted text-[10px] mt-0.5">°C</p>
                        </div>
                        <div>
                          <p className="text-text-muted text-xs mb-0.5">Humidity</p>
                          <input
                            type="number"
                            step="1"
                            min="0" max="100"
                            value={state.sessionMeta.humidity_pct ?? ''}
                            onChange={e => update({ sessionMeta: { ...state.sessionMeta, humidity_pct: e.target.value ? parseFloat(e.target.value) : null } })}
                            className="w-full bg-bg-card border border-border-color rounded px-2 py-1 text-text-primary font-mono text-sm focus:outline-none focus:border-accent-primary"
                            placeholder="—"
                          />
                          <p className="text-text-muted text-[10px] mt-0.5">%</p>
                        </div>
                        <div>
                          <p className="text-text-muted text-xs mb-0.5">Wind Speed</p>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={state.sessionMeta.wind_speed_mph ?? ''}
                            onChange={e => update({ sessionMeta: { ...state.sessionMeta, wind_speed_mph: e.target.value ? parseFloat(e.target.value) : null } })}
                            className="w-full bg-bg-card border border-border-color rounded px-2 py-1 text-text-primary font-mono text-sm focus:outline-none focus:border-accent-primary"
                            placeholder="—"
                          />
                          <p className="text-text-muted text-[10px] mt-0.5">mph</p>
                        </div>
                      </div>
                      <p className="text-[10px] text-text-muted">Powered by Open-Meteo · edit any value to override</p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      {wxError
                        ? <p className="text-xs text-text-muted">Weather unavailable for this track</p>
                        : <p className="text-xs text-text-muted">Fetching weather…</p>
                      }
                      <button
                        type="button"
                        onClick={retryWeather}
                        className="flex items-center gap-1.5 text-xs text-accent-primary hover:opacity-80 transition-opacity"
                      >
                        <RefreshCw size={11} /> Retry
                      </button>
                    </div>
                  )}
                </Card>
              </div>

              {/* Weather description */}
              <SegmentedControl
                label="Sky / Description"
                options={[
                  { label: 'Sunny',      value: 'Sunny' },
                  { label: 'Light Sun',  value: 'Light Sun' },
                  { label: 'Overcast',   value: 'Overcast' },
                  { label: 'Light Rain', value: 'Light Rain' },
                  { label: 'Rain',       value: 'Rain' },
                  { label: 'Heavy Rain', value: 'Heavy Rain' },
                  { label: 'Snow',       value: 'Snow' },
                ]}
                value={state.sessionMeta.weather_description ?? null}
                onChange={v => update({ sessionMeta: { ...state.sessionMeta, weather_description: v as WeatherDescription } })}
              />

              <SegmentedControl
                label="Track Conditions"
                options={[
                  { label: 'Dry',  value: 'dry' },
                  { label: 'Damp', value: 'damp' },
                  { label: 'Wet',  value: 'wet' },
                ]}
                value={state.sessionMeta.conditions ?? null}
                onChange={v => update({ sessionMeta: { ...state.sessionMeta, conditions: v as Session['conditions'] } })}
              />

              <Textarea
                label="Session Notes"
                value={state.sessionMeta.notes ?? ''}
                onChange={e => update({ sessionMeta: { ...state.sessionMeta, notes: e.target.value || null } })}
                placeholder="Any pre-session notes…"
              />
            </div>
          )
        })()}

        {/* Step 4 — Load Setup */}
        {state.step === 4 && (
          <div className="space-y-4">
            <p className="text-text-muted text-sm">
              Load the last setup for this track + kart as a starting point, or begin with defaults.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={() => void loadLastSetup().then(nextStep)} className="flex-1">
                Load Last Setup
              </Button>
              <Button variant="secondary" onClick={nextStep} className="flex-1">
                Start from Defaults
              </Button>
            </div>
            {state.loadedFromSession && (
              <p className="text-xs text-green-400">✓ Last setup loaded successfully</p>
            )}
          </div>
        )}

        {/* Step 5 — Base Setup */}
        {state.step === 5 && (
          <SetupForm
            key={setupLoadKey}
            initialSetup={state.baseSetup}
            onChange={baseSetup => update({ baseSetup })}
            pressureUnit={pressureUnit}
            hideIdentifiers={!!state.kartId}
            engines={karts.find(k => k.id === state.kartId)?.engines ?? []}
          />
        )}

        {/* Step 6 — Review */}
        {state.step === 6 && (() => {
          const trackName   = tracks.find(t => t.id === state.trackId)?.name ?? '—'
          const selKart     = karts.find(k => k.id === state.kartId)
          const driverName  = (selKart?.driver_name?.trim() || selKart?.nickname) ?? '—'
          const kartDisplay = selKart ? [selKart.kart_make, selKart.kart_model].filter(Boolean).join(' ') || selKart.chassis_type : '—'
          return (
            <div className="space-y-4">
              <Card>
                <h3 className="font-heading text-sm uppercase tracking-wider text-text-muted mb-3">Event Summary</h3>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <dt className="text-text-muted">Track</dt>
                  <dd className="text-text-primary font-medium">{trackName}</dd>
                  <dt className="text-text-muted">Driver</dt>
                  <dd className="text-text-primary font-medium">{driverName}</dd>
                  <dt className="text-text-muted">Kart</dt>
                  <dd className="text-text-primary font-medium">{kartDisplay}</dd>
                  <dt className="text-text-muted">Date</dt>
                  <dd className="text-text-primary font-mono text-xs">{formatDate(state.sessionMeta.session_date)}</dd>
                  {state.sessionMeta.event_name && (
                    <>
                      <dt className="text-text-muted">Event</dt>
                      <dd className="text-text-primary">{state.sessionMeta.event_name}</dd>
                    </>
                  )}
                  <dt className="text-text-muted">Conditions</dt>
                  <dd className="text-text-primary">{state.sessionMeta.conditions ?? '—'}</dd>
                  <dt className="text-text-muted">Chassis</dt>
                  <dd className="text-text-primary">{state.baseSetup.chassis_type ?? '—'}</dd>
                  <dt className="text-text-muted">Engine</dt>
                  <dd className="text-text-primary">{state.baseSetup.engine_type ?? '—'}</dd>
                </dl>
              </Card>

              {saveError && (
                <p className="text-sm text-accent-secondary bg-accent-secondary/10 border border-accent-secondary/20 rounded-card px-3 py-2">
                  {saveError}
                </p>
              )}

              <Button onClick={() => void handleSave()} loading={saving} className="w-full" size="lg">
                Save &amp; Start Event
              </Button>
            </div>
          )
        })()}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button
            variant="ghost"
            onClick={prevStep}
            disabled={state.step === 1}
            size="sm"
          >
            <ChevronLeft size={14} /> Back
          </Button>
          {state.step < TOTAL_STEPS && state.step !== 4 && (
            <Button onClick={nextStep} size="sm" disabled={!canProceed}>
              Next <ChevronRight size={14} />
            </Button>
          )}
        </div>
      </div>
    </PageWrapper>
  )
}
