export interface CurrentWeather {
  temp_c:    number
  humidity:  number
  wind_mph:  number
  precip_mm: number
  code:      number
}

export function weatherLabel(code: number): string {
  if (code === 0)  return 'Clear Sky'
  if (code === 1)  return 'Mainly Clear'
  if (code === 2)  return 'Partly Cloudy'
  if (code === 3)  return 'Overcast'
  if (code <= 48)  return 'Foggy'
  if (code <= 55)  return 'Drizzle'
  if (code <= 65)  return 'Rain'
  if (code <= 75)  return 'Snow'
  if (code <= 82)  return 'Showers'
  if (code <= 99)  return 'Thunderstorm'
  return 'Unknown'
}

export function weatherEmoji(code: number): string {
  if (code === 0)  return '☀️'
  if (code <= 2)   return '🌤️'
  if (code === 3)  return '☁️'
  if (code <= 48)  return '🌫️'
  if (code <= 55)  return '🌦️'
  if (code <= 65)  return '🌧️'
  if (code <= 75)  return '❄️'
  if (code <= 82)  return '🌦️'
  return '⛈️'
}

export function conditionColour(code: number): string {
  if (code === 0 || code === 1) return 'text-yellow-400'
  if (code === 2 || code === 3) return 'text-text-muted'
  if (code <= 48)               return 'text-text-muted'
  return 'text-blue-400'
}

export async function fetchWeatherByCoords(lat: number, lng: number): Promise<CurrentWeather> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,weather_code&wind_speed_unit=mph&timezone=auto`
  const res  = await fetch(url)
  const data = await res.json() as {
    current: {
      temperature_2m:       number
      relative_humidity_2m: number
      wind_speed_10m:       number
      precipitation:        number
      weather_code:         number
    }
  }
  const c = data.current
  return { temp_c: c.temperature_2m, humidity: c.relative_humidity_2m, wind_mph: c.wind_speed_10m, precip_mm: c.precipitation, code: c.weather_code }
}

export async function geocodeQuery(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res  = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      { headers: { 'User-Agent': 'KartConnect/1.0' } }
    )
    const data = await res.json() as Array<{ lat: string; lon: string }>
    if (!data.length) return null
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch {
    return null
  }
}

export function wmoToFormDescription(code: number): string {
  if (code === 0)                 return 'Sunny'
  if (code <= 2)                  return 'Light Sun'
  if (code === 3)                 return 'Overcast'
  if (code <= 48)                 return 'Overcast'
  if (code <= 57)                 return 'Light Rain'
  if (code === 61 || code === 80) return 'Light Rain'
  if (code === 63 || code === 81) return 'Rain'
  if (code === 65 || code === 82) return 'Heavy Rain'
  if (code === 66 || code === 67) return 'Rain'
  if (code >= 71 && code <= 77)   return 'Snow'
  if (code >= 95)                 return 'Heavy Rain'
  return 'Overcast'
}

export function precipToConditions(mm: number): string {
  if (mm > 2)   return 'wet'
  if (mm > 0.1) return 'damp'
  return 'dry'
}

export async function fetchWeatherForTrack(
  lat: number | null,
  lng: number | null,
  fallbackQuery: string,
): Promise<CurrentWeather | null> {
  try {
    let resolvedLat = lat
    let resolvedLng = lng
    if (!resolvedLat || !resolvedLng) {
      const coords = await geocodeQuery(fallbackQuery)
      if (!coords) return null
      resolvedLat = coords.lat
      resolvedLng = coords.lng
    }
    return await fetchWeatherByCoords(resolvedLat, resolvedLng)
  } catch {
    return null
  }
}
