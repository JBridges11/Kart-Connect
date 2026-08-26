import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function lapTimeToMs(s: string | null | undefined): number | null {
  if (!s) return null
  const clean = s.trim()
  // Accept 0.00.00 (preferred) or 0:00.00 (legacy) — M[.:]SS.cc
  const match = clean.match(/^(\d+)[.:](\d{2})\.(\d{2})$/)
  if (match) {
    const mins   = parseInt(match[1], 10)
    const secs   = parseInt(match[2], 10)
    const centis = parseInt(match[3], 10)
    if (isNaN(mins) || isNaN(secs) || isNaN(centis)) return null
    return mins * 60000 + secs * 1000 + centis * 10
  }
  return null
}

const rateLimitMap = new Map<string, number[]>()
const RATE_LIMIT = 120
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
    const { token, slot, setup_data, selected_engine_rank, is_final } = await req.json()

    if (!token || typeof token !== 'string') {
      return new Response(JSON.stringify({ error: 'invalid_token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const slotNum = Number(slot)
    if (!slotNum || slotNum < 1 || slotNum > 8) {
      return new Response(JSON.stringify({ error: 'invalid_slot' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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

    if (!driver.token_is_active) {
      return new Response(JSON.stringify({ error: 'session_inactive' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: weekend, error: weekendErr } = await supabase
      .from('race_weekends')
      .select('*')
      .eq('id', driver.race_weekend_id)
      .single()

    if (weekendErr || !weekend || !weekend.is_live || weekend.ended_at) {
      return new Response(JSON.stringify({ error: 'session_closed' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (weekend.expires_at && new Date(weekend.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'session_closed' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const slotKey = String(slotNum)
    const now = new Date().toISOString()

    // Merge incoming setup into this slot's existing data
    const allSetupData = (driver.setup_data ?? {}) as Record<string, Record<string, unknown>>
    const existingSlot = allSetupData[slotKey] ?? {}
    const incoming = (setup_data as Record<string, unknown>) ?? {}
    const mergedSlot: Record<string, unknown> = { ...existingSlot }
    for (const [k, v] of Object.entries(incoming)) {
      if (v !== null && v !== undefined) mergedSlot[k] = v
    }
    allSetupData[slotKey] = mergedSlot

    const updatePayload: Record<string, unknown> = {
      setup_data: allSetupData,
      setup_updated_at: now,
    }
    if (selected_engine_rank !== undefined) updatePayload.selected_engine_rank = selected_engine_rank
    if (!driver.setup_started_at) updatePayload.setup_started_at = now

    await supabase.from('race_weekend_drivers').update(updatePayload).eq('token', token)

    let sessionId: string | null = null

    if (is_final) {
      const sessionIds = (driver.session_ids ?? {}) as Record<string, string>
      const existingSessionId = sessionIds[slotKey] ?? null

      if (!existingSessionId) {
        // First submission for this slot — create session
        const sessionName = `${driver.driver_name} — ${weekend.session_name} — Test ${slotNum}`
        const bestLapMs = lapTimeToMs(mergedSlot.best_lap_time as string | null)
        const { data: newSession, error: sessionErr } = await supabase
          .from('sessions')
          .insert({
            user_id: driver.manager_id,
            kart_id: driver.kart_id,
            track_id: weekend.track_id,
            session_date: weekend.session_date,
            session_type: 'race_weekend',
            session_name: sessionName,
            event_id: weekend.id,
            ...(bestLapMs                   != null && { best_lap_time_ms:    bestLapMs }),
            ...(weekend.conditions          != null && { conditions:          weekend.conditions }),
            ...(weekend.weather_description != null && { weather_description: weekend.weather_description }),
            ...(weekend.air_temp_c          != null && { air_temp_c:          weekend.air_temp_c }),
            ...(weekend.humidity_pct        != null && { humidity_pct:        weekend.humidity_pct }),
            ...(weekend.wind_speed_mph      != null && { wind_speed_mph:      weekend.wind_speed_mph }),
            ...(weekend.altitude_m          != null && { altitude_m:          weekend.altitude_m }),
          })
          .select('id')
          .single()

        if (sessionErr || !newSession) {
          return new Response(JSON.stringify({ error: 'session_create_failed' }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        sessionId = newSession.id
        sessionIds[slotKey] = sessionId
      } else {
        // Session already exists — reuse it, and update best_lap_time_ms in case the driver edited it
        sessionId = existingSessionId
        const bestLapMs = lapTimeToMs(mergedSlot.best_lap_time as string | null)
        if (bestLapMs != null) {
          await supabase.from('sessions').update({ best_lap_time_ms: bestLapMs }).eq('id', sessionId)
        }
      }

      // Build filtered setup fields (only real DB columns)
      const { session_id: _s, id: _i, created_at: _c, ...allSetupFields } = mergedSlot as Record<string, unknown>
      // Exact column names from the live setups table — any key not in this set is dropped
      const SETUP_COLUMNS = new Set([
        'chassis_type','engine_type',
        'rear_bumper','rear_width_mm','rear_hub_length_mm','third_bearing','third_bearing_type',
        'axle_height','axle_hardness','axle_length','brake_pads','brake_bias_pct',
        'rear_sprocket_teeth','engine_sprocket_teeth','sprocket_carrier_type',
        'chain_measurement','spark_plug','tape_over_rad',
        'max_rpm','low_rpm','max_engine_temp_c','low_engine_temp_c',
        'max_exhaust_temp_c','low_exhaust_temp_c',
        'main_jet','air_screw','needle_position','float_height','carb_year',
        'carb_rank','exhaust_rank','engine_number','engine_rank',
        'front_width_mm','front_hub_length_mm','right_height','camber','caster','toe','stub_axle',
        'wheel_type','tyre_make','tyre_model','tyre_condition',
        'tyre_pressure_fl','tyre_pressure_fr','tyre_pressure_rl','tyre_pressure_rr',
        'top_speed_kph','low_speed_kph',
        'hot_pressure_fl','hot_pressure_fr','hot_pressure_rl','hot_pressure_rr',
        'chassis_make','kart_driver_weight_kg',
        'torsion_bar','wheel_base',
        'seat_hardness','seat_bolts_front','seat_bolts_back','seat_stay_left','seat_stay_right',
        'best_lap_time',
      ])
      const setupFields: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(allSetupFields)) {
        if (SETUP_COLUMNS.has(k)) setupFields[k] = v
      }

      // Check whether a setup row already exists for this session
      const { data: existingSetup } = await supabase
        .from('setups')
        .select('id')
        .eq('session_id', sessionId)
        .maybeSingle()

      if (!existingSetup) {
        // Insert setup row (first time, or retry after prior failure)
        const { error: setupErr } = await supabase.from('setups').insert({
          session_id: sessionId,
          chassis_type: (setupFields.chassis_type as string) ?? '',
          engine_type: (setupFields.engine_type as string) ?? '',
          ...setupFields,
        })
        if (setupErr) {
          console.error('guest-session-save: setup insert failed:', JSON.stringify(setupErr))
          // If we just created the session, delete the orphaned shell
          if (!existingSessionId) {
            await supabase.from('sessions').delete().eq('id', sessionId)
          }
          return new Response(JSON.stringify({ error: 'setup_save_failed', detail: setupErr.message }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      } else {
        // Update existing setup with any changed fields
        const { error: setupErr } = await supabase.from('setups').update(setupFields).eq('id', existingSetup.id)
        if (setupErr) {
          console.error('guest-session-save: setup update failed:', JSON.stringify(setupErr))
          return new Response(JSON.stringify({ error: 'setup_save_failed', detail: setupErr.message }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      }

      await supabase.from('race_weekend_drivers').update({
        session_ids: sessionIds,
        setup_submitted: true,
        submitted_at: now,
        ...(driver.session_id ? {} : { session_id: sessionId }),
      }).eq('token', token)
    }

    return new Response(JSON.stringify({ success: true, updated_at: now, session_id: sessionId }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('guest-session-save error:', err)
    return new Response(JSON.stringify({ error: 'server_error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
