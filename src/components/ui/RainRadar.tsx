import { useState, useEffect } from 'react'
import { CloudRain, Umbrella, Sun } from 'lucide-react'
import { fetchRainForecast, type RainForecast } from '@/lib/weather'

interface RainRadarProps {
  lat: number | null | undefined
  lng: number | null | undefined
}

export function RainRadar({ lat, lng }: RainRadarProps) {
  const [forecast, setForecast] = useState<RainForecast | null | 'loading'>('loading')

  async function load() {
    if (!lat || !lng) { setForecast(null); return }
    const result = await fetchRainForecast(lat, lng)
    setForecast(result)
  }

  useEffect(() => {
    void load()
    const id = setInterval(() => void load(), 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [lat, lng])

  if (!lat || !lng || forecast === null) return null
  if (forecast === 'loading') return (
    <div className="flex items-center gap-2 text-text-muted text-xs mt-3 pt-3 border-t border-border-color">
      <span className="w-3 h-3 border-2 border-text-muted border-t-transparent rounded-full animate-spin flex-shrink-0" />
      Checking rain forecast…
    </div>
  )

  const { minutesUntilRain, currentlyRaining } = forecast

  if (currentlyRaining || minutesUntilRain === 0) {
    return (
      <div className="mt-3 pt-3 border-t border-border-color flex items-center gap-2.5 px-3 py-2.5 rounded-card bg-blue-500/10 border border-blue-500/30">
        <Umbrella size={15} className="text-blue-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-blue-300">Raining now</p>
          <p className="text-xs text-blue-400/70">Track is wet — check tyre pressures</p>
        </div>
      </div>
    )
  }

  if (minutesUntilRain === null) {
    return (
      <div className="mt-3 pt-3 border-t border-border-color flex items-center gap-2.5">
        <Sun size={14} className="text-yellow-400 flex-shrink-0" />
        <p className="text-xs text-text-muted">Clear for the next 2 hours</p>
      </div>
    )
  }

  const isImminent = minutesUntilRain <= 10
  const isSoon     = minutesUntilRain <= 30

  const bgClass   = isImminent ? 'bg-red-500/10 border-red-500/30'    : isSoon ? 'bg-amber-500/10 border-amber-500/30'    : 'bg-sky-500/10 border-sky-500/30'
  const textClass = isImminent ? 'text-red-300'                        : isSoon ? 'text-amber-300'                        : 'text-sky-300'
  const subClass  = isImminent ? 'text-red-400/70'                     : isSoon ? 'text-amber-400/70'                     : 'text-sky-400/70'
  const iconClass = isImminent ? 'text-red-400'                        : isSoon ? 'text-amber-400'                        : 'text-sky-400'

  const label = minutesUntilRain === 1 ? '~1 minute' : `~${minutesUntilRain} minutes`

  return (
    <div className={`mt-3 pt-3 border-t border-border-color flex items-center gap-2.5 px-3 py-2.5 rounded-card border ${bgClass}`}>
      <CloudRain size={15} className={`${iconClass} flex-shrink-0`} />
      <div>
        <p className={`text-sm font-semibold ${textClass}`}>Rain due in {label}</p>
        <p className={`text-xs ${subClass}`}>
          {isImminent ? 'Get cover on and prep your wet set now' : isSoon ? 'Start prepping your wet tyres now' : 'Keep an eye on it — wets may be needed'}
        </p>
      </div>
    </div>
  )
}
