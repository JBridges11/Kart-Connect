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
    console.log('[checkout] request received')

    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '') ?? ''
    console.log('[checkout] token present:', token.length > 0)

    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Decode JWT payload to get user ID (Supabase signs all JWTs)
    let userId: string
    let userEmail: string | undefined
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      userId = payload.sub
      userEmail = payload.email
      console.log('[checkout] user:', userId)
    } catch (e) {
      console.error('[checkout] JWT decode failed:', e)
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Use service role for all DB operations
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { tier = 'privateer', interval = 'month' } = await req.json().catch(() => ({})) as { tier?: string; interval?: string }
    const PRICE_IDS: Record<string, Record<string, string | undefined>> = {
      privateer: {
        month: Deno.env.get('STRIPE_PRICE_ID_PRIVATEER'),
        year:  Deno.env.get('STRIPE_PRICE_ID_PRIVATEER_ANNUAL'),
      },
      team: {
        month: Deno.env.get('STRIPE_PRICE_ID_TEAM'),
        year:  Deno.env.get('STRIPE_PRICE_ID_TEAM_ANNUAL'),
      },
      pro_team: {
        month: Deno.env.get('STRIPE_PRICE_ID_PRO_TEAM'),
        year:  Deno.env.get('STRIPE_PRICE_ID_PRO_TEAM_ANNUAL'),
      },
    }
    const priceId = PRICE_IDS[tier]?.[interval] ?? PRICE_IDS[tier]?.['month']
    console.log('[checkout] tier:', tier, 'interval:', interval, 'priceId:', priceId)

    if (!priceId) {
      return new Response(JSON.stringify({ error: `Unknown tier or missing price ID: ${tier}` }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const { data: sub } = await adminClient
      .from('subscriptions')
      .select('stripe_customer_id, has_trialed')
      .eq('user_id', userId)
      .single()

    let customerId = sub?.stripe_customer_id as string | null
    const hasTrialed = !!(sub as any)?.has_trialed

    if (!customerId) {
      console.log('[checkout] creating stripe customer')
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { supabase_user_id: userId },
      })
      customerId = customer.id
      await adminClient
        .from('subscriptions')
        .upsert({ user_id: userId, stripe_customer_id: customerId }, { onConflict: 'user_id' })
    }

    // Only offer the trial once — if the DB flag is missing (old row) we also
    // check Stripe's subscription history for this customer to be safe
    let trialEligible = tier === 'privateer' && !hasTrialed
    if (trialEligible) {
      // Double-check via Stripe: if the customer has any prior subscription (even canceled)
      // on this price, they've already trialed
      const priorSubs = await stripe.subscriptions.list({
        customer: customerId,
        price: priceId,
        limit: 1,
        status: 'all',
      })
      if (priorSubs.data.length > 0) {
        console.log('[checkout] customer has prior Privateer subscription — no trial')
        trialEligible = false
      }
    }
    console.log('[checkout] trial eligible:', trialEligible, '| hasTrialed flag:', hasTrialed)

    const origin = req.headers.get('origin') ?? 'http://localhost:5173'

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/subscribe?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/subscribe`,
      subscription_data: {
        trial_period_days: trialEligible ? 30 : undefined,
        metadata: { supabase_user_id: userId, tier },
      },
    })

    console.log('[checkout] session created:', session.id)
    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[checkout] error:', (err as Error).message)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
