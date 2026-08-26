import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface RaceWeekend {
  id: string
  manager_id: string
  track_id: string
  session_name: string
  session_date: string
  session_type: string
  is_live: boolean
  went_live_at: string | null
  expires_at: string | null
  ended_at: string | null
  created_at: string
  // Weather
  conditions: string | null
  weather_description: string | null
  air_temp_c: number | null
  humidity_pct: number | null
  wind_speed_mph: number | null
  altitude_m: number | null
  track?: { name: string; country: string | null; lat: number | null; lng: number | null }
}

export interface RaceWeekendDriver {
  id: string
  race_weekend_id: string
  manager_id: string
  kart_id: string
  driver_name: string
  driver_class: string | null
  kart_make: string | null
  kart_model: string | null
  chassis_number: string | null
  chassis_stiffness: string | null
  driver_phone: string | null
  engines_snapshot: Array<{ rank: number; make: string; number: string }> | null
  selected_engine_rank: number | null
  token: string
  token_is_active: boolean
  setup_data: Record<string, unknown> | null
  setup_started_at: string | null
  setup_updated_at: string | null
  setup_submitted: boolean
  submitted_at: string | null
  session_id: string | null
  session_ids: Record<string, string> | null
  created_at: string
}

export function useRaceWeekends() {
  const [data, setData] = useState<RaceWeekend[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data: rows, error: err } = await supabase
      .from('race_weekends')
      .select('*, track:tracks(name, country, lat, lng)')
      .order('session_date', { ascending: false })
    if (err) setError(err.message)
    else setData((rows ?? []) as RaceWeekend[])
    setLoading(false)
  }, [])

  useEffect(() => { void fetch() }, [fetch])

  return { data, loading, error, refetch: fetch }
}

export function useRaceWeekend(id: string | undefined) {
  const [weekend, setWeekend] = useState<RaceWeekend | null>(null)
  const [drivers, setDrivers] = useState<RaceWeekendDriver[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const [weekendRes, driversRes] = await Promise.all([
      supabase
        .from('race_weekends')
        .select('*, track:tracks(name, country, lat, lng)')
        .eq('id', id)
        .single(),
      supabase
        .from('race_weekend_drivers')
        .select('*')
        .eq('race_weekend_id', id)
        .order('driver_name', { ascending: true }),
    ])
    if (weekendRes.error) setError(weekendRes.error.message)
    else setWeekend(weekendRes.data as RaceWeekend)
    if (!driversRes.error) setDrivers((driversRes.data ?? []) as RaceWeekendDriver[])
    setLoading(false)
  }, [id])

  useEffect(() => { void fetch() }, [fetch])

  return { weekend, drivers, loading, error, refetch: fetch }
}
