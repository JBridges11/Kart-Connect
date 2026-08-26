import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Wind, Droplets, CloudRain } from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Card } from '@/components/ui'
import { useTrack } from '@/hooks/useTracks'
import { useSessions } from '@/hooks/useSessions'
import { lapMsToString } from '@/lib/formatters'
import { shortLocation } from '@/pages/Tracks'
import {
  fetchWeatherForTrack,
  weatherLabel, weatherEmoji, conditionColour,
  type CurrentWeather,
} from '@/lib/weather'

export function TrackDetailPage() {
  const { id }       = useParams<{ id: string }>()
  const navigate     = useNavigate()
  const { data: track, loading } = useTrack(id ?? null)
  const { data: allSessions }    = useSessions()

  const [weather, setWeather]               = useState<CurrentWeather | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [weatherError, setWeatherError]     = useState(false)

  const tempUnit = (localStorage.getItem('kc_temp_unit') ?? 'c') as 'c' | 'f'

  useEffect(() => {
    if (!track) return
    setWeather(null)
    setWeatherError(false)
    setWeatherLoading(true)
    void fetchWeatherForTrack(track.lat, track.lng, track.location ?? track.name)
      .then(w => { if (w) setWeather(w); else setWeatherError(true) })
      .finally(() => setWeatherLoading(false))
  }, [track?.id])

  const sessions = allSessions.filter(s => s.track_id === id)
  const bestLap  = sessions.filter(s => s.best_lap_time_ms).length
    ? Math.min(...sessions.filter(s => s.best_lap_time_ms).map(s => s.best_lap_time_ms!))
    : null

  function displayTemp(c: number) {
    return tempUnit === 'f' ? `${Math.round(c * 9 / 5 + 32)}°F` : `${Math.round(c)}°C`
  }

  if (loading) return (
    <PageWrapper title="Track"><div className="text-text-muted text-sm">Loading…</div></PageWrapper>
  )
  if (!track) return (
    <PageWrapper title="Track"><div className="text-text-muted text-sm">Track not found.</div></PageWrapper>
  )

  const subtitle = track.location ? shortLocation(track.location) : track.country

  return (
    <PageWrapper
      title={track.name}
      action={
        <button type="button" onClick={() => navigate('/tracks')}
          className="flex items-center gap-1 text-sm text-text-muted hover:text-text-primary transition-colors cursor-pointer">
          <ChevronLeft size={16} /> Tracks
        </button>
      }
    >
      <div className="max-w-2xl mx-auto space-y-4">
        {subtitle && <p className="text-text-muted text-sm -mt-2">{subtitle}</p>}

        {/* Live Weather */}
        <Card>
          <h2 className="font-heading text-xs uppercase tracking-wider text-text-muted mb-3">Live Weather</h2>
          {weatherLoading && (
            <div className="flex items-center gap-2 text-text-muted text-sm">
              <span className="w-4 h-4 border-2 border-text-muted border-t-transparent rounded-full animate-spin" />
              Fetching conditions…
            </div>
          )}
          {weatherError && (
            <p className="text-text-muted text-sm">Weather unavailable for this track.</p>
          )}
          {weather && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-5xl">{weatherEmoji(weather.code)}</span>
                <div>
                  <p className={`text-3xl font-bold font-heading ${conditionColour(weather.code)}`}>
                    {displayTemp(weather.temp_c)}
                  </p>
                  <p className="text-sm text-text-muted mt-0.5">{weatherLabel(weather.code)}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-bg-elevated rounded-card p-3 flex flex-col items-center gap-1">
                  <Wind size={16} className="text-text-muted" />
                  <p className="text-sm font-semibold text-text-primary">{Math.round(weather.wind_mph)} mph</p>
                  <p className="text-xs text-text-muted">Wind</p>
                </div>
                <div className="bg-bg-elevated rounded-card p-3 flex flex-col items-center gap-1">
                  <Droplets size={16} className="text-text-muted" />
                  <p className="text-sm font-semibold text-text-primary">{weather.humidity}%</p>
                  <p className="text-xs text-text-muted">Humidity</p>
                </div>
                <div className="bg-bg-elevated rounded-card p-3 flex flex-col items-center gap-1">
                  <CloudRain size={16} className="text-text-muted" />
                  <p className="text-sm font-semibold text-text-primary">{weather.precip_mm} mm</p>
                  <p className="text-xs text-text-muted">Precip</p>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Stats */}
        <Card>
          <h2 className="font-heading text-xs uppercase tracking-wider text-text-muted mb-3">Stats</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-text-muted">Sessions</p>
              <p className="text-2xl font-bold text-text-primary font-heading">{sessions.length}</p>
            </div>
            {bestLap && (
              <div>
                <p className="text-xs text-text-muted">Best Lap</p>
                <p className="text-2xl font-bold text-accent-primary font-mono">{lapMsToString(bestLap)}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Session history */}
        {sessions.length > 0 && (
          <Card>
            <h2 className="font-heading text-xs uppercase tracking-wider text-text-muted mb-3">Sessions</h2>
            <div className="space-y-2">
              {[...sessions].sort((a, b) => b.session_date.localeCompare(a.session_date)).map(s => (
                <button key={s.id} type="button" onClick={() => navigate(`/sessions/${s.id}`)}
                  className="w-full text-left flex items-center justify-between px-3 py-2.5 rounded-card bg-bg-elevated hover:bg-accent-primary/5 transition-colors cursor-pointer">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">
                      {s.event_name ?? s.session_name ?? s.session_type}
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {new Date(s.session_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {s.conditions ? ` · ${s.conditions}` : ''}
                    </p>
                  </div>
                  {s.best_lap_time_ms && (
                    <p className="text-sm font-mono text-accent-primary flex-shrink-0 ml-3">
                      {lapMsToString(s.best_lap_time_ms)}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </Card>
        )}

        {track.layout_notes && (
          <Card>
            <h2 className="font-heading text-xs uppercase tracking-wider text-text-muted mb-2">Notes</h2>
            <p className="text-sm text-text-primary whitespace-pre-wrap">{track.layout_notes}</p>
          </Card>
        )}
      </div>
    </PageWrapper>
  )
}
