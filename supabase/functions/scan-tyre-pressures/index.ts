import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PROMPT = `You are analysing a photo of tyre pressure gauges taken immediately after a karting session (hot pressures).

The photo may show one or more analogue or digital pressure gauges. There may be labels, stickers, or positioning that identifies which corner of the kart each gauge belongs to: Front Left (FL), Front Right (FR), Rear Left (RL), Rear Right (RR).

Extract the pressure reading for each corner if visible. Pressures are typically in bar (e.g. 0.80–1.20 bar) or PSI (e.g. 11–18 PSI). Return the numeric value as shown on the gauge and identify the unit.

Return ONLY a valid JSON object with exactly these keys (null if not visible or unreadable):
{
  "fl": <number | null>,
  "fr": <number | null>,
  "rl": <number | null>,
  "rr": <number | null>,
  "unit": "bar" | "psi" | null
}

No explanation, no markdown, just the JSON.`

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { image, mimeType } = await req.json() as { image: string; mimeType: string }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
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
    let text: string = data.content?.[0]?.text ?? '{}'
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
