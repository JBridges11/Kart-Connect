import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'npm:stripe'

// ---------------------------------------------------------------------------
// create-portal-session
//
// Creates a Stripe Billing Portal session for the authenticated user and
// returns the portal URL.  The client redirects the user there to manage
// their subscription (change plan, update payment method, cancel, etc.)
// without needing a separate in-app flow.
// ---------------------------------------------------------------------------

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: cors })
  }

  // ── 1. Verify caller ──────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
      status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl    = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anonKey        = Deno.env.get('SUPABASE_ANON_KEY')!

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: { user }, error: userError } = await userClient.auth.getUser()
  if (userError || !user) {
    console.error('[portal] auth check failed:', userError?.message)
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
  console.log('[portal] caller verified | userId:', user.id)

  // ── 2. Look up the Stripe customer ID ─────────────────────────────────────
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: sub, error: subErr } = await adminClient
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .single()

  if (subErr || !sub?.stripe_customer_id) {
    console.error('[portal] no subscription found for user:', user.id, subErr?.message)
    return new Response(JSON.stringify({ error: 'No active subscription found' }), {
      status: 404, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
  console.log('[portal] stripe_customer_id:', sub.stripe_customer_id)

  // ── 3. Create a Billing Portal session ────────────────────────────────────
  const stripe    = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)
  const returnUrl = `${Deno.env.get('APP_URL') ?? 'https://kartconnect.netlify.app'}/settings`

  const session = await stripe.billingPortal.sessions.create({
    customer:   sub.stripe_customer_id,
    return_url: returnUrl,
  })

  console.log('[portal] ✓ session created, returning URL')
  return new Response(JSON.stringify({ url: session.url }), {
    status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
  })
})
