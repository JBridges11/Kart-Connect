import { useState, useEffect, useCallback } from 'react'
import type { Session } from '@/types'
import { supabase } from '@/lib/supabase'
import { cacheAll, getCached } from '@/lib/localDB'

const SESSION_SELECT = '*, track:tracks(name, country, location), kart:karts(nickname, chassis_type, driver_name, kart_class)'

export function useSessions() {
  const [data, setData] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    // Show cached data immediately while fetching
    const cached = await getCached('sessions')
    if (cached.length > 0) {
      setData(cached as unknown as Session[])
      setLoading(false)
    }

    const { data: rows, error: err } = await supabase
      .from('sessions')
      .select(SESSION_SELECT)
      .order('session_date', { ascending: false })
      .order('created_at', { ascending: true })

    if (err || !rows) {
      setOffline(true)
      if (cached.length === 0) setError('No connection — no cached data available')
    } else {
      setOffline(false)
      setError(null)
      setData(rows as Session[])
      void cacheAll('sessions', rows as unknown as Record<string, unknown>[])
    }
    setLoading(false)
  }, [])

  useEffect(() => { void fetch() }, [fetch])

  return { data, loading, error, offline, refetch: fetch }
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
      .select(SESSION_SELECT)
      .eq('id', id)
      .single()

    if (err || !row) {
      // Try cache as fallback
      const cached = await getCached('sessions')
      const match = cached.find(s => s.id === id)
      if (match) setData(match as unknown as Session)
      else setError(err?.message ?? 'Not found')
    } else {
      setData(row as Session)
      // Update this session in cache
      void cacheAll('sessions', [row as unknown as Record<string, unknown>])
    }
    setLoading(false)
  }, [id])

  useEffect(() => { void fetch() }, [fetch])

  return { data, loading, error, refetch: fetch }
}
