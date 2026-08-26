import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PROMPT = `You are analysing a karting data logger or dashboard display.

Your goal is to extract data specifically from the FASTEST/BEST lap only. If the display shows per-lap breakdowns, use only the row or section corresponding to the best lap time. If the display shows session totals or averages, ignore those and focus on the best lap figures.

Extract the following values (return null for anything not visible or unclear):
- best_lap_time: the fastest lap time as a string in "M:SS.mmm" format e.g. "1:23.456"
- max_engine_temp_c: maximum engine temperature on the best lap in Celsius (number)
- low_engine_temp_c: minimum engine temperature on the best lap in Celsius (number)
- max_exhaust_temp_c: maximum exhaust temperature on the best lap in Celsius (number)
- low_exhaust_temp_c: minimum exhaust temperature on the best lap in Celsius (number)
- max_rpm: maximum RPM on the best lap (number)
- low_rpm: minimum RPM on the best lap (number)
- top_speed: top/maximum speed value on the best lap as shown on the display (number, do not convert)
- low_speed: lowest/minimum speed value on the best lap as shown on the display (number, do not convert)
- top_speed_unit: the unit shown on the display — exactly "kph" or "mph" (string)

Return ONLY a valid JSON object with exactly these keys. No explanation, no markdown.`

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
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
