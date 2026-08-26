import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify JWT and get user
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: authError } = await anonClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { race_weekend_id } = await req.json()
    if (!race_weekend_id) {
      return new Response(JSON.stringify({ error: 'missing_race_weekend_id' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Verify ownership
    const { data: weekend } = await supabase
      .from('race_weekends')
      .select('id, manager_id')
      .eq('id', race_weekend_id)
      .single()

    if (!weekend || weekend.manager_id !== user.id) {
      return new Response(JSON.stringify({ error: 'forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const now = new Date()
    const expiresAt = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString()

    await supabase.from('race_weekends').update({
      is_live: true,
      went_live_at: now.toISOString(),
      expires_at: expiresAt,
    }).eq('id', race_weekend_id)

    await supabase.from('race_weekend_drivers').update({
      token_is_active: true,
    }).eq('race_weekend_id', race_weekend_id)

    const { count } = await supabase
      .from('race_weekend_drivers')
      .select('id', { count: 'exact', head: true })
      .eq('race_weekend_id', race_weekend_id)

    return new Response(JSON.stringify({ success: true, expires_at: expiresAt, driver_count: count }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'server_error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
