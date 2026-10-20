import { useState, useEffect, useRef } from 'react'
import { MapPin, Wind, Droplets, Thermometer, RefreshCw, CloudRain, Sun, Umbrella, Cloud } from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Card } from '@/components/ui'
import { RadarMap } from '@/components/ui/RadarMap'
import {
  fetchWeatherByCoords, fetchRainForecast, fetchPrecipTimeline,
  weatherLabel, weatherEmoji, conditionColour,
  type CurrentWeather, type RainForecast, type PrecipSlot,
} from '@/lib/weather'

interface Coords { lat: number; lng: number; accuracy: number }

function PrecipForecastChart({ slots }: { slots: PrecipSlot[] }) {
  const maxMm = Math.max(...slots.map(s => s.mm), 1)

  function barColor(mm: number): string {
    if (mm < 0.1) return 'var(--color-border, #2a2a3a)'
    if (mm < 0.5) return '#7dd3fc'  // sky-300
    if (mm < 2.0) return '#3b82f6'  // blue-500
    if (mm < 5.0) return '#1d4ed8'  // blue-700
    return '#312e81'                // indigo-900
  }

  const firstRain = slots.find(s => s.mm >= 0.1)
  let summary: string
  let summaryColor: string
  if (!firstRain) {
    summary = 'Clear for the next 3 hours'
    summaryColor = 'text-yellow-400'
  } else {
    const idx = slots.indexOf(firstRain)
    const mins = idx * 15
    const intensity = firstRain.mm >= 5 ? 'Heavy rain' : firstRain.mm >= 2 ? 'Moderate rain' : firstRain.mm >= 0.5 ? 'Light rain' : 'Drizzle'
    summary = mins === 0 ? `${intensity} now` : `${intensity} in ${mins} min`
    summaryColor = mins <= 15 ? 'text-red-400' : mins <= 45 ? 'text-amber-400' : 'text-sky-400'
  }

  // Show labels every 4 slots (every hour)
  const labelIndices = new Set(slots.map((_s, i) => i).filter(i => i % 4 === 0))

  return (
    <div className="space-y-2">
      <p className={`text-sm font-semibold ${summaryColor}`}>{summary}</p>
      <div className="flex items-end gap-px" style={{ height: 56 }}>
        {slots.map((slot) => {
          const pct = slot.mm < 0.05 ? 3 : Math.max(5, (slot.mm / maxMm) * 52)
          return (
            <div
              key={slot.time}
              className="flex-1 rounded-sm transition-all"
              style={{ height: `${pct}px`, background: barColor(slot.mm) }}
              title={`${new Date(slot.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}: ${slot.mm.toFixed(1)} mm`}
            />
          )
        })}
      </div>
      <div className="flex justify-between text-[9px] text-text-muted/60 font-mono">
        {slots.map((slot, i) => (
          <span key={slot.time} className={labelIndices.has(i) ? '' : 'invisible'}>
            {new Date(slot.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-3 pt-1">
        <span className="text-[9px] text-text-muted/50 uppercase tracking-wider">Intensity</span>
        <div className="flex items-center gap-1.5">
          {[['#7dd3fc','Drizzle'],['#3b82f6','Light'],['#1d4ed8','Moderate'],['#312e81','Heavy']].map(([c,l]) => (
            <div key={l} className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
              <span className="text-[9px] text-text-muted/60">{l}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function WeatherPage() {
  const [coords, setCoords]           = useState<Coords | null>(null)
  const [geoError, setGeoError]       = useState<string | null>(null)
  const [geoLoading, setGeoLoading]   = useState(true)

  const [weather, setWeather]               = useState<CurrentWeather | null>(null)
  const [forecast, setForecast]             = useState<RainForecast | null>(null)
  const [precipTimeline, setPrecipTimeline] = useState<PrecipSlot[]>([])
  const [wxLoading, setWxLoading]           = useState(false)
  const [lastUpdated, setLastUpdated]       = useState<Date | null>(null)

  const watchIdRef   = useRef<number | null>(null)
  const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const tempUnit     = (localStorage.getItem('kc_temp_unit') ?? 'c') as 'c' | 'f'

  function displayTemp(c: number) {
    return tempUnit === 'f' ? `${Math.round(c * 9 / 5 + 32)}°F` : `${Math.round(c)}°C`
  }

  async function loadWeather(lat: number, lng: number) {
    setWxLoading(true)
    const [w, f, p] = await Promise.all([
      fetchWeatherByCoords(lat, lng),
      fetchRainForecast(lat, lng),
      fetchPrecipTimeline(lat, lng),
    ])
    setWeather(w)
    setForecast(f)
    setPrecipTimeline(p)
    setLastUpdated(new Date())
    setWxLoading(false)
  }

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation not supported by your browser.')
      setGeoLoading(false)
      return
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      pos => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy })
        setGeoError(null)
        setGeoLoading(false)
      },
      err => {
        setGeoError(
          err.code === 1 ? 'Location access denied — enable it in your browser settings.' :
          err.code === 2 ? 'Location unavailable — check your device GPS.' :
          'Could not get location — try refreshing.'
        )
        setGeoLoading(false)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    )
    return () => { if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current) }
  }, [])

  // Refresh weather when location settles (keyed on 3dp rounding so it doesn't fire on micro-jitter)
  const coordKey = coords ? `${coords.lat.toFixed(3)}_${coords.lng.toFixed(3)}` : null
  useEffect(() => {
    if (!coords) return
    void loadWeather(coords.lat, coords.lng)
    if (refreshTimer.current) clearInterval(refreshTimer.current)
    refreshTimer.current = setInterval(() => void loadWeather(coords.lat, coords.lng), 5 * 60 * 1000)
    return () => { if (refreshTimer.current) clearInterval(refreshTimer.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordKey])

  const minutesUntilRain = forecast?.minutesUntilRain ?? null
  // Also flag as raining when current weather code indicates precipitation (drizzle = 51+, rain = 61+)
  const currentlyRaining = (forecast?.currentlyRaining ?? false) || ((weather?.code ?? 0) >= 51)

  return (
    <PageWrapper title="Weather Radar">
      <div className="max-w-2xl mx-auto space-y-4">

        {/* Location bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <MapPin size={13} className={coords ? 'text-accent-primary' : 'text-text-muted'} />
            {geoLoading && <span>Getting your location…</span>}
            {geoError   && <span className="text-red-400 text-xs">{geoError}</span>}
            {coords     && (
              <span className="text-xs">
                {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                <span className="opacity-40 ml-1">±{Math.round(coords.accuracy)}m</span>
              </span>
            )}
          </div>
          {coords && (
            <button
              type="button"
              onClick={() => void loadWeather(coords.lat, coords.lng)}
              disabled={wxLoading}
              className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors disabled:opacity-40 cursor-pointer"
            >
              <RefreshCw size={11} className={wxLoading ? 'animate-spin' : ''} />
              {lastUpdated
                ? lastUpdated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                : 'Refresh'}
            </button>
          )}
        </div>

        {/* Rain alert — most prominent */}
        {forecast && (
          <>
            {(currentlyRaining || minutesUntilRain === 0) && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-card bg-blue-500/10 border border-blue-500/30">
                <Umbrella size={18} className="text-blue-400 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-blue-300">Raining now</p>
                  <p className="text-sm text-blue-400/70">Track is wet — check tyre pressures</p>
                </div>
              </div>
            )}
            {!currentlyRaining && minutesUntilRain !== null && minutesUntilRain > 0 && (() => {
              const imminent = minutesUntilRain <= 10
              const soon     = minutesUntilRain <= 30
              const bg   = imminent ? 'bg-red-500/10 border-red-500/30'   : soon ? 'bg-amber-500/10 border-amber-500/30'   : 'bg-sky-500/10 border-sky-500/30'
              const col  = imminent ? 'text-red-300'                       : soon ? 'text-amber-300'                       : 'text-sky-300'
              const sub  = imminent ? 'text-red-400/70'                    : soon ? 'text-amber-400/70'                    : 'text-sky-400/70'
              const icon = imminent ? 'text-red-400'                       : soon ? 'text-amber-400'                       : 'text-sky-400'
              const msg  = imminent ? 'Get cover on and prep your wet set now'
                         : soon     ? 'Start prepping your wet tyres now'
                         :            'Keep an eye on it — wets may be needed'
              return (
                <div className={`flex items-center gap-3 px-4 py-3 rounded-card border ${bg}`}>
                  <CloudRain size={18} className={`${icon} flex-shrink-0`} />
                  <div>
                    <p className={`font-semibold ${col}`}>
                      Rain due in ~{minutesUntilRain} minute{minutesUntilRain !== 1 ? 's' : ''}
                    </p>
                    <p className={`text-sm ${sub}`}>{msg}</p>
                  </div>
                </div>
              )
            })()}
            {!currentlyRaining && minutesUntilRain === null && (
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-card bg-bg-elevated border border-border-color">
                <Sun size={15} className="text-yellow-400 flex-shrink-0" />
                <p className="text-sm text-text-muted">Clear for the next 2 hours</p>
              </div>
            )}
          </>
        )}

        {/* Current conditions strip */}
        {weather && (
          <Card>
            <div className="flex items-center gap-4">
              <span className="text-4xl">{weatherEmoji(weather.code)}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-2xl font-bold font-heading ${conditionColour(weather.code)}`}>
                  {displayTemp(weather.temp_c)}
                </p>
                <p className="text-xs text-text-muted">{weatherLabel(weather.code, weather.precip_mm)}</p>
              </div>
              <div className="flex gap-4 text-right">
                <div>
                  <div className="flex items-center gap-1 justify-end text-text-muted">
                    <Wind size={11} />
                    <span className="text-xs font-semibold text-text-primary">{Math.round(weather.wind_mph)} mph</span>
                  </div>
                  <div className="flex items-center gap-1 justify-end text-text-muted mt-1">
                    <Droplets size={11} />
                    <span className="text-xs font-semibold text-text-primary">{weather.humidity}%</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1 justify-end text-text-muted">
                    <Thermometer size={11} />
                    <span className="text-xs font-semibold text-text-primary">{weather.precip_mm} mm</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Geo error with no coords */}
        {geoError && !coords && (
          <Card>
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <Cloud size={32} className="text-text-muted opacity-40" />
              <p className="text-text-muted text-sm">{geoError}</p>
            </div>
          </Card>
        )}

        {/* Precipitation forecast chart */}
        {precipTimeline.length > 0 && (
          <Card>
            <h2 className="font-heading text-xs uppercase tracking-wider text-text-muted mb-3">Rain Forecast — Next 3 Hours</h2>
            <PrecipForecastChart slots={precipTimeline} />
          </Card>
        )}

        {/* Radar map */}
        {coords && (
          <Card>
            <h2 className="font-heading text-xs uppercase tracking-wider text-text-muted mb-3">Rain Radar</h2>
            <RadarMap lat={coords.lat} lng={coords.lng} />
          </Card>
        )}

      </div>
    </PageWrapper>
  )
}
