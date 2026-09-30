import { useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import {
  Radio, XCircle, Share2,
  Copy, ExternalLink, ChevronLeft, Play, Square, Timer, CloudSun, Pencil, UserPlus, Check,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRaceWeekend } from '@/hooks/useRaceWeekends'
import { useKarts } from '@/hooks/useKarts'
import { useAuth } from '@/contexts/AuthContext'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Card, Button, Badge, Modal, Input, Select, SegmentedControl } from '@/components/ui'
import { getDriverLiveUrl, getWhatsAppShareUrl } from '@/lib/qrCode'
import { fetchWeatherForTrack, wmoToFormDescription, precipToConditions } from '@/lib/weather'
import { formatDate } from '@/lib/formatters'
import type { RaceWeekendDriver } from '@/hooks/useRaceWeekends'

const WEATHER_OPTIONS = [
  { label: 'Select…',    value: '' },
  { label: 'Sunny',      value: 'Sunny' },
  { label: 'Light Sun',  value: 'Light Sun' },
  { label: 'Overcast',   value: 'Overcast' },
  { label: 'Light Rain', value: 'Light Rain' },
  { label: 'Rain',       value: 'Rain' },
  { label: 'Heavy Rain', value: 'Heavy Rain' },
  { label: 'Snow',       value: 'Snow' },
]

interface WeatherForm {
  conditions: string
  weather_description: string
  air_temp_c: string
  humidity_pct: string
  wind_speed_mph: string
  altitude_m: string
}

function driverStatus(d: RaceWeekendDriver): 'submitted' | 'in_progress' | 'not_started' {
  if (d.setup_submitted) return 'submitted'
  if (d.setup_started_at) return 'in_progress'
  return 'not_started'
}

function ExpiryCountdown({ expiresAt }: { expiresAt: string }) {
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return <span className="text-red-400 text-xs">Expired</span>
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const mins  = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  return (
    <span className="text-xs text-text-muted font-mono">
      Expires in {hours}h {mins}m
    </span>
  )
}

export function RaceWeekendDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { session: authSession, user } = useAuth()
  const { weekend, drivers, loading, error, refetch } = useRaceWeekend(id)

  const { data: allKarts } = useKarts()

  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  // Add driver modal
  const [addDriverOpen, setAddDriverOpen] = useState(false)
  const [addDriverIds, setAddDriverIds] = useState<Set<string>>(new Set())
  const [addingDrivers, setAddingDrivers] = useState(false)
  const [addDriverError, setAddDriverError] = useState<string | null>(null)

  const [weatherOpen, setWeatherOpen] = useState(false)
  const [savingWeather, setSavingWeather] = useState(false)
  const [fetchingWeather, setFetchingWeather] = useState(false)
  const [weatherFetchError, setWeatherFetchError] = useState<string | null>(null)
  const [weatherForm, setWeatherForm] = useState<WeatherForm>({
    conditions: '', weather_description: '', air_temp_c: '',
    humidity_pct: '', wind_speed_mph: '', altitude_m: '',
  })

  function openWeatherModal() {
    if (!weekend) return
    setWeatherForm({
      conditions:          weekend.conditions          ?? '',
      weather_description: weekend.weather_description ?? '',
      air_temp_c:          weekend.air_temp_c          != null ? String(weekend.air_temp_c)     : '',
      humidity_pct:        weekend.humidity_pct        != null ? String(weekend.humidity_pct)   : '',
      wind_speed_mph:      weekend.wind_speed_mph      != null ? String(weekend.wind_speed_mph) : '',
      altitude_m:          weekend.altitude_m          != null ? String(weekend.altitude_m)     : '',
    })
    setWeatherFetchError(null)
    setWeatherOpen(true)
  }

  async function saveWeather() {
    if (!id) return
    setSavingWeather(true)
    await supabase.from('race_weekends').update({
      conditions:          weatherForm.conditions          || null,
      weather_description: weatherForm.weather_description || null,
      air_temp_c:          weatherForm.air_temp_c          ? Number(weatherForm.air_temp_c)     : null,
      humidity_pct:        weatherForm.humidity_pct        ? Number(weatherForm.humidity_pct)   : null,
      wind_speed_mph:      weatherForm.wind_speed_mph      ? Number(weatherForm.wind_speed_mph) : null,
      altitude_m:          weatherForm.altitude_m          ? Number(weatherForm.altitude_m)     : null,
    }).eq('id', id)
    setSavingWeather(false)
    setWeatherOpen(false)
    void refetch()
  }

  async function fetchWeather() {
    if (!weekend?.track) return
    setFetchingWeather(true)
    setWeatherFetchError(null)
    try {
      const fallbackQuery = [weekend.track.name, weekend.track.country ?? 'United Kingdom'].join(', ')
      const w = await fetchWeatherForTrack(weekend.track.lat ?? null, weekend.track.lng ?? null, fallbackQuery)
      if (!w) {
        setWeatherFetchError(`Could not locate "${weekend.track.name}" — enter weather manually.`)
        return
      }
      setWeatherForm(f => ({
        ...f,
        conditions:          precipToConditions(w.precip_mm),
        weather_description: wmoToFormDescription(w.code),
        air_temp_c:          String(Math.round(w.temp_c * 10) / 10),
        humidity_pct:        String(Math.round(w.humidity)),
        wind_speed_mph:      String(Math.round(w.wind_mph * 10) / 10),
      }))
    } catch {
      setWeatherFetchError('Weather fetch failed. Please enter manually.')
    } finally {
      setFetchingWeather(false)
    }
  }

  function wf(k: keyof WeatherForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setWeatherForm(f => ({ ...f, [k]: e.target.value }))
  }

  async function addDrivers() {
    if (!id || !user || addDriverIds.size === 0) return
    setAddingDrivers(true)
    setAddDriverError(null)
    const kartsToAdd = allKarts.filter(k => addDriverIds.has(k.id))
    const rows = kartsToAdd.map(k => ({
      race_weekend_id: id,
      manager_id: user.id,
      kart_id: k.id,
      driver_name: k.driver_name ?? k.nickname,
      driver_class: k.kart_class,
      kart_make: k.kart_make,
      kart_model: k.kart_model,
      chassis_number: k.chassis_number,
      chassis_stiffness: k.chassis_stiffness,
      driver_phone: k.phone_number ?? null,
      engines_snapshot: k.engines,
      token_is_active: weekend?.is_live ?? false,
    }))
    const { error: err } = await supabase.from('race_weekend_drivers').insert(rows)
    if (err) {
      setAddDriverError('Failed to add drivers. Please try again.')
    } else {
      setAddDriverOpen(false)
      setAddDriverIds(new Set())
      void refetch()
    }
    setAddingDrivers(false)
  }

  const callEdge = useCallback(async (fn: string, body: object) => {
    setActionLoading(true)
    setActionError(null)
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fn}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authSession?.access_token}`,
      },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    setActionLoading(false)
    if (!res.ok || json.error) {
      setActionError(json.error ?? 'Action failed.')
      return false
    }
    await refetch()
    return true
  }, [authSession, refetch])

  function copyLink(token: string) {
    void navigator.clipboard.writeText(getDriverLiveUrl(token))
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  async function shareDriver(driver: RaceWeekendDriver) {
    const liveUrl = getDriverLiveUrl(driver.token)
    const shareText = `Hi ${driver.driver_name}, here's your setup link for ${trackName} today:`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Setup Link', text: shareText, url: liveUrl })
        return
      } catch {
        // User cancelled — don't fall through
        return
      }
    }
    // Desktop fallback: open WhatsApp with pre-filled message
    const waUrl = getWhatsAppShareUrl(driver.token, driver.driver_name, trackName, driver.driver_phone)
    window.open(waUrl, '_blank', 'noreferrer')
  }

  if (loading) {
    return (
      <PageWrapper title="Race Weekend">
        <p className="text-text-muted text-sm">Loading…</p>
      </PageWrapper>
    )
  }

  if (error || !weekend) {
    return (
      <PageWrapper title="Race Weekend">
        <p className="text-red-400 text-sm">Could not load race weekend.</p>
      </PageWrapper>
    )
  }

  const isLive    = weekend.is_live
  const isEnded   = !!weekend.ended_at
  const isPrelive = !isLive && !isEnded
  const trackName = weekend.track?.name ?? 'Unknown Track'

  return (
    <PageWrapper
      title={weekend.session_name}
      action={
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ChevronLeft size={14} className="inline mr-1" /> Back
        </Button>
      }
    >
      <div className="max-w-4xl mx-auto space-y-5">

        {/* Session info card */}
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {isLive && (
                  <span className="flex items-center gap-1.5 text-green-400 text-xs font-bold uppercase tracking-widest">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                    </span>
                    <Radio size={11} /> Live
                  </span>
                )}
                {isEnded && <span className="text-xs text-text-muted uppercase tracking-widest">Ended</span>}
                {isPrelive && <span className="text-xs text-accent-primary uppercase tracking-widest font-bold">Ready to Go Live</span>}
              </div>
              <p className="text-text-primary font-semibold">{trackName}</p>
              <p className="text-text-muted text-sm">{formatDate(weekend.session_date)} · {weekend.session_type.replace('_', ' ')}</p>
              {isLive && weekend.expires_at && <div className="mt-1"><ExpiryCountdown expiresAt={weekend.expires_at} /></div>}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {isPrelive && (
                <Button
                  variant="primary"
                  loading={actionLoading}
                  onClick={() => void callEdge('race-weekend-go-live', { race_weekend_id: id })}
                >
                  <Play size={13} className="inline mr-1" /> Go Live
                </Button>
              )}
              {isLive && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={actionLoading}
                    onClick={() => void callEdge('race-weekend-control', { race_weekend_id: id, action: 'extend' })}
                  >
                    <Timer size={13} className="inline mr-1" /> Extend 24h
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    loading={actionLoading}
                    onClick={() => void callEdge('race-weekend-control', { race_weekend_id: id, action: 'end' })}
                  >
                    <Square size={13} className="inline mr-1 text-red-400" /> End Session
                  </Button>
                </>
              )}
            </div>
          </div>
          {actionError && <p className="mt-2 text-sm text-red-400">{actionError}</p>}
        </Card>

        {/* Weather card */}
        <Card>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CloudSun size={16} className="text-accent-primary" />
              <span className="font-heading text-sm uppercase tracking-wider text-text-primary">Weather Conditions</span>
            </div>
            <Button variant="secondary" size="sm" onClick={openWeatherModal}>
              <Pencil size={12} className="inline mr-1" />
              {weekend.weather_description || weekend.conditions ? 'Edit' : 'Set Weather'}
            </Button>
          </div>

          {(weekend.weather_description || weekend.conditions || weekend.air_temp_c != null) ? (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm">
              {weekend.weather_description && (
                <div><span className="text-text-muted text-xs uppercase tracking-wider block">Sky</span><span className="text-text-primary font-medium">{weekend.weather_description}</span></div>
              )}
              {weekend.conditions && (
                <div><span className="text-text-muted text-xs uppercase tracking-wider block">Track</span><span className="text-text-primary font-medium capitalize">{weekend.conditions}</span></div>
              )}
              {weekend.air_temp_c != null && (
                <div><span className="text-text-muted text-xs uppercase tracking-wider block">Air Temp</span><span className="text-text-primary font-medium">{weekend.air_temp_c}°C</span></div>
              )}
              {weekend.humidity_pct != null && (
                <div><span className="text-text-muted text-xs uppercase tracking-wider block">Humidity</span><span className="text-text-primary font-medium">{weekend.humidity_pct}%</span></div>
              )}
              {weekend.wind_speed_mph != null && (
                <div><span className="text-text-muted text-xs uppercase tracking-wider block">Wind</span><span className="text-text-primary font-medium">{weekend.wind_speed_mph} mph</span></div>
              )}

            </div>
          ) : (
            <p className="text-text-muted text-sm mt-2">No weather set — tap Edit to add conditions before going live.</p>
          )}
        </Card>

        {/* Drivers grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-heading text-sm uppercase tracking-wider text-text-primary">
              Drivers ({drivers.length})
            </h3>
            {!isEnded && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => { setAddDriverIds(new Set()); setAddDriverError(null); setAddDriverOpen(true) }}
              >
                <UserPlus size={13} className="inline mr-1" /> Add Driver
              </Button>
            )}
          </div>

          {isEnded && (
            <div className="mb-3 flex items-center gap-2 text-sm text-text-muted bg-bg-elevated border border-border-color rounded-card px-4 py-2.5">
              <XCircle size={14} className="text-red-400 flex-shrink-0" />
              Session ended — QR codes are no longer active.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {drivers.map(driver => {
              const status = driverStatus(driver)
              const liveUrl = getDriverLiveUrl(driver.token)

              return (
                <Card key={driver.id}>
                  {/* Status + name */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-text-primary truncate">{driver.driver_name}</p>
                      {driver.driver_class && (
                        <p className="text-xs text-text-muted">{driver.driver_class}</p>
                      )}
                      {driver.kart_make && (
                        <p className="text-xs text-text-muted">{driver.kart_make} {driver.kart_model}</p>
                      )}
                    </div>
                    {status === 'submitted' && (
                      <Badge label="Submitted" variant="positive" />
                    )}
                    {status === 'in_progress' && (
                      <Badge label="In Progress" variant="neutral" />
                    )}
                    {status === 'not_started' && !isEnded && (
                      <Badge label="Waiting" variant="neutral" />
                    )}
                    {status === 'not_started' && isEnded && (
                      <Badge label="Not Submitted" variant="negative" />
                    )}
                  </div>

                  {/* QR code */}
                  {(isLive || isPrelive) && !isEnded && (
                    <div className={`flex justify-center mb-3 p-3 rounded-card ${isLive ? 'bg-white' : 'bg-white/20'}`}>
                      <QRCodeSVG
                        value={liveUrl}
                        size={160}
                        bgColor="#FFFFFF"
                        fgColor="#0A0A0F"
                        level="H"
                      />
                    </div>
                  )}
                  {isEnded && (
                    <div className="flex justify-center mb-3 p-3 rounded-card bg-bg-elevated opacity-30">
                      <QRCodeSVG value={liveUrl} size={160} bgColor="#1C1C28" fgColor="#6B7A99" level="H" />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="space-y-2">
                    {isLive && (
                      <>
                        <button
                          type="button"
                          onClick={() => void shareDriver(driver)}
                          className="flex items-center justify-center gap-2 w-full py-1.5 px-3 rounded border border-green-500/40 text-green-400 hover:bg-green-500/10 text-xs transition-colors cursor-pointer"
                        >
                          <Share2 size={12} /> Share Setup Link
                        </button>
                        <button
                          type="button"
                          onClick={() => copyLink(driver.token)}
                          className="flex items-center justify-center gap-2 w-full py-1.5 px-3 rounded border border-border-color text-text-muted hover:text-accent-primary hover:border-accent-primary/40 text-xs transition-colors cursor-pointer"
                        >
                          <Copy size={12} />
                          {copiedToken === driver.token ? 'Copied!' : 'Copy Link'}
                        </button>
                      </>
                    )}
                    {driver.session_ids && Object.keys(driver.session_ids).length > 0 && (
                      <div className="space-y-1.5">
                        {Object.entries(driver.session_ids)
                          .sort(([a], [b]) => Number(a) - Number(b))
                          .map(([slot, sessionId]) => (
                            <Link
                              key={slot}
                              to={`/sessions/${sessionId}`}
                              className="flex items-center justify-center gap-2 w-full py-1.5 px-3 rounded border border-accent-primary/40 text-accent-primary hover:bg-accent-primary/10 text-xs transition-colors"
                            >
                              <ExternalLink size={12} /> View Test {slot}
                            </Link>
                          ))}
                      </div>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      </div>

      {/* Add Driver modal */}
      <Modal isOpen={addDriverOpen} onClose={() => setAddDriverOpen(false)} title="Add Driver">
        {(() => {
          const existingKartIds = new Set(drivers.map(d => d.kart_id))
          const availableKarts = allKarts.filter(k => !existingKartIds.has(k.id))
          return (
            <div className="space-y-3">
              {availableKarts.length === 0 ? (
                <p className="text-text-muted text-sm py-2">All drivers from your team are already in this session.</p>
              ) : (
                <>
                  <p className="text-xs text-text-muted">Select drivers to add. They'll get a QR code immediately{isLive ? ' (session is live)' : ''}.</p>
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {availableKarts.map(k => {
                      const selected = addDriverIds.has(k.id)
                      return (
                        <button
                          key={k.id}
                          type="button"
                          onClick={() => setAddDriverIds(prev => {
                            const next = new Set(prev)
                            if (next.has(k.id)) next.delete(k.id)
                            else next.add(k.id)
                            return next
                          })}
                          className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-card border transition-colors cursor-pointer ${
                            selected ? 'border-accent-primary bg-accent-primary/5' : 'border-border-color bg-bg-elevated hover:border-accent-primary/40'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                            selected ? 'bg-accent-primary border-accent-primary' : 'border-border-color'
                          }`}>
                            {selected && <Check size={9} className="text-black" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-text-primary truncate">{k.driver_name ?? k.nickname}</p>
                            <p className="text-xs text-text-muted truncate">
                              {[k.kart_class, k.kart_make, k.kart_model].filter(Boolean).join(' · ')}
                              {k.chassis_number ? ` · #${k.chassis_number}` : ''}
                            </p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                  {addDriverError && <p className="text-sm text-red-400">{addDriverError}</p>}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-text-muted">{addDriverIds.size} selected</span>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setAddDriverOpen(false)}>Cancel</Button>
                      <Button
                        size="sm"
                        loading={addingDrivers}
                        disabled={addDriverIds.size === 0}
                        onClick={() => void addDrivers()}
                      >
                        Add {addDriverIds.size > 0 ? addDriverIds.size : ''} Driver{addDriverIds.size !== 1 ? 's' : ''}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )
        })()}
      </Modal>

      {/* Weather modal */}
      <Modal isOpen={weatherOpen} onClose={() => setWeatherOpen(false)} title="Weather Conditions">
        <div className="space-y-4">
          {/* Auto-fetch from Met Office (Open-Meteo UKMO model) */}
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              disabled={fetchingWeather}
              onClick={() => void fetchWeather()}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded border border-accent-primary/50 text-accent-primary hover:bg-accent-primary/10 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {fetchingWeather ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Fetching forecast…
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
                  </svg>
                  Auto-fetch from Met Office
                </>
              )}
            </button>
            {weatherFetchError ? (
              <p className="text-xs text-red-400 text-center">{weatherFetchError}</p>
            ) : (
              <p className="text-xs text-text-muted text-center">Uses Met Office UKMO model · edit any field to override</p>
            )}
          </div>
          <div className="border-t border-border-subtle" />
          <SegmentedControl
            label="Track Conditions"
            options={[
              { label: 'Dry',  value: 'dry'  },
              { label: 'Damp', value: 'damp' },
              { label: 'Wet',  value: 'wet'  },
            ]}
            value={weatherForm.conditions || null}
            onChange={v => setWeatherForm(f => ({ ...f, conditions: v }))}
          />
          <Select
            label="Sky / Weather"
            value={weatherForm.weather_description}
            onChange={wf('weather_description')}
            options={WEATHER_OPTIONS}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Air Temp" type="number" unit="°C"  value={weatherForm.air_temp_c}     onChange={wf('air_temp_c')}     placeholder="e.g. 18" />
            <Input label="Humidity" type="number" unit="%"   value={weatherForm.humidity_pct}   onChange={wf('humidity_pct')}   placeholder="e.g. 65" />
            <Input label="Wind"     type="number" unit="mph" value={weatherForm.wind_speed_mph}  onChange={wf('wind_speed_mph')}  placeholder="e.g. 8"  />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="ghost" size="sm" onClick={() => setWeatherOpen(false)}>Cancel</Button>
            <Button size="sm" loading={savingWeather} onClick={() => void saveWeather()}>Save Weather</Button>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  )
}
