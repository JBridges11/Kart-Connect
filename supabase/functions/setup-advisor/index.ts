import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { setup, feedback, category, session } = await req.json()

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')

    const setupSummary = `
Chassis: ${setup.chassis_type ?? '—'} | Engine: ${setup.engine_type ?? '—'}
Rear width: ${setup.rear_width_mm ?? '—'}mm | Rear hub: ${setup.rear_hub_length_mm ?? '—'}mm
Third bearing: ${setup.third_bearing ? `Yes (${setup.third_bearing_type ?? '—'})` : 'No'}
Axle carrier height: ${setup.axle_height ?? '—'} | Axle hardness: ${setup.axle_hardness ?? '—'} | Axle length: ${setup.axle_length ?? '—'}
Rear bumper: ${setup.rear_bumper ?? '—'}
Brake pads: ${setup.brake_pads ?? '—'} | Brake bias: ${setup.brake_bias_pct ?? '—'}%
Front width: ${setup.front_width_mm ?? '—'}mm | Front hub: ${setup.front_hub_length_mm ?? '—'}mm
Right height: ${setup.right_height ?? '—'} | Camber: ${setup.camber ?? '—'}° | Caster: ${setup.caster ?? '—'}° | Toe: ${setup.toe ?? '—'}
Stub axle: ${setup.stub_axle ?? '—'}
Tyre: ${setup.tyre_make ?? '—'} ${setup.tyre_model ?? '—'} | Wheel type: ${setup.wheel_type ?? '—'}
Cold pressures: FL ${setup.tyre_pressure_fl ?? '—'} | FR ${setup.tyre_pressure_fr ?? '—'} | RL ${setup.tyre_pressure_rl ?? '—'} | RR ${setup.tyre_pressure_rr ?? '—'}
Rear sprocket: ${setup.rear_sprocket_teeth ?? '—'}T | Engine sprocket: ${setup.engine_sprocket_teeth ?? '—'}T | Carrier: ${setup.sprocket_carrier_type ?? '—'}
Main jet: ${setup.main_jet ?? '—'} | Air screw: ${setup.air_screw ?? '—'} | Needle: ${setup.needle_position ?? '—'}
Seat hardness: ${setup.seat_hardness ?? '—'} | Seat stay L: ${setup.seat_stay_left ?? '—'} | Seat stay R: ${setup.seat_stay_right ?? '—'}
Max RPM: ${setup.max_rpm ?? '—'} | Top speed: ${setup.top_speed_kph ?? '—'} km/h
Max engine temp: ${setup.max_engine_temp_c ?? '—'}°C | Max exhaust temp: ${setup.max_exhaust_temp_c ?? '—'}°C
`.trim()

    const sessionSummary = `
Conditions: ${session?.conditions ?? '—'} | Weather: ${session?.weather_description ?? '—'}
Air temp: ${session?.air_temp_c ?? '—'}°C | Humidity: ${session?.humidity_pct ?? '—'}%
Best lap: ${session?.best_lap_time_ms ? (session.best_lap_time_ms / 1000).toFixed(3) + 's' : '—'}
`.trim()

    const prompt = `You are an expert karting setup engineer with deep knowledge of chassis tuning, tyre management, and engine mapping across all kart classes.

A driver has completed a session and needs setup advice. Analyse their current setup and feedback, then give exactly 3 setup change recommendations in priority order.

CURRENT SETUP:
${setupSummary}

SESSION CONDITIONS:
${sessionSummary}

DRIVER FEEDBACK (category: ${category}):
${feedback}

KARTING RULES — follow these exactly:
GEARING:
- More rear sprocket teeth = shorter gearing = MORE acceleration, LESS top speed
- Fewer rear sprocket teeth = taller gearing = LESS acceleration, MORE top speed
- More engine sprocket teeth = taller gearing = LESS acceleration, MORE top speed
- Fewer engine sprocket teeth = shorter gearing = MORE acceleration, LESS top speed
- To improve acceleration out of corners → INCREASE rear sprocket teeth OR DECREASE engine sprocket teeth
- To improve top speed → DECREASE rear sprocket teeth OR INCREASE engine sprocket teeth
- CRITICAL: NEVER recommend changing both rear sprocket AND engine sprocket in the same set of recommendations — always change only ONE sprocket at a time so you can isolate the effect. The only exception is if the resulting ratio is essentially identical and you are only adjusting for chain length.

HANDLING:
- Wider rear width = more rear grip, more stability, less rotation
- Narrower rear width = less rear grip, more rotation, more responsive
- Higher axle = more mechanical jacking = more rear lift = less rear grip = more rotation
- Lower axle = less mechanical jacking = more rear grip = more stability
- Harder axle = stiffer chassis = more responsive but can cause understeer on smooth tracks
- Softer axle = more flex = better on bumpy tracks
- Third bearing ON = stiffer chassis = less flex
- More caster = more self-centring, more stability but can cause understeer
- Less caster = less self-centring, more responsive steering
- Higher tyre pressure = less contact patch = less grip
- Lower tyre pressure = more contact patch = more grip

GENERAL RULES:
- Only recommend changes relevant to the feedback
- Prioritise changes most likely to have the biggest impact first
- Keep explanations concise (2 sentences max)
- Reference specific current values where known
- Do not recommend changes to fields that are null/unknown in the setup

Respond with ONLY valid JSON in this exact format — no markdown, no explanation:
{
  "recommendations": [
    {
      "priority": 1,
      "change": "Short title e.g. Reduce rear width",
      "from": "current value as shown",
      "to": "recommended value",
      "explanation": "Why this change addresses the feedback and what it will do."
    },
    {
      "priority": 2,
      "change": "...",
      "from": "...",
      "to": "...",
      "explanation": "..."
    },
    {
      "priority": 3,
      "change": "...",
      "from": "...",
      "to": "...",
      "explanation": "..."
    }
  ]
}`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Anthropic error ${res.status}: ${err}`)
    }

    const data = await res.json()
    let text: string = data.content?.[0]?.text ?? '{}'
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
    const result = JSON.parse(text)

    return new Response(JSON.stringify(result), {
      headers: { ...CORS, 'content-type': 'application/json' },
    })
  } catch (err) {
    console.error('setup-advisor error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS, 'content-type': 'application/json' },
    })
  }
})
