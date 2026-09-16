import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ---------------------------------------------------------------------------
// update-email Edge Function
//
// Applies an email address change immediately using the Supabase Admin API,
// bypassing the confirmation-link requirement.
//
// Security model:
//   • The caller must supply a valid user JWT (Authorization: Bearer <token>).
//     We call getUser() with that token to confirm the request comes from a
//     real authenticated session before touching anything.
//   • The client is expected to have already verified a TOTP code via
//     supabase.auth.mfa.challengeAndVerify() before calling this function —
//     that is the security gate that replaces the confirmation link.
//   • The service role key never leaves this server-side function.
// ---------------------------------------------------------------------------

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: cors })
  }

  // ── 1. Verify the caller is an authenticated Supabase user ────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl      = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anonKey          = Deno.env.get('SUPABASE_ANON_KEY')!

  // Use the caller's JWT to confirm their identity via getUser()
  // (JWT decode alone can be spoofed; getUser() calls the auth server)
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: { user }, error: userError } = await userClient.auth.getUser()
  if (userError || !user) {
    console.error('[update-email] auth check failed:', userError?.message)
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
  const oldEmail = user.email!   // captured before the admin update changes it
  console.log('[update-email] caller verified | userId:', user.id, '| current email:', oldEmail)

  // ── 2. Parse and validate the request body ────────────────────────────────
  let body: { newEmail?: unknown }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const { newEmail } = body
  if (typeof newEmail !== 'string' || !newEmail.includes('@')) {
    return new Response(JSON.stringify({ error: 'newEmail must be a valid email address' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  if (newEmail === user.email) {
    return new Response(JSON.stringify({ error: 'newEmail is the same as the current email' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  // ── 3. Apply the email change via the Admin API ───────────────────────────
  // admin.updateUserById() with email_confirm: true changes the email
  // immediately without sending a confirmation link.  The service role key
  // is only available server-side (injected by Supabase into Edge Functions).
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.log('[update-email] calling admin.updateUserById | userId:', user.id, '| old:', oldEmail, '| new:', newEmail)
  const { data, error: adminErr } = await adminClient.auth.admin.updateUserById(user.id, {
    email: newEmail,
    email_confirm: true,  // mark as confirmed — no link needed
  })

  if (adminErr) {
    console.error('[update-email] admin.updateUserById error:', adminErr.message)
    return new Response(JSON.stringify({ error: adminErr.message }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  console.log('[update-email] ✓ email updated | userId:', user.id, '| new email:', data.user.email)

  // ── 4. Send security notice to the OLD address ────────────────────────────
  // admin.updateUserById() bypasses Supabase's auth hook, so the account-emails
  // function never fires automatically.  Call it manually with the same payload
  // shape Supabase would have sent for an email_change_current event.
  try {
    const accountEmailsUrl = `${supabaseUrl}/functions/v1/account-emails`
    const noticePayload = {
      user: {
        email: oldEmail,                                          // old address → recipient of notice
        user_metadata: user.user_metadata ?? {},                  // carries full_name for personalisation
      },
      email_data: {
        email_action_type: 'email_change_current',
        new_email: newEmail,                                      // shown in the notice body
      },
    }

    // Forward the caller's IP so the notice shows the correct IP address
    const forwardedFor = req.headers.get('x-forwarded-for') ?? ''

    const noticeRes = await fetch(accountEmailsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        ...(forwardedFor ? { 'x-forwarded-for': forwardedFor } : {}),
      },
      body: JSON.stringify(noticePayload),
    })

    if (!noticeRes.ok) {
      const errText = await noticeRes.text()
      console.error('[update-email] account-emails notice failed:', noticeRes.status, errText)
    } else {
      console.log('[update-email] ✓ security notice dispatched to old address:', oldEmail)
    }
  } catch (noticeErr) {
    // Non-fatal — the email change itself succeeded; just log and continue
    console.error('[update-email] account-emails call threw:', (noticeErr as Error).message)
  }

  return new Response(
    JSON.stringify({ success: true, email: data.user.email }),
    { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
  )
})
