import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { html as passwordResetHtml }       from './templates/password-reset.ts'
import { html as emailAddressChangedHtml } from './templates/email-address-changed.ts'
import { html as emailChangeConfirmHtml }  from './templates/email-change-confirm.ts'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function sendResendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'noreply@kart-connect.com',
      to: [to],
      subject,
      html,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    console.error('[email] Resend error:', err)
    throw new Error(`Resend failed: ${err}`)
  }
  console.log('[email] Sent successfully to:', to)
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })
}

// Build the confirmation email HTML.
// The URL contains & between query params — those must be &amp; in href attributes
// so email clients don't truncate the URL at the first bare ampersand.
function buildConfirmEmail(
  firstName: string,
  newEmail: string,
  confirmUrl: string,
  appUrl: string,
): string {
  const confirmUrlHref = confirmUrl.replaceAll('&', '&amp;')
  let html = emailChangeConfirmHtml
  html = html
    .replaceAll('{{first_name}}',      firstName)
    .replaceAll('{{new_email}}',       newEmail)
    .replaceAll('{{confirm_url_href}}', confirmUrlHref)
    .replaceAll('{{confirm_url_text}}', confirmUrl)  // raw & is correct in text content
    .replaceAll('{{privacy_url}}',     `${appUrl}/privacy`)
    .replaceAll('{{terms_url}}',       `${appUrl}/terms`)
  return html
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const rawBody = await req.text()
  console.log('[account-emails] RAW BODY:', rawBody)

  let body: { user: Record<string, any>; email_data: Record<string, any> }
  try {
    body = JSON.parse(rawBody)
  } catch {
    console.error('[account-emails] Failed to parse JSON body')
    return new Response('Invalid JSON', { status: 400 })
  }

  const { user, email_data } = body
  const actionType = email_data?.email_action_type as string | undefined

  console.log('─────────────────────────────────────────')
  console.log('[account-emails] action_type :', actionType)
  console.log('[account-emails] user.email  :', user?.email)
  console.log('[account-emails] email_data  :', JSON.stringify(email_data))
  console.log('─────────────────────────────────────────')

  const appUrl = Deno.env.get('APP_URL') ?? 'https://kartconnect.netlify.app'

  try {
    // -----------------------------------------------------------------------
    // Password Reset  (action_type = "recovery")
    // -----------------------------------------------------------------------
    if (actionType === 'recovery') {
      const email = user?.email as string | undefined
      if (!email) {
        console.log('[account-emails] recovery: no user email — skipping')
        return new Response(JSON.stringify({ success: true }), { status: 200 })
      }

      const fullName  = (user?.user_metadata?.full_name as string | undefined) ?? ''
      const firstName = fullName.split(' ')[0].trim() || 'Racer'
      const tokenHash = email_data?.token_hash as string | undefined

      const resetUrl = tokenHash
        ? `${appUrl}/reset-password?token_hash=${tokenHash}&type=recovery`
        : `${appUrl}/reset-password`

      const expiresAt  = new Date(Date.now() + 3600 * 1000)
      const expiryTime = `${formatDate(expiresAt)} at ${formatTime(expiresAt)}`

      let html = passwordResetHtml
      html = html
        .replaceAll('{{first_name}}',  firstName)
        .replaceAll('{{reset_url}}',   resetUrl)
        .replaceAll('{{expiry_time}}', expiryTime)
        .replaceAll('{{privacy_url}}', `${appUrl}/privacy`)
        .replaceAll('{{terms_url}}',   `${appUrl}/terms`)

      await sendResendEmail(email, 'Reset your Kart Connect password', html)
      console.log('[account-emails] ✓ Password reset email sent to:', email)
    }

    // -----------------------------------------------------------------------
    // Email Address Changed — security notice only, to the OLD address
    // (split-event format: email_change_current handles just the notice)
    // -----------------------------------------------------------------------
    else if (actionType === 'email_change_current') {
      const oldEmail = user?.email as string | undefined
      if (!oldEmail) {
        console.log('[account-emails] email_change_current: no old email — skipping')
        return new Response(JSON.stringify({ success: true }), { status: 200 })
      }

      const fullName  = (user?.user_metadata?.full_name as string | undefined) ?? ''
      const firstName = fullName.split(' ')[0].trim() || 'Racer'
      const newEmail  = (email_data?.new_email ?? user?.new_email ?? 'your new address') as string
      const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'Unknown'
      const now       = new Date()

      let html = emailAddressChangedHtml
      html = html
        .replaceAll('{{first_name}}',  firstName)
        .replaceAll('{{old_email}}',   oldEmail)
        .replaceAll('{{new_email}}',   newEmail)
        .replaceAll('{{change_date}}', formatDate(now))
        .replaceAll('{{change_time}}', formatTime(now))
        .replaceAll('{{ip_address}}',  ipAddress)
        .replaceAll('{{privacy_url}}', `${appUrl}/privacy`)
        .replaceAll('{{terms_url}}',   `${appUrl}/terms`)

      await sendResendEmail(oldEmail, 'Your Kart Connect email address has been changed', html)
      console.log('[account-emails] ✓ Security notice sent to old address:', oldEmail)
    }

    // -----------------------------------------------------------------------
    // Email Change Confirmation — new address (split-event format)
    //
    // We return 200 immediately and send nothing.
    //
    // ⚠ IMPORTANT — Supabase Send Email hook semantics:
    //   A 2xx response tells Supabase "the hook handled this email", so
    //   Supabase will NOT send any fallback email of its own.  If "Confirm
    //   email changes" is enabled in Auth → Settings, the pending change will
    //   stay unconfirmed and the user's email will never actually update.
    //
    //   This handler is intentionally left empty so we can verify whether
    //   Supabase's native confirmation mechanism can be re-engaged by disabling
    //   the "Confirm email changes" requirement in the Auth dashboard, making
    //   the change take effect immediately without a confirmation link.
    // -----------------------------------------------------------------------
    else if (actionType === 'email_change_new') {
      console.log('[account-emails] email_change_new: returning 200, no email sent')
    }

    // -----------------------------------------------------------------------
    // "email_change" — single-event format
    //
    // Supabase fires one event rather than separate _current / _new calls.
    // We send BOTH emails from this handler:
    //   1. Security notice to the OLD address (our custom branded email)
    //   2. Confirmation link to the NEW address — points directly at Supabase's
    //      /auth/v1/verify endpoint.  Supabase verifies the token, updates the
    //      email in its database, then redirects to our /settings page with a
    //      fresh session in the URL hash.  Settings.tsx detects type=email_change
    //      in the hash and shows the success banner.
    //
    // The token_hash from the hook payload is used directly (not generateLink()
    // which would create a fresh token and invalidate this one).
    // -----------------------------------------------------------------------
    else if (actionType === 'email_change') {
      console.log('[account-emails] → handling "email_change" (single event)')

      const oldEmail = user?.email as string | undefined
      const u        = user as Record<string, any>

      // New email: the client stores it in user_metadata._pending_email_change
      // before calling updateUser({ email }) because user.email_change is not
      // reliably present in this Supabase version's hook payload.
      const newEmail = (
        u?.user_metadata?._pending_email_change ??
        u?.email_change ??
        u?.new_email ??
        email_data?.new_email
      ) as string | null

      console.log('[account-emails] email_change: oldEmail:', oldEmail, '| newEmail:', newEmail)

      if (!oldEmail) {
        console.error('[account-emails] email_change: no oldEmail — skipping')
        return new Response(JSON.stringify({ success: true }), { status: 200 })
      }

      const fullName  = (user?.user_metadata?.full_name as string | undefined) ?? ''
      const firstName = fullName.split(' ')[0].trim() || 'Racer'
      const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'Unknown'
      const now       = new Date()

      // ── 1. Security notice to OLD address ─────────────────────────────────
      let noticeHtml = emailAddressChangedHtml
      noticeHtml = noticeHtml
        .replaceAll('{{first_name}}',  firstName)
        .replaceAll('{{old_email}}',   oldEmail)
        .replaceAll('{{new_email}}',   newEmail ?? 'your new address')
        .replaceAll('{{change_date}}', formatDate(now))
        .replaceAll('{{change_time}}', formatTime(now))
        .replaceAll('{{ip_address}}',  ipAddress)
        .replaceAll('{{privacy_url}}', `${appUrl}/privacy`)
        .replaceAll('{{terms_url}}',   `${appUrl}/terms`)

      await sendResendEmail(oldEmail, 'Your Kart Connect email address has been changed', noticeHtml)
      console.log('[account-emails] ✓ Security notice sent to old address:', oldEmail)

      // ── 2. Confirmation to NEW address — intentionally not sent ──────────
      // We return 200 without sending a confirmation email to the new address.
      // See the email_change_new handler above for the reasoning.
      // If confirmation is required in Auth settings the change will stay
      // pending; disable "Confirm email changes" in the Auth dashboard to make
      // the change take effect immediately without a confirmation link.
      console.log('[account-emails] email_change: skipping confirmation email to new address:', newEmail)
    }

    // -----------------------------------------------------------------------
    // Unhandled action types — return 200 so Supabase doesn't retry
    // -----------------------------------------------------------------------
    else {
      console.log('[account-emails] Unhandled action_type:', actionType)
    }

  } catch (err) {
    console.error('[account-emails] Uncaught error:', (err as Error).message)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
