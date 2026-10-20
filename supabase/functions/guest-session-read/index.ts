import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const rateLimitMap = new Map<string, number[]>()
const RATE_LIMIT = 60
const RATE_WINDOW_MS = 60 * 60 * 1000

function isRateLimited(token: string): boolean {
  const now = Date.now()
  const hits = (rateLimitMap.get(token) ?? []).filter(t => now - t < RATE_WINDOW_MS)
  hits.push(now)
  rateLimitMap.set(token, hits)
  return hits.length > RATE_LIMIT
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { token } = await req.json()
    if (!token || typeof token !== 'string') {
      return new Response(JSON.stringify({ error: 'invalid_token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (isRateLimited(token)) {
      return new Response(JSON.stringify({ error: 'rate_limited' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: driver, error: driverErr } = await supabase
      .from('race_weekend_drivers')
      .select('*')
      .eq('token', token)
      .single()

    if (driverErr || !driver) {
      return new Response(JSON.stringify({ error: 'invalid_token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: weekend, error: weekendErr } = await supabase
      .from('race_weekends')
      .select('*')
      .eq('id', driver.race_weekend_id)
      .single()

    if (weekendErr || !weekend) {
      return new Response(JSON.stringify({ error: 'invalid_token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: track } = await supabase
      .from('tracks')
      .select('name')
      .eq('id', weekend.track_id)
      .single()

    if (!weekend.went_live_at) {
      return new Response(JSON.stringify({ error: 'not_live_yet' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (weekend.ended_at || !driver.token_is_active) {
      return new Response(JSON.stringify({ error: 'session_ended' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (weekend.expires_at && new Date(weekend.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'session_expired' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Build slot data (8 slots)
    const rawSetupData = (driver.setup_data ?? {}) as Record<string, Record<string, unknown>>
    const sessionIds = (driver.session_ids ?? {}) as Record<string, string>
    const slots: Record<string, { setup: Record<string, unknown> | null; submitted: boolean }> = {}
    for (let i = 1; i <= 8; i++) {
      const key = String(i)
      slots[key] = {
        setup: rawSetupData[key] ?? null,
        submitted: !!sessionIds[key],
      }
    }

    // Find the last submitted setup for this kart from any previous race weekend
    let previous_setup: Record<string, unknown> | null = null
    if (driver.kart_id) {
      const { data: prevDrivers } = await supabase
        .from('race_weekend_drivers')
        .select('setup_data, session_ids, created_at')
        .eq('kart_id', driver.kart_id)
        .neq('id', driver.id)
        .not('setup_data', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10)

      if (prevDrivers?.length) {
        for (const prev of prevDrivers) {
          const prevSetupData = (prev.setup_data ?? {}) as Record<string, Record<string, unknown>>
          const prevSessionIds = (prev.session_ids ?? {}) as Record<string, string>

          // Prefer the last *submitted* slot; fall back to any slot with data
          const submittedSlots = Object.keys(prevSessionIds).map(Number).filter(n => !isNaN(n)).sort((a, b) => b - a)
          const allSlots = Object.keys(prevSetupData).map(Number).filter(n => !isNaN(n)).sort((a, b) => b - a)
          const lastSlot = String(submittedSlots[0] ?? allSlots[0] ?? '')

          if (lastSlot && prevSetupData[lastSlot]) {
            previous_setup = prevSetupData[lastSlot]
            break
          }
        }
      }
    }

    return new Response(JSON.stringify({
      driver_name: driver.driver_name,
      driver_class: driver.driver_class,
      kart_make: driver.kart_make,
      kart_model: driver.kart_model,
      chassis_number: driver.chassis_number,
      chassis_stiffness: driver.chassis_stiffness,
      engines: driver.engines_snapshot ?? [],
      track_name: track?.name ?? 'Unknown Track',
      session_name: weekend.session_name,
      session_date: weekend.session_date,
      session_type: weekend.session_type,
      weekend_format: weekend.weekend_format ?? null,
      expires_at: weekend.expires_at,
      slots,
      previous_setup,
      pressure_unit: weekend.pressure_unit ?? 'bar',
      alt_unit:      weekend.alt_unit      ?? 'm',
      temp_unit:     weekend.temp_unit     ?? 'c',
      speed_unit:    weekend.speed_unit    ?? 'kph',
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('guest-session-read error:', err)
    return new Response(JSON.stringify({ error: 'server_error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
