const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Met Office significant weather code → our description labels ────────────
function metOfficeCodeToDescription(code: number): string {
  if (code === 0 || code === 1)           return 'Sunny'
  if (code === 2 || code === 3)           return 'Light Sun'
  if (code === 5 || code === 6)           return 'Overcast'   // mist / fog
  if (code === 7 || code === 8)           return 'Overcast'
  if (code === 9  || code === 10)         return 'Light Rain' // light rain shower
  if (code === 11 || code === 12)         return 'Light Rain' // drizzle / light rain
  if (code === -1)                        return 'Light Rain' // trace rain
  if (code === 13 || code === 14)         return 'Rain'       // heavy rain shower
  if (code === 15)                        return 'Heavy Rain'
  if (code === 16 || code === 17 || code === 18) return 'Rain' // sleet
  if (code >= 19 && code <= 21)           return 'Rain'       // hail
  if (code >= 22 && code <= 27)           return 'Snow'
  if (code >= 28 && code <= 30)           return 'Heavy Rain' // thunder
  return 'Overcast'
}

// ── WMO code (Open-Meteo) → our description labels ──────────────────────────
function wmoToDescription(code: number): string {
  if (code === 0)                   return 'Sunny'
  if (code <= 2)                    return 'Light Sun'
  if (code === 3)                   return 'Overcast'
  if (code <= 48)                   return 'Overcast'   // fog
  if (code <= 57)                   return 'Light Rain' // drizzle
  if (code === 61 || code === 80)   return 'Light Rain'
  if (code === 63 || code === 81)   return 'Rain'
  if (code === 65 || code === 82)   return 'Heavy Rain'
  if (code === 66 || code === 67)   return 'Rain'       // freezing rain
  if (code >= 71 && code <= 77)     return 'Snow'
  if (code >= 95)                   return 'Heavy Rain' // thunder
  return 'Overcast'
}

function precipToConditions(mm: number): string {
  if (mm > 2)   return 'wet'
  if (mm > 0.1) return 'damp'
  return 'dry'
}

// Find the hourly entry in a timeSeries array closest to midday on targetDate
function entryAtNoon<T extends { time: string }>(series: T[], targetDate: string): T | null {
  const noonMs = new Date(`${targetDate}T12:00:00Z`).getTime()
  let best: T | null = null
  let bestDiff = Infinity
  for (const entry of series) {
    const diff = Math.abs(new Date(entry.time).getTime() - noonMs)
    if (diff < bestDiff) { bestDiff = diff; best = entry }
  }
  return best
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { track_name, country, lat: rawLat, lng: rawLng, date } = await req.json() as {
      track_name: string
      country: string | null
      lat: number | null
      lng: number | null
      date: string | null
    }

    if (!track_name) {
      return new Response(JSON.stringify({ error: 'track_name_required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const targetDate = date ?? new Date().toISOString().split('T')[0]
    let lat = rawLat
    let lng = rawLng

    // ── Step 1: geocode if no coordinates stored on the track ────────────────
    if (lat == null || lng == null) {
      const locationQuery = [track_name, country ?? 'United Kingdom'].filter(Boolean).join(', ')
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationQuery)}&format=json&limit=1`,
        { headers: { 'User-Agent': 'KartConnect/1.0' } }
      )
      const geoData = await geoRes.json() as Array<{ lat: string; lon: string }>

      if (!geoData.length) {
        // Try with just the track name
        const fallbackRes = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(track_name)}&format=json&limit=1`,
          { headers: { 'User-Agent': 'KartConnect/1.0' } }
        )
        const fallback = await fallbackRes.json() as Array<{ lat: string; lon: string }>
        if (!fallback.length) {
          return new Response(JSON.stringify({ error: 'location_not_found' }), {
            status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
        lat = parseFloat(fallback[0].lat)
        lng = parseFloat(fallback[0].lon)
      } else {
        lat = parseFloat(geoData[0].lat)
        lng = parseFloat(geoData[0].lon)
      }
    }

    // ── Step 2: Met Office DataHub (direct API) ──────────────────────────────
    const MET_KEY = Deno.env.get('METOFFICE_API_KEY')

    if (MET_KEY) {
      try {
        const metUrl = new URL('https://data.hub.api.metoffice.gov.uk/sitespecific/v0/point/hourly')
        metUrl.searchParams.set('latitude',            String(lat))
        metUrl.searchParams.set('longitude',           String(lng))
        metUrl.searchParams.set('includeLocationName', 'true')

        const metRes = await fetch(metUrl.toString(), {
          headers: { apikey: MET_KEY, accept: 'application/json' },
        })

        if (metRes.ok) {
          const metData = await metRes.json() as {
            features?: Array<{
              geometry?: { coordinates?: number[] }
              properties?: {
                timeSeries?: Array<{
                  time: string
                  screenTemperature: number
                  screenRelativeHumidity: number
                  windSpeed10m: number
                  totalPrecipAmount: number
                  significantWeatherCode: number
                }>
              }
            }>
          }

          const series = metData.features?.[0]?.properties?.timeSeries ?? []
          const elevation = metData.features?.[0]?.geometry?.coordinates?.[2] ?? null
          const entry = entryAtNoon(series, targetDate)

          if (entry) {
            const precip = entry.totalPrecipAmount ?? 0
            return new Response(JSON.stringify({
              conditions:          precipToConditions(precip),
              weather_description: metOfficeCodeToDescription(entry.significantWeatherCode ?? 8),
              air_temp_c:          Math.round((entry.screenTemperature ?? 0) * 10) / 10,
              humidity_pct:        Math.round(entry.screenRelativeHumidity ?? 0),
              // Met Office returns wind in m/s → convert to mph
              wind_speed_mph:      Math.round((entry.windSpeed10m ?? 0) * 2.23694 * 10) / 10,
              altitude_m:          elevation != null ? Math.round(elevation) : null,
              source:              'Met Office',
            }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
          }
        }
      } catch (metErr) {
        console.error('Met Office API error (falling back to Open-Meteo):', metErr)
        // Fall through to Open-Meteo fallback
      }
    }

    // ── Step 3: Fallback — Open-Meteo with UKMO model ────────────────────────
    const wxUrl = new URL('https://api.open-meteo.com/v1/forecast')
    wxUrl.searchParams.set('latitude',       String(lat))
    wxUrl.searchParams.set('longitude',      String(lng))
    wxUrl.searchParams.set('hourly',         'temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code')
    wxUrl.searchParams.set('wind_speed_unit','mph')
    wxUrl.searchParams.set('timezone',       'Europe/London')
    wxUrl.searchParams.set('start_date',     targetDate)
    wxUrl.searchParams.set('end_date',       targetDate)
    if (lat >= 49 && lat <= 61 && lng >= -8 && lng <= 2) {
      wxUrl.searchParams.set('models', 'ukmo_seamless')
    }

    const wxRes = await fetch(wxUrl.toString())
    const wx = await wxRes.json() as {
      elevation?: number
      hourly?: {
        temperature_2m: number[]
        relative_humidity_2m: number[]
        precipitation: number[]
        wind_speed_10m: number[]
        weather_code: number[]
      }
      error?: boolean
      reason?: string
    }

    if (wx.error) {
      return new Response(JSON.stringify({ error: 'weather_fetch_failed', detail: wx.reason }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const h = wx.hourly!
    const i = 12 // noon index
    const precip = h.precipitation?.[i] ?? 0
    const code   = h.weather_code?.[i] ?? 3

    return new Response(JSON.stringify({
      conditions:          precipToConditions(precip),
      weather_description: wmoToDescription(code),
      air_temp_c:          h.temperature_2m?.[i]       != null ? Math.round(h.temperature_2m[i] * 10) / 10 : null,
      humidity_pct:        h.relative_humidity_2m?.[i] != null ? Math.round(h.relative_humidity_2m[i]) : null,
      wind_speed_mph:      h.wind_speed_10m?.[i]       != null ? Math.round(h.wind_speed_10m[i] * 10) / 10 : null,
      altitude_m:          wx.elevation                != null ? Math.round(wx.elevation) : null,
      source:              'Met Office UKMO model',
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error('fetch-weather error:', err)
    return new Response(JSON.stringify({ error: 'server_error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
