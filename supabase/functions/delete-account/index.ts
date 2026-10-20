import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'npm:stripe'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    // ── 1. Authenticate the caller ────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace('Bearer ', '').trim()
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Verify the JWT and resolve the user id via the admin client
    const { data: { user }, error: userErr } = await adminClient.auth.getUser(token)
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }
    const userId = user.id
    console.log('[delete-account] user:', userId)

    // ── 2. Cancel Stripe subscription (before deleting anything) ─────────────
    const { data: sub } = await adminClient
      .from('subscriptions')
      .select('stripe_subscription_id, stripe_customer_id')
      .eq('user_id', userId)
      .maybeSingle()

    if (sub?.stripe_subscription_id) {
      try {
        const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)
        // Cancel immediately; customer + invoice records are preserved for accounting
        await stripe.subscriptions.cancel(sub.stripe_subscription_id)
        console.log('[delete-account] Stripe subscription cancelled:', sub.stripe_subscription_id)
      } catch (stripeErr) {
        console.error('[delete-account] Stripe cancel failed — aborting to prevent data loss:', stripeErr)
        return new Response(JSON.stringify({ error: 'Failed to cancel subscription. Please try again or contact support.' }), {
          status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
        })
      }
    }

    // ── 3. Delete user data in dependency order ───────────────────────────────

    // setup_changes → references setups
    await adminClient.from('setup_changes').delete().eq('user_id', userId)

    // lap_times → references sessions
    // (lap_times may use session_id FK — delete via sessions the user owns)
    const { data: sessionIds } = await adminClient
      .from('sessions')
      .select('id')
      .eq('user_id', userId)
    if (sessionIds?.length) {
      const ids = sessionIds.map(s => s.id)
      await adminClient.from('lap_times').delete().in('session_id', ids)
    }

    // setups → references sessions / karts
    await adminClient.from('setups').delete().eq('user_id', userId)

    // sessions
    await adminClient.from('sessions').delete().eq('user_id', userId)

    // karts
    await adminClient.from('karts').delete().eq('user_id', userId)

    // race_weekend_drivers — rows where the user is listed as a driver
    await adminClient.from('race_weekend_drivers').delete().eq('user_id', userId)

    // race_weekends the user manages (cascade also removes their driver rows)
    const { data: weekendIds } = await adminClient
      .from('race_weekends')
      .select('id')
      .eq('manager_id', userId)
    if (weekendIds?.length) {
      const ids = weekendIds.map(w => w.id)
      await adminClient.from('race_weekend_drivers').delete().in('race_weekend_id', ids)
      await adminClient.from('race_weekends').delete().in('id', ids)
    }

    // tracks created by the user
    await adminClient.from('tracks').delete().eq('user_id', userId)

    // team_branding
    await adminClient.from('team_branding').delete().eq('user_id', userId)

    // subscriptions
    await adminClient.from('subscriptions').delete().eq('user_id', userId)

    // ── 4. Delete Storage files ───────────────────────────────────────────────
    const { data: logoFiles } = await adminClient.storage
      .from('team-logos')
      .list(userId)
    if (logoFiles?.length) {
      const paths = logoFiles.map(f => `${userId}/${f.name}`)
      await adminClient.storage.from('team-logos').remove(paths)
      console.log('[delete-account] removed storage files:', paths)
    }

    // ── 5. Delete the auth user (last, so we can still act on their behalf above)
    const { error: deleteErr } = await adminClient.auth.admin.deleteUser(userId)
    if (deleteErr) {
      console.error('[delete-account] auth.admin.deleteUser failed:', deleteErr.message)
      return new Response(JSON.stringify({ error: 'Account data deleted but auth record removal failed. Contact support.' }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    console.log('[delete-account] complete for user:', userId)
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[delete-account] unexpected error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
