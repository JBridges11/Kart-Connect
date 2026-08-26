import { useState, useEffect, useCallback } from 'react'
import type { Track } from '@/types'
import { supabase } from '@/lib/supabase'
import { cacheAll, getCached } from '@/lib/localDB'

export function useTracks() {
  const [data, setData] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    const cached = await getCached('tracks')
    if (cached.length > 0) {
      setData(cached as unknown as Track[])
      setLoading(false)
    }

    const { data: rows, error: err } = await supabase
      .from('tracks')
      .select('*')
      .order('name')

    if (err || !rows) {
      setOffline(true)
      if (cached.length === 0) setError('No connection — no cached data available')
    } else {
      setOffline(false)
      setError(null)
      setData(rows)
      void cacheAll('tracks', rows as unknown as Record<string, unknown>[])
    }
    setLoading(false)
  }, [])

  useEffect(() => { void fetch() }, [fetch])

  return { data, loading, error, offline, refetch: fetch }
}

export function useTrack(id: string | null) {
  const [data, setData] = useState<Track | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    supabase.from('tracks').select('*').eq('id', id).single()
      .then(async ({ data: row }) => {
        if (row) {
          setData(row)
          void cacheAll('tracks', [row as unknown as Record<string, unknown>])
        } else {
          const cached = await getCached('tracks')
          const match = cached.find(t => t.id === id)
          if (match) setData(match as unknown as Track)
        }
        setLoading(false)
      })
  }, [id])

  return { data, loading }
}
