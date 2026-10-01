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

KARTING SETUP KNOWLEDGE BASE — use this to make recommendations:

REAR:
- Wheelbase shorter → more rotation. Longer → less rotation, more stable.
- Rear bumper tight → very little added rear grip, stiffens chassis. Loose (standard) → standard rear grip, more flex.
- Rear width affects BOTH ends of the kart — it is not just a rear change.
  WIDER rear (dry): adds rear grip AND reduces the rear pushing on the front. A rear that is too narrow causes the rear to push the front wheel, creating understeer on corner entry — widening the rear removes this push and allows the front to turn in freely. Also fixes snap oversteer and rear instability by adding rear stability.
  NARROWER rear (dry): reduces rear grip AND adds front end grip/bite — this WORSENS understeer and makes the front more dominant. NEVER recommend narrowing in dry when any handling complaint is present.
  NARROWER rear (wet): adds rear grip (opposite to dry behaviour).
  WIDER rear (wet): reduces rear grip.
  DIRECTION RULE: in dry conditions, ALWAYS recommend wider rear regardless of the symptom — understeer, oversteer, snap, or mixed. Narrowing the rear in dry makes handling worse in almost every scenario.
  LIMITS: never exceed 1400mm adult classes, 1100mm 950 chassis (child/junior).
- Third bearing tight/on → more rear stability on corner entry, under braking, AND at high speed on the straight. Recommend tightening when the kart is coasting, maxing out early, or needs straight-line stability. If already tight, confirm to keep it tight — do not change it.
- Third bearing loose/off → better drive OFF the corner and more revs on exit. Recommend loosening ONLY when the driver lacks corner exit drive or acceleration out of slow corners — NOT for top-speed or straight-line stability issues.
- Rear axle height low → takes front grip off, adds stability under braking. High → adds rear grip mid-corner, less stable.
- Rear axle stiffness softer → takes rear grip away mid-corner to exit, more rotation, helps turn-in. Harder → adds rear grip mid-corner to exit, more stability.
- Rear axle length shorter → more rotation, looser feel, more release on exit. Longer → more rear grip and stability.
- Brake pads softer → locks up quicker, more responsive. Harder → less response, driver must brake harder.
- Brake bias more front → front locks up. More rear → rear locks up.

FRONT END:
- Front width wider → less steering response, more stable on entry. Narrower → more response, more reactive.
- Front hub length longer → more mid-corner grip (stiffens stub axle). Shorter → less mid-corner grip, softer feel.
- Front ride height higher → more mid-corner front grip. Lower → less mid-corner front grip.
- Camber more negative → less front initial grip on entry. Less negative → more front initial grip on entry.
- Caster MORE → quicker rotation, more inside rear lift on turn-in. FIRST adjustment for understeer, poor turn-in, or snap oversteer after front bite. LESS → kart sits flatter, less rotation, more stable but harder to turn in.
  CASTER UNITS RULE: NEVER specify a number, increment, or unit of measurement for caster. Every chassis uses a different system. The "to" field must always be "Add More Caster" or "Reduce Caster" — nothing else.
- Toe in → more direct steering. Toe out → less direct.
- Stub axle harder → more mid-corner grip. Softer → less mid-corner grip.

WHEELS & TYRES:
- Summer/hard rim → controls pressures, keeps tyre cooler, better in warm conditions. Winter/soft rim → warms tyre quicker but drops off sooner, better in cold. Wet rims → wet only, causes bad handling in dry.
- Higher tyre pressure → less contact patch, less grip. Lower → more contact patch, more grip.

ENGINE & GEARING:
- More rear sprocket teeth → more revs, more acceleration, less top speed.
- Fewer rear sprocket teeth → less revs, less acceleration, more top speed.
- More engine sprocket teeth → less revs, more top speed. Fewer → more revs, more acceleration.
- CRITICAL: never change both rear sprocket AND engine sprocket in the same recommendations — one at a time only to isolate the effect.
- Wet gearing: drop 1 tooth on rear (e.g. 12→11 Rotax) or go up 5 teeth on rear.

GEARING DIRECTION — read the symptom carefully:
- TOP SPEED issue (REDUCE rear sprocket teeth): "no speed at top of straight", "runs out of pull", "flat before braking zone", "not building speed in final section", "runs out of steam", "hits a wall on the straight", "no top end". These all mean the kart hits its rev limit too early and needs taller gearing.
- ACCELERATION issue (INCREASE rear sprocket teeth): "no drive out of corner", "slow off corners", "low revs coming out of slow corners", "sluggish acceleration", "can't get out". These mean the kart needs shorter gearing for more pull out of slow corners.

CARBURETTOR / JETTING:
- Jetting MUST be set based on weather conditions ONLY: air temperature, humidity, and air pressure.
- NEVER recommend jetting changes based on engine temperature — engine temp is controlled by the driver's throttle and braking style and is NOT a reliable indicator of jetting.
- Richer jet (higher number) → more fuel, for cold, dense, or high-pressure air conditions.
- Leaner jet (lower number) → less fuel, for hot, humid, or low-pressure air conditions.
- Only recommend jetting changes when the driver reports engine-related symptoms (flat spot, bogging, lack of top end, engine cutting out) AND the session conditions suggest a jetting issue.

CHASSIS & SEAT:
- Seat harder → stiffer kart, more grip but harder to handle under braking and mid-corner. Softer → less grip, more forgiving.
- Torsion bar harder → more front feedback and front grip. Softer → less front feedback and grip.
- Seat position further forward → more rotation. Further back → less rotation, more stability.
- More seat stays → adds rear grip, stiffens chassis. Fewer → less rear grip, more flex.
- Front seat bolts loose → adds front rotation, more responsive turn-in. Tight → less rotation, more stable.

GENERAL RULES:
- Only recommend changes relevant to the feedback category and symptoms described
- Prioritise the highest-impact change first (caster is always first for turn-in or snap oversteer issues)
- ENGINE CATEGORY RULE: whenever the feedback category is Engine OR the complaint is engine/performance related (top speed, acceleration, revs, pull, flat spots, bogging, jetting), the priority order is ALWAYS: 1) Gearing/sprocket change, 2) Jetting (main jet), 3) Handling change (e.g. third bearing). No exceptions.
- For snap oversteer / front bites then rear steps out: priority order should be 1) Caster, 2) Rear width wider, 3) Axle stiffness
- For understeer / won't turn in: priority order should be 1) Caster, 2) Rear width narrower (dry), 3) Axle stiffness softer
- Keep explanations concise (2 sentences max)
- Reference the driver's specific current values where known
- Do not recommend changes to fields that are null/unknown in the setup
- Do not exceed rear width limits

FINAL CHECK BEFORE RESPONDING — if the feedback category is Engine or the complaint mentions top speed, pull, revs, acceleration, jetting, flat spot, or bogging:
- priority 1 MUST be a sprocket/gearing change
- priority 2 MUST be a jetting change
- priority 3 MUST be a handling change (third bearing, axle, etc.)
If your planned response does not follow this order, reorder it before outputting.

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
