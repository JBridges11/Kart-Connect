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

const PROMPT = `You are reading a digital tyre pressure gauge (e.g. Prisma Electronics) showing hot kart tyre pressures after a session.

DISPLAY STRUCTURE — 2×2 grid:
  TOP-LEFT    → Front Left  (FL)
  TOP-RIGHT   → Front Right (FR)
  BOTTOM-LEFT → Rear Left   (RL)
  BOTTOM-RIGHT→ Rear Right  (RR)

Each corner has TWO stacked numbers:
  TOP number:    pressure value ← READ THIS
  BOTTOM number: ignore (often a negative like -58.xx)

7-SEGMENT LCD — how to tell 3 from 5:
  Digit 3: right-side verticals only, NO left verticals at all
  Digit 5: HAS an upper-left vertical segment
  → If the upper-left vertical segment is lit, the digit is 5, not 3.

Instructions:
1. Locate each of the four zones.
2. Read only the top number in each zone.
3. Examine each digit's segments carefully — especially distinguish 3 from 5.
4. Sanity: pressures are 5.0–50.0 (PSI or bar). Outside this = misread.

Return ONLY valid JSON, no markdown:
{"fl": <number|null>, "fr": <number|null>, "rl": <number|null>, "rr": <number|null>, "unit": "bar"|"psi"|null}`

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const authResult = await requireActiveSubscription(req)
    if (authResult instanceof Response) return authResult

    const { image, mimeType } = await req.json() as { image: string; mimeType: string }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'interleaved-thinking-2025-05-14',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 11000,
        thinking: { type: 'enabled', budget_tokens: 10000 },
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType, data: image } },
            { type: 'text', text: PROMPT },
          ],
        }],
      }),
    })

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text()
      throw new Error(`Anthropic error ${anthropicRes.status}: ${err}`)
    }

    const data = await anthropicRes.json()
    const textBlock = (data.content as Array<{ type: string; text?: string }>)
      ?.find(b => b.type === 'text')
    let text: string = textBlock?.text ?? '{}'
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()

    const result = JSON.parse(text)

    return new Response(JSON.stringify(result), {
      headers: { ...CORS, 'content-type': 'application/json' },
    })
  } catch (err) {
    console.error('scan-tyre-pressures error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS, 'content-type': 'application/json' },
    })
  }
})
