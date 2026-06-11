import { useState, useEffect, useCallback } from 'react'
import type { SetupChange } from '@/types'
import { supabase } from '@/lib/supabase'

export function useSetupChanges(sessionId: string | null) {
  const [data, setData] = useState<SetupChange[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!sessionId) return
    setLoading(true)
    const { data: rows } = await supabase
      .from('setup_changes')
      .select('*')
      .eq('session_id', sessionId)
      .order('timestamp')
    setData((rows ?? []) as SetupChange[])
    setLoading(false)
  }, [sessionId])

  useEffect(() => { void fetch() }, [fetch])

  return { data, loading, refetch: fetch }
}
