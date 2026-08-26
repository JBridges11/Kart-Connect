import { useState, useCallback } from 'react'
import type { WeatherDescription } from '@/types'

export interface LiveWeather {
  temp_c: number
  humidity_pct: number
  wind_mph: number
  description: WeatherDescription
  conditions: 'dry' | 'damp' | 'wet'
}

function wmoToDescription(code: number): WeatherDescription {
  if (code === 0)                           return 'Sunny'
  if (code <= 2)                            return 'Light Sun'
  if (code <= 3 || code === 45 || code === 48) return 'Overcast'
  if (code <= 55)                           return 'Light Rain'  // drizzle
  if (code === 61)                          return 'Light Rain'
  if (code <= 65)                           return 'Rain'
  if (code <= 67)                           return 'Rain'        // freezing rain
  if (code <= 77)                           return 'Snow'
  if (code <= 81)                           return 'Rain'
  if (code === 82)                          return 'Heavy Rain'
  if (code <= 86)                           return 'Snow'
  return 'Heavy Rain'                                            // thunderstorm
}

function wmoToConditions(code: number, precipitation: number): 'dry' | 'damp' | 'wet' {
  if (precipitation > 1 || code >= 63) return 'wet'
  if (precipitation > 0 || code >= 51) return 'damp'
  return 'dry'
}

export function useWeather() {
  const [data,    setData]    = useState<LiveWeather | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const fetchForCoords = useCallback(async (lat: number, lon: number) => {
    setLoading(true)
    setError(null)
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&wind_speed_unit=mph&timezone=auto`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Weather API ${res.status}`)
      const json = await res.json() as {
        current: {
          temperature_2m: number
          relative_humidity_2m: number
          precipitation: number
          weather_code: number
          wind_speed_10m: number
        }
      }
      const c = json.current
      setData({
        temp_c:       Math.round(c.temperature_2m * 10) / 10,
        humidity_pct: Math.round(c.relative_humidity_2m),
        wind_mph:     Math.round(c.wind_speed_10m * 10) / 10,
        description:  wmoToDescription(c.weather_code),
        conditions:   wmoToConditions(c.weather_code, c.precipitation),
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not fetch weather')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchForCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported by this browser')
      return
    }
    setLoading(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      pos => { void fetchForCoords(pos.coords.latitude, pos.coords.longitude) },
      err => {
        setError(
          err.code === 1
            ? 'Location access denied — check your browser settings'
            : 'Could not determine your location'
        )
        setLoading(false)
      },
      { timeout: 10000 },
    )
  }, [fetchForCoords])

  return { data, loading, error, fetchForCoords, fetchForCurrentLocation }
}
