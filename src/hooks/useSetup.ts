import { useState, useEffect, useCallback } from 'react'
import type { Setup } from '@/types'
import { supabase } from '@/lib/supabase'

export function useSetup(sessionId: string | null) {
  const [data, setData] = useState<Setup | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!sessionId) return
    setLoading(true)
    const { data: row, error: err } = await supabase
      .from('setups')
      .select('*')
      .eq('session_id', sessionId)
      .maybeSingle()
    if (err) setError(err.message)
    else setData(row as Setup | null)
    setLoading(false)
  }, [sessionId])

  useEffect(() => { void fetch() }, [fetch])

  return { data, loading, error, refetch: fetch }
}
