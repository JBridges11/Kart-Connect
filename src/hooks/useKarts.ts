import { useState, useEffect, useCallback } from 'react'
import type { Kart } from '@/types'
import { supabase } from '@/lib/supabase'
import { cacheAll, getCached } from '@/lib/localDB'

export function useKarts() {
  const [data, setData] = useState<Kart[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    const cached = await getCached('karts')
    if (cached.length > 0) {
      setData(cached as unknown as Kart[])
      setLoading(false)
    }

    const { data: rows, error: err } = await supabase
      .from('karts')
      .select('*')
      .order('nickname')

    if (err || !rows) {
      setOffline(true)
      if (cached.length === 0) setError('No connection — no cached data available')
    } else {
      setOffline(false)
      setError(null)
      setData(rows)
      void cacheAll('karts', rows as unknown as Record<string, unknown>[])
    }
    setLoading(false)
  }, [])

  useEffect(() => { void fetch() }, [fetch])

  return { data, loading, error, offline, refetch: fetch }
}

export function useKart(id: string | null) {
  const [data, setData] = useState<Kart | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    supabase.from('karts').select('*').eq('id', id).single()
      .then(async ({ data: row }) => {
        if (row) {
          setData(row)
          void cacheAll('karts', [row as unknown as Record<string, unknown>])
        } else {
          // Fallback to cache
          const cached = await getCached('karts')
          const match = cached.find(k => k.id === id)
          if (match) setData(match as unknown as Kart)
        }
        setLoading(false)
      })
  }, [id])

  return { data, loading }
}
