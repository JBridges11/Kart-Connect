import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function requireActiveSubscription(req: Request): Promise<{ userId: string } | Response> {
  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '').trim()
  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
  const { data: { user }, error } = await admin.auth.getUser(token)
  if (error || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
  const { data: sub } = await admin
    .from('subscriptions')
    .select('status, trial_end')
    .eq('user_id', user.id)
    .maybeSingle()
  const isActive =
    sub?.status === 'active' ||
    (sub?.status === 'trialing' && sub?.trial_end != null && new Date(sub.trial_end) > new Date())
  if (!isActive) {
    return new Response(JSON.stringify({ error: 'Subscription required' }), {
      status: 403, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
  return { userId: user.id }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const authResult = await requireActiveSubscription(req)
    if (authResult instanceof Response) return authResult

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
Seat hardness: ${setup.seat_hardness ?? '—'} | Seat position: ${setup.seat_position ?? '—'}
Torsion bar: ${setup.torsion_bar ?? '—'}
Left seat stay: ${setup.seat_stay_left ?? '—'} | Right seat stay: ${setup.seat_stay_right ?? '—'}
Front seat bolts: ${setup.seat_bolts_front ?? '—'} | Rear seat bolts: ${setup.seat_bolts_rear ?? '—'}
Bodywork: ${setup.bodywork ?? '—'}
Max RPM: ${setup.max_rpm ?? '—'} | Top speed: ${setup.top_speed_kph ?? '—'} km/h
Max engine temp: ${setup.max_engine_temp_c ?? '—'}°C | Max exhaust temp: ${setup.max_exhaust_temp_c ?? '—'}°C
`.trim()

    const sessionSummary = `
Conditions: ${session?.conditions ?? '—'} | Weather: ${session?.weather_description ?? '—'}
Air temp: ${session?.air_temp_c ?? '—'}°C | Humidity: ${session?.humidity_pct ?? '—'}%
Best lap: ${session?.best_lap_time_ms ? (session.best_lap_time_ms / 1000).toFixed(3) + 's' : '—'}
`.trim()

    const prompt = `You are a karting setup engineer. Your job is to read the driver's feedback phrase and output ONLY the pre-defined recommendations for that exact phrase. Do not use general karting knowledge. Do not improvise.

CURRENT SETUP:
${setupSummary}

SESSION CONDITIONS:
${sessionSummary}

DRIVER FEEDBACK (category: ${category}):
${feedback}

━━━ STEP 1: MATCH THE FEEDBACK TO A RULE BELOW ━━━

Find the exact feedback phrase below and output ONLY those recommendations in that exact order.
If a field is null or not recorded, use "Not set" as the from value — still make the recommendation.

── BRAKING ──
"Locking front under braking"
  1) Add more rear brake bias — from: current brake_bias_pct or "Not set", to: "Add 1 rotation toward rear brake"

"Locking rear under braking"
  1) Add more front brake bias — from: current brake_bias_pct or "Not set", to: "Add 1 rotation toward front brake"

"Rear stepping out under braking dry"
  1) Tighten third bearing — from: current third_bearing, to: Tight/On
  2) Lower rear axle height — from: current axle_height, to: one click lower

"Brakes feel unresponsive"
  1) Check brake pads — change: "Check brake pads", from: "Maintenance required" (ALWAYS use this exact string, never the pad compound), to: "Inspect and replace if worn", explanation: worn pads reduce braking response
  2) Bleed brake system — change: "Bleed brake system", from: "Maintenance required", to: "Bleed brake system", explanation: check with chassis manufacturer for correct brake fluid
  3) Raise brake bar — change: "Raise brake bar", from: "Current position", to: "Raise towards top hole", explanation: shorter pedal travel — driver comfort only, does not affect braking performance

"When I lock up the rear slides"
  1) Harder brake pads — from: current brake_pads or "Not set", to: next harder compound
  2) Lower brake bar — change: "Lower brake bar", from: "Current position", to: "Lower towards bottom hole", explanation: longer pedal travel — driver comfort only, does not affect kart setup

── HANDLING ──
"Front won't turn in"
  1) Add more caster
  2) Widen rear width by 5mm

"Rear slides on entry"
  1) Narrow rear width by 5mm
  2) Add seat stays — from: "Left: [left stay], Right: [right stay]", to: "Left: [+1 step], Right: [+1 step]"
  3) Lower rear axle height 1 position

"Kart feels nervous on turn-in"
  1) Widen front width by 5mm
  2) Add more toe out — from: current toe, to: add more toe out
  3) Add more negative camber on front

"Inside rear won't lift"
  1) Add more caster

"Too much rotation on entry"
  1) Widen front width by 5mm
  2) Softer torsion bar 1 step
  3) Add more negative camber on front

"I have a lot of steering input at the apex and then rear steps out"
  1) Add more caster
  2) Widen rear width by 5mm
  3) Lower front ride height 1 position

"Front pushes on then I go wide mid corner"
  1) Widen rear width by 5mm
  2) Add more caster
  3) Widen front width by 5mm

"Kart feels flat and unresponsive"
  1) Add more caster

"Rear slides continuously through corner"
  1) Widen rear width by 5mm
  2) Add more negative camber on front
  3) Lower front ride height 1 position

"Front and rear both sliding"
  1) Lower tyre pressure by 1 PSI (±0.07 bar) on all tyres (dry) or 2 PSI (±0.14 bar) in wet

"Inside rear dragging through corner"
  1) Add more caster
  2) Add seat stays — from: "Left: [left stay], Right: [right stay]", to: "Left: [+1 step], Right: [+1 step]"

"Kart bouncing mid-corner"
  1) Reduce caster
  2) Widen rear width by 5mm
  3) Add more negative camber on front

"Too much rotation at apex"
  1) Reduce caster
  2) Narrow rear width by 5mm
  3) Softer torsion bar 1 step

"Can't get heat into tyres"
  1) Add 1 PSI (±0.07 bar) to all tyres

── WET CONDITIONS ──
"No front grip in wet"
  1) Add more caster
  2) Raise front ride height 1 position
  3) Add 2 PSI (±0.14 bar) to all tyres

"Rear stepping out on every corner in wet"
  1) Reduce caster
  2) Widen front width by 5mm
  3) Tighten rear bumper

"Can't get heat into tyres in wet"
  1) Add 2 PSI (±0.14 bar) to all tyres
  2) Tighten bodywork — from: current bodywork, to: Tight
  3) Add more caster

"Inside rear not lifting in wet"
  1) Add more caster
  2) Raise front ride height 1 position
  3) Raise rear axle height 1 position

"Not enough rotation in the wet"
  1) Raise rear axle height 1 position
  2) Add more caster
  3) Narrow rear width by 5mm

── STRAIGHT / ENGINE ──
"No top-end speed"
  1) Lower rear sprocket by 1 tooth — from: current rear_sprocket_teeth or "Not set", to: current - 1 teeth
  2) Leaner main jet — from: current main_jet or "Not set", to: down 1 jet size, explanation: "A leaner main jet restricts fuel flow when you push the gas pedal past three-quarter throttle. By letting less fuel mix with the incoming air, it creates a leaner air-to-fuel ratio that burns hotter and faster, boosting your top-end speed and horsepower down the straights."

"Engine hitting limiter too early"
  1) Lower rear sprocket by 1 tooth — from: current rear_sprocket_teeth or "Not set", to: current - 1 teeth

"Good exit but losing ground mid-straight"
  1) Richer main jet — from: current main_jet or "Not set", to: up 1 jet size
  2) Lower rear sprocket by 1 tooth — from: current rear_sprocket_teeth or "Not set", to: current - 1 teeth

"Kart feels slow despite flat throttle"
  1) Richer main jet — from: current main_jet or "Not set", to: up 1 jet size
  2) Richer needle position — from: current needle_position or "Not set", to: move clip 1 position lower (higher clip number = richer)
  3) Higher rear sprocket — change: "Higher rear sprocket", from: current rear_sprocket_teeth or "Not set", to: current + 1 teeth

"Wheelspin out of slow corners"
  1) Lower rear sprocket by 1 tooth — from: current rear_sprocket_teeth or "Not set", to: current - 1 teeth
  2) Narrow rear width by 5mm — from: current rear_width_mm or "Not set", to: current - 5mm
  3) Lower throttle cable — change: "Lower throttle cable", from: "Current position", to: "Move throttle cable lower on pedal", explanation: longer travel, smoother throttle response — driver comfort only

"No initial drive off the apex"
  1) Higher rear sprocket — change: "Higher rear sprocket", from: current rear_sprocket_teeth or "Not set", to: current + 1 teeth
  2) Shorter rear axle — from: current axle_length or "Not set", to: one step shorter
  3) Richer main jet — from: current main_jet or "Not set", to: up 1 jet size

"Good top end but poor initial acceleration"
  1) Richer main jet — from: current main_jet or "Not set", to: up 1 jet size
  2) Richer needle position — from: current needle_position or "Not set", to: move clip 1 position lower
  3) Higher rear sprocket — change: "Higher rear sprocket", from: current rear_sprocket_teeth or "Not set", to: current + 1 teeth

━━━ STEP 2: APPLY THESE RULES TO YOUR RESPONSE ━━━

BOUNDARY RULES — check current values before recommending:
- Torsion bar sequence: None → Soft → Med → Hard. Do not recommend beyond the ends.
- Axle length sequence: Short → Medium → Long. Do not recommend shorter than Short or longer than Long. If already at the limit in the recommended direction, mark confirmed: true, to: "Keep as is".
- Seat stays sequence: None → 1 → 2. Do not recommend beyond the ends.
- Seat position sequence: Back 20mm → Back 10mm → Standard → Forward 10mm → Forward 20mm.
- Front seat bolts: Loose ↔ Tight. Bodywork: Loose ↔ Tight. Rear bumper: Loose ↔ Tight.
- Needle position sequence (richest→leanest): 5 → 4 → 3 → 2 → 1.
- Tyre pressure limits DRY: min 5 PSI (0.34 bar), max 18 PSI (1.24 bar). WET: min 10 PSI (0.69 bar), max 35 PSI (2.41 bar).
- Rear width limits: max 1400mm adult, max 1100mm 950/junior chassis.
- If driver is already at the limit in the recommended direction, mark that item "confirmed": true, "to": "Keep as is".

FORMATTING RULES:
- Caster: "change" must be "Add more caster" or "Reduce caster". "from" must always be "Current caster setting". "to" must always be "Add more caster" or "Reduce caster". Never use numbers, blocks, clicks, forward, backward, or any chassis-specific units for caster.
- "Check brake pads" recommendation: the "from" field must ALWAYS be exactly "Maintenance required". Never output the brake pad compound (Hard, Soft, Medium, or any other compound name) as the "from" value for this recommendation — it is a wear check, not a compound change.
- Leaner main jet recommendation: the explanation must ALWAYS be exactly: "A leaner main jet restricts fuel flow when you push the gas pedal past three-quarter throttle. By letting less fuel mix with the incoming air, it creates a leaner air-to-fuel ratio that burns hotter and faster, boosting your top-end speed and horsepower down the straights."
- Sprocket recommendations: never mention "top gear" in the explanation — karts are single-speed and have no gears.
- Camber: always say "Add more negative camber" or "Reduce negative camber" — never a number.
- Rear/front width: state exact mm (e.g. 1380mm → 1385mm). Include: "Note: 950 chassis max 1100mm, adult max 1400mm."
- Sprocket: state exact tooth count (e.g. 82T → 81T).
- Tyre pressure: the "from" field must be EXACTLY the string "Current pressures" — nothing else, no corner values, no numbers, no parentheses. The "to" field must be EXACTLY "−X PSI all round" or "+X PSI all round" — no corner values, no individual FL/FR/RL/RR numbers, no bar value in the to field. Bar equivalent goes in the explanation only. Any output containing FL, FR, RL or RR in the from or to fields is wrong.
- Keep explanations to 2 sentences max.
- Seat stays recommendation: single card covering both sides — from: "Left: X, Right: Y", to: "Left: X+1, Right: Y+1".

For each recommendation, set "confirmed": true if the setup is ALREADY at the optimal setting for this symptom (e.g. caster is already at maximum, rear width is already at the ideal point, third bearing is already in the correct position). In that case, still include the recommendation — but mark it confirmed and write the explanation to confirm the current value is correct and explain why. Set "confirmed": false when the driver should actually make a change.

Respond with ONLY valid JSON in this exact format — no markdown, no explanation. The recommendations array may contain 1, 2, or 3 items — never more than 3, never 0:
{
  "recommendations": [
    {
      "priority": 1,
      "change": "Short title e.g. Reduce rear width",
      "from": "current value as shown",
      "to": "recommended value or 'Keep as is'",
      "explanation": "Why this change addresses the feedback and what it will do.",
      "confirmed": false
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
