import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Flag, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useKarts } from '@/hooks/useKarts'
import { useTracks } from '@/hooks/useTracks'
import { useAuth } from '@/contexts/AuthContext'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Card, Button, Input, Select, SegmentedControl } from '@/components/ui'
import type { Kart } from '@/types'

const SESSION_TYPE_OPTIONS = [
  { label: 'Practice',   value: 'practice' },
  { label: 'Qualifying', value: 'qualifying' },
  { label: 'Race',       value: 'race' },
  { label: 'Test Day',   value: 'testing' },
]

export function CreateRaceWeekendPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: tracks } = useTracks()
  const { data: karts } = useKarts()

  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1 fields
  const [trackId, setTrackId] = useState('')
  const [sessionName, setSessionName] = useState('')
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10))
  const [sessionType, setSessionType] = useState('race_weekend')

  // Step 2 — selected kart IDs
  const [selectedKartIds, setSelectedKartIds] = useState<Set<string>>(new Set())

  const trackOptions = tracks.map(t => ({ label: t.name, value: t.id }))

  function toggleKart(kartId: string) {
    setSelectedKartIds(prev => {
      const next = new Set(prev)
      if (next.has(kartId)) next.delete(kartId)
      else next.add(kartId)
      return next
    })
  }

  function validateStep1() {
    if (!trackId) return 'Please select a track.'
    if (!sessionName.trim()) return 'Please enter a session name.'
    if (!sessionDate) return 'Please select a date.'
    return null
  }

  async function handleCreate() {
    if (selectedKartIds.size === 0) {
      setError('Select at least one driver.')
      return
    }
    setSaving(true)
    setError(null)

    // Create race weekend
    const { data: weekend, error: rwErr } = await supabase
      .from('race_weekends')
      .insert({
        manager_id: user!.id,
        track_id: trackId,
        session_name: sessionName.trim(),
        session_date: sessionDate,
        session_type: sessionType,
        pressure_unit: localStorage.getItem('kc_pressure_unit') ?? 'bar',
        alt_unit:      localStorage.getItem('kc_alt_unit')      ?? 'm',
        temp_unit:     localStorage.getItem('kc_temp_unit')     ?? 'c',
        speed_unit:    localStorage.getItem('kc_speed_unit')    ?? 'kph',
      })
      .select('id')
      .single()

    if (rwErr || !weekend) {
      setError('Failed to create race weekend. Please try again.')
      setSaving(false)
      return
    }

    // Insert one row per selected kart
    const selectedKarts = karts.filter(k => selectedKartIds.has(k.id))
    const driverRows = selectedKarts.map((k: Kart) => ({
      race_weekend_id: weekend.id,
      manager_id: user!.id,
      kart_id: k.id,
      driver_name: k.driver_name ?? k.nickname,
      driver_class: k.kart_class,
      kart_make: k.kart_make,
      kart_model: k.kart_model,
      chassis_number: k.chassis_number,
      chassis_stiffness: k.chassis_stiffness,
      driver_phone: k.phone_number ?? null,
      engines_snapshot: k.engines,
    }))

    const { error: driversErr } = await supabase
      .from('race_weekend_drivers')
      .insert(driverRows)

    if (driversErr) {
      setError('Failed to add drivers. Please try again.')
      setSaving(false)
      return
    }

    navigate(`/race-weekend/${weekend.id}`)
  }

  return (
    <PageWrapper title="New Race Weekend">
      <div className="max-w-2xl mx-auto">
        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-6">
          {[1, 2].map(n => (
            <div key={n} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step === n
                  ? 'bg-accent-primary text-black'
                  : step > n
                  ? 'bg-accent-primary/30 text-accent-primary'
                  : 'bg-bg-elevated text-text-muted'
              }`}>
                {step > n ? <Check size={13} /> : n}
              </div>
              <span className={`text-sm ${step === n ? 'text-text-primary font-semibold' : 'text-text-muted'}`}>
                {n === 1 ? 'Session Details' : 'Select Drivers'}
              </span>
              {n < 2 && <ChevronRight size={14} className="text-text-muted" />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <Card>
            <h2 className="font-heading text-sm uppercase tracking-wider text-text-muted mb-4">Track &amp; Session</h2>
            <div className="space-y-4">
              <Select
                label="Track"
                value={trackId}
                onChange={e => setTrackId(e.target.value)}
                options={trackOptions}
                placeholder="Select a track…"
              />
              <Input
                label="Session Name"
                value={sessionName}
                onChange={e => setSessionName(e.target.value)}
                placeholder="e.g. Round 3 — Shennington"
                historyKey="race_weekend_session_name"
              />
              <div>
                <label className="block text-xs text-text-muted mb-1">Date</label>
                <input
                  type="date"
                  value={sessionDate}
                  onChange={e => setSessionDate(e.target.value)}
                  className="w-full bg-bg-card border border-border-color rounded-card px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-primary transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-2">Session Type</label>
                <SegmentedControl
                  options={SESSION_TYPE_OPTIONS}
                  value={sessionType}
                  onChange={setSessionType}
                />
              </div>
            </div>
            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
            <div className="mt-6 flex justify-end">
              <Button
                variant="primary"
                onClick={() => {
                  const err = validateStep1()
                  if (err) { setError(err); return }
                  setError(null)
                  setStep(2)
                }}
              >
                Next <ChevronRight size={14} className="inline ml-1" />
              </Button>
            </div>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <h2 className="font-heading text-sm uppercase tracking-wider text-text-muted mb-1">Select Drivers</h2>
            <p className="text-xs text-text-muted mb-4">Only selected drivers will receive a QR code. All start unselected.</p>

            {karts.length === 0 ? (
              <p className="text-text-muted text-sm py-4">No drivers in your team yet. Add drivers on the My Team page first.</p>
            ) : (
              <div className="space-y-2">
                {karts.map(k => {
                  const selected = selectedKartIds.has(k.id)
                  return (
                    <button
                      key={k.id}
                      type="button"
                      onClick={() => toggleKart(k.id)}
                      className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-card border transition-colors cursor-pointer ${
                        selected
                          ? 'border-accent-primary bg-accent-primary/5'
                          : 'border-border-color bg-bg-elevated hover:border-accent-primary/40'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                        selected ? 'bg-accent-primary border-accent-primary' : 'border-border-color'
                      }`}>
                        {selected && <Check size={11} className="text-black" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-text-primary truncate">
                          {k.driver_name ?? k.nickname}
                        </p>
                        <p className="text-xs text-text-muted truncate">
                          {[k.kart_class, k.kart_make, k.kart_model].filter(Boolean).join(' · ')}
                          {k.chassis_number ? ` · #${k.chassis_number}` : ''}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

            <div className="mt-6 flex items-center justify-between">
              <Button variant="ghost" onClick={() => { setError(null); setStep(1) }}>
                <ChevronLeft size={14} className="inline mr-1" /> Back
              </Button>
              <div className="flex items-center gap-3">
                <span className="text-xs text-text-muted">{selectedKartIds.size} driver{selectedKartIds.size !== 1 ? 's' : ''} selected</span>
                <Button
                  variant="primary"
                  loading={saving}
                  onClick={() => void handleCreate()}
                  disabled={selectedKartIds.size === 0}
                >
                  <Flag size={14} className="inline mr-1" /> Create Race Weekend
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </PageWrapper>
  )
}
