import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'npm:stripe'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '') ?? ''

    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    let userId: string
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      userId = payload.sub
      console.log('[verify] user:', userId)
    } catch (e) {
      console.error('[verify] JWT decode failed:', e)
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { session_id } = await req.json() as { session_id: string }
    if (!session_id) {
      return new Response(JSON.stringify({ error: 'Missing session_id' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }
    console.log('[verify] session_id:', session_id)

    const session = await stripe.checkout.sessions.retrieve(session_id)
    console.log('[verify] session.subscription:', session.subscription)

    if (!session.subscription) {
      return new Response(JSON.stringify({ error: 'No subscription on session' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const sub = await stripe.subscriptions.retrieve(session.subscription as string)
    const tier = (sub.metadata?.tier as string) ?? 'privateer'
    console.log('[verify] sub status:', sub.status, 'tier:', tier)

    const rawEnd = sub.current_period_end as number | null | undefined
    const periodEnd = rawEnd ? new Date(rawEnd * 1000).toISOString() : null

    const { error: upsertErr } = await adminClient
      .from('subscriptions')
      .upsert({
        user_id: userId,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: sub.id,
        status: sub.status,
        tier,
        ...(periodEnd ? { current_period_end: periodEnd } : {}),
      }, { onConflict: 'user_id' })

    if (upsertErr) {
      console.error('[verify] upsert error:', upsertErr.message)
      return new Response(JSON.stringify({ error: upsertErr.message }), {
        status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    console.log('[verify] upsert success')
    return new Response(JSON.stringify({ ok: true, tier, status: sub.status }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[verify] caught error:', (err as Error).message)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
