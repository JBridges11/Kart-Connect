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

const PROMPT = `You are analysing a karting data logger or dashboard display.

Your goal is to extract data specifically from the FASTEST/BEST lap only. If the display shows per-lap breakdowns, use only the row or section corresponding to the best lap time. If the display shows session totals or averages, ignore those and focus on the best lap figures.

Extract the following values (return null for anything not visible or unclear):
- best_lap_time: the fastest lap time as a string in "M:SS.mmm" format e.g. "1:23.456"
- max_engine_temp_c: maximum engine temperature on the best lap in Celsius (number)
- low_engine_temp_c: minimum engine temperature on the best lap in Celsius (number)
- max_exhaust_temp_c: maximum exhaust temperature on the best lap in Celsius (number)
- low_exhaust_temp_c: minimum exhaust temperature on the best lap in Celsius (number)
- max_rpm: maximum RPM on the best lap as a FULL integer (number) — see RPM note below
- low_rpm: minimum RPM on the best lap as a FULL integer (number) — see RPM note below
- top_speed: top/maximum speed value on the best lap as shown on the display (number, do not convert)
- low_speed: lowest/minimum speed value on the best lap as shown on the display (number, do not convert)
- top_speed_unit: the unit shown on the display — exactly "kph" or "mph" (string)

IMPORTANT — RPM ABBREVIATIONS:
Dashboard displays frequently abbreviate RPM values. Common formats you must expand:
  • "15.9" or "15.9k" or "15,9" in an RPM field → 15900
  • "14.2" in an RPM field → 14200
  • "12500" already full → 12500
The rule: if the displayed RPM value is below 100, it is abbreviated in thousands — multiply by 1000 to get the real value.
Kart RPM always falls between 5000 and 20000. If your reading falls outside this range, recheck — you have likely misread or missed the abbreviation.

SANITY RANGES (recheck any reading outside these):
  • Engine temp: 30°C – 200°C
  • Exhaust temp: 200°C – 800°C
  • Speed: 10 – 200 (kph or mph)
  • RPM: 5000 – 20000 (after expanding abbreviations)

Return ONLY a valid JSON object with exactly these keys. No explanation, no markdown.`

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const authResult = await requireActiveSubscription(req)
    if (authResult instanceof Response) return authResult

    const { image, mimeType } = await req.json() as { image: string; mimeType: string }
    console.log('scan-dashboard: received image, mimeType:', mimeType, 'size:', image.length)

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) {
      console.error('scan-dashboard: ANTHROPIC_API_KEY not set')
      throw new Error('ANTHROPIC_API_KEY not set')
    }
    console.log('scan-dashboard: API key found, calling Anthropic...')

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType, data: image } },
            { type: 'text', text: PROMPT },
          ],
        }],
      }),
    })

    console.log('scan-dashboard: Anthropic status:', anthropicRes.status)

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text()
      console.error('scan-dashboard: Anthropic error:', err)
      throw new Error(`Anthropic error ${anthropicRes.status}: ${err}`)
    }

    const data = await anthropicRes.json()
    let text: string = data.content?.[0]?.text ?? '{}'
    console.log('scan-dashboard: raw response:', text)
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
    const result = JSON.parse(text)

    // Server-side safety net: if RPM still came back abbreviated, expand it
    for (const key of ['max_rpm', 'low_rpm'] as const) {
      const v = (result as Record<string, unknown>)[key]
      if (typeof v === 'number' && v > 0 && v < 100) {
        (result as Record<string, unknown>)[key] = Math.round(v * 1000)
      }
    }

    console.log('scan-dashboard: parsed result:', JSON.stringify(result))

    return new Response(JSON.stringify(result), {
      headers: { ...CORS, 'content-type': 'application/json' },
    })
  } catch (err) {
    console.error('scan-dashboard: caught error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS, 'content-type': 'application/json' },
    })
  }
})
