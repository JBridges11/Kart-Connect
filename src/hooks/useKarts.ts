import { useState, useEffect, useCallback } from 'react'
import type { Kart } from '@/types'
import { supabase } from '@/lib/supabase'

export function useKarts() {
  const [data, setData] = useState<Kart[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data: rows, error: err } = await supabase
      .from('karts')
      .select('*')
      .order('nickname')
    if (err) setError(err.message)
    else setData(rows ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { void fetch() }, [fetch])

  return { data, loading, error, refetch: fetch }
}

export function useKart(id: string | null) {
  const [data, setData] = useState<Kart | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    supabase.from('karts').select('*').eq('id', id).single()
      .then(({ data: row }) => {
        setData(row)
        setLoading(false)
      })
  }, [id])

  return { data, loading }
}
