import { useState, useEffect, useCallback, useMemo } from 'react'
import type { LapTime } from '@/types'
import { supabase } from '@/lib/supabase'

export function useLapTimes(sessionId: string | null) {
  const [data, setData] = useState<LapTime[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!sessionId) return
    setLoading(true)
    const { data: rows, error: err } = await supabase
      .from('lap_times')
      .select('*')
      .eq('session_id', sessionId)
      .order('lap_number')
    if (err) setError(err.message)
    else setData((rows ?? []) as LapTime[])
    setLoading(false)
  }, [sessionId])

  useEffect(() => { void fetch() }, [fetch])

  const bestLap = useMemo(() =>
    data.length === 0 ? null : data.reduce((b, l) => l.lap_time_ms < b.lap_time_ms ? l : b),
    [data]
  )

  const averageLapMs = useMemo(() =>
    data.length === 0 ? null : Math.round(data.reduce((s, l) => s + l.lap_time_ms, 0) / data.length),
    [data]
  )

  return { data, loading, error, refetch: fetch, bestLap, averageLapMs }
}
