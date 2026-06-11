import { useState, useEffect, useCallback } from 'react'
import type { Session } from '@/types'
import { supabase } from '@/lib/supabase'

export function useSessions() {
  const [data, setData] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data: rows, error: err } = await supabase
      .from('sessions')
      .select('*, track:tracks(name, country), kart:karts(nickname, chassis_type)')
      .order('session_date', { ascending: false })
      .order('created_at', { ascending: true })
    if (err) setError(err.message)
    else setData((rows ?? []) as Session[])
    setLoading(false)
  }, [])

  useEffect(() => { void fetch() }, [fetch])

  return { data, loading, error, refetch: fetch }
}

export function useSession(id: string | null) {
  const [data, setData] = useState<Session | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const { data: row, error: err } = await supabase
      .from('sessions')
      .select('*, track:tracks(name, country), kart:karts(nickname, chassis_type)')
      .eq('id', id)
      .single()
    if (err) setError(err.message)
    else setData(row as Session)
    setLoading(false)
  }, [id])

  useEffect(() => { void fetch() }, [fetch])

  return { data, loading, error, refetch: fetch }
}
