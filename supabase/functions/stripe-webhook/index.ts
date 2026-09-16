import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'npm:stripe'
import { html as privateerMonthlyHtml } from './templates/privateer-monthly.ts'
import { html as teamMonthlyHtml } from './templates/team-monthly.ts'
import { html as proteamMonthlyHtml } from './templates/proteam-monthly.ts'
import { html as privateerAnnualHtml } from './templates/privateer-annual.ts'
import { html as teamAnnualHtml } from './templates/team-annual.ts'
import { html as proteamAnnualHtml } from './templates/proteam-annual.ts'
import { html as trialStartedHtml } from './templates/trial-started.ts'
import { html as subConfirmedPrivateerMonthlyHtml } from './templates/sub-confirmed-privateer-monthly.ts'
import { html as subConfirmedTeamMonthlyHtml } from './templates/sub-confirmed-team-monthly.ts'
import { html as subConfirmedProteamMonthlyHtml } from './templates/sub-confirmed-proteam-monthly.ts'
import { html as subConfirmedPrivateerAnnualHtml } from './templates/sub-confirmed-privateer-annual.ts'
import { html as subConfirmedTeamAnnualHtml } from './templates/sub-confirmed-team-annual.ts'
import { html as subConfirmedProteamAnnualHtml } from './templates/sub-confirmed-proteam-annual.ts'
import { html as paymentFailedHtml }             from './templates/payment-failed.ts'
import { html as subscriptionRenewedHtml }        from './templates/subscription-renewed.ts'
import { html as subscriptionCancelledHtml }       from './templates/subscription-cancelled.ts'
import { html as planUpgradedHtml }               from './templates/plan-upgraded.ts'
import { html as planDowngradedHtml }             from './templates/plan-downgraded.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  const parts = signature.split(',').reduce((acc, part) => {
    const [key, value] = part.split('=')
    acc[key] = value
    return acc
  }, {} as Record<string, string>)

  const timestamp = parts['t']
  const sig = parts['v1']
  if (!timestamp || !sig) return false

  const signedPayload = `${timestamp}.${payload}`
  const encoder = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(signedPayload))
  const computedSig = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  return computedSig === sig
}

function toIso(ts: number | null | undefined): string | null {
  if (!ts) return null
  const d = new Date(ts * 1000)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

function formatDate(ts: number | null | undefined): string {
  if (!ts) return ''
  const d = new Date(ts * 1000)
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

const PLAN_NAMES: Record<string, string> = {
  privateer: 'Privateer',
  team: 'Team',
  pro_team: 'Pro Team',
}


function formatCurrency(amountPence: number | null | undefined, currency = 'gbp'): string {
  if (!amountPence && amountPence !== 0) return ''
  const symbol = currency.toLowerCase() === 'usd' ? '$' : '£'
  return `${symbol}${(amountPence / 100).toFixed(2)}`
}

function getConfirmationTemplate(tier: string, interval: 'month' | 'year'): string {
  if (interval === 'year') {
    if (tier === 'team')     return subConfirmedTeamAnnualHtml
    if (tier === 'pro_team') return subConfirmedProteamAnnualHtml
    return subConfirmedPrivateerAnnualHtml
  }
  if (tier === 'team')     return subConfirmedTeamMonthlyHtml
  if (tier === 'pro_team') return subConfirmedProteamMonthlyHtml
  return subConfirmedPrivateerMonthlyHtml
}

function getTemplate(tier: string, interval: 'month' | 'year', isTrialing: boolean): string {
  if (isTrialing) return trialStartedHtml
  if (interval === 'year') {
    if (tier === 'team')     return teamAnnualHtml
    if (tier === 'pro_team') return proteamAnnualHtml
    return privateerAnnualHtml
  }
  if (tier === 'team')     return teamMonthlyHtml
  if (tier === 'pro_team') return proteamMonthlyHtml
  return privateerMonthlyHtml
}

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
    console.error('[email] Resend error:', await res.text())
  } else {
    console.log('[email] email sent to', to)
  }
}

serve(async (req) => {
  const sig = req.headers.get('stripe-signature')
  const body = await req.text()

  if (!sig) return new Response('Missing stripe-signature header', { status: 400 })

  const webhookSecret    = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  const webhookSecretCli = Deno.env.get('STRIPE_WEBHOOK_SECRET_CLI')

  if (!webhookSecret && !webhookSecretCli) {
    console.error('No webhook secret configured (STRIPE_WEBHOOK_SECRET or STRIPE_WEBHOOK_SECRET_CLI)')
    return new Response('Webhook secret not configured', { status: 500 })
  }

  const secrets = [webhookSecret, webhookSecretCli].filter(Boolean) as string[]
  const results = await Promise.all(secrets.map(s => verifyStripeSignature(body, sig, s)))
  const valid   = results.some(Boolean)
  if (!valid) {
    console.error('[webhook] Signature verification failed against all configured secrets')
    return new Response('Invalid signature', { status: 400 })
  }
  console.log('[webhook] Signature verified')

  let event: Stripe.Event
  try {
    event = JSON.parse(body) as Stripe.Event
  } catch {
    return new Response('Invalid JSON body', { status: 400 })
  }
  console.log('Event type:', event.type)

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.mode !== 'subscription') break

      const stripeSub = await stripe.subscriptions.retrieve(session.subscription as string)
      const userId = stripeSub.metadata.supabase_user_id
      const tier   = stripeSub.metadata.tier ?? 'privateer'
      if (!userId) break
      console.log('Processing checkout for user:', userId)

      // Save subscription to DB
      // has_trialed is set to true if this subscription starts as a trial so
      // the user cannot claim another trial in future checkout sessions
      await supabase.from('subscriptions').upsert({
        user_id: userId,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: stripeSub.id,
        status: stripeSub.status,
        tier,
        current_period_end: toIso(stripeSub.current_period_end),
        ...(stripeSub.status === 'trialing' ? { has_trialed: true } : {}),
      }, { onConflict: 'user_id' })

      // Send welcome email
      try {
        const { data: { user: authUser } } = await supabase.auth.admin.getUserById(userId)
        const email = authUser?.email
        if (email) {
          const isTrialing = stripeSub.status === 'trialing'
          const fullName   = (authUser.user_metadata?.full_name as string | undefined) ?? ''
          const firstName  = fullName.split(' ')[0].trim() || 'Racer'
          const planName   = PLAN_NAMES[tier] ?? 'Privateer'
          const interval   = (stripeSub.items.data[0]?.price?.recurring?.interval ?? 'month') as 'month' | 'year'
          const subject    = isTrialing
            ? `Your Kart Connect trial has started`
            : `Welcome to Kart Connect – ${planName}`

          const appUrl         = Deno.env.get('APP_URL') ?? 'https://kart-connect.com'
          const privacyUrl     = `${appUrl}/privacy`
          const termsUrl       = `${appUrl}/terms`
          const unsubscribeUrl = `${appUrl}/unsubscribe`
          const manageUrl      = `${appUrl}/account`

          let html = getTemplate(tier, interval, isTrialing)
          html = html
            .replaceAll('{{first_name}}',      firstName)
            .replaceAll('{{plan_name}}',        planName)
            .replaceAll('{{app_url}}',          appUrl)
            .replaceAll('{{manage_url}}',       manageUrl)
            .replaceAll('{{privacy_url}}',      privacyUrl)
            .replaceAll('{{terms_url}}',        termsUrl)
            .replaceAll('{{unsubscribe_url}}',  unsubscribeUrl)
            .replaceAll('{{trial_end_date}}',   formatDate(stripeSub.trial_end))
            .replaceAll('{{trial_start_date}}', formatDate(stripeSub.trial_start))

          console.log('[checkout] Sending welcome email to:', email, '| trialing:', isTrialing, '| tier:', tier, '| interval:', interval)
          await sendResendEmail(email, subject, html)
        }
      } catch (emailErr) {
        console.error('[checkout] Failed to send welcome email:', (emailErr as Error).message)
      }

      break
    }

    case 'customer.subscription.created': {
      const sub    = event.data.object as Stripe.Subscription
      const userId = sub.metadata?.supabase_user_id
      const tier   = sub.metadata?.tier ?? 'privateer'

      // Trials have no payment — confirmation email is for paid subscriptions only
      if (!userId || sub.status === 'trialing') {
        console.log('[subscription.created] Skipping confirmation — no userId or trial subscription')
        break
      }

      try {
        const { data: { user: authUser } } = await supabase.auth.admin.getUserById(userId)
        const email = authUser?.email
        if (!email) break

        const fullName  = (authUser.user_metadata?.full_name as string | undefined) ?? ''
        const firstName = fullName.split(' ')[0].trim() || 'Racer'
        const planName  = PLAN_NAMES[tier] ?? 'Privateer'
        const interval  = (sub.items.data[0]?.price?.recurring?.interval ?? 'month') as 'month' | 'year'
        const appUrl    = Deno.env.get('APP_URL') ?? 'https://kart-connect.com'

        // Fetch fresh subscription — webhook payload current_period_end can be 0
        // before Stripe finalises the billing cycle; API retrieval is always accurate
        const freshSub = await stripe.subscriptions.retrieve(sub.id)
        console.log('[subscription.created] current_period_end (fresh):', freshSub.current_period_end)

        // Fetch invoice for payment details
        let cardBrand = 'Card', cardLast4 = '****', invoiceNumber = '', paymentDate = ''
        let invoicePeriodStart = 0

        const latestInvoiceId = freshSub.latest_invoice as string | null
        if (latestInvoiceId) {
          const invoice = await stripe.invoices.retrieve(latestInvoiceId, {
            expand: ['payment_intent.payment_method'],
          })
          console.log('[subscription.created] invoice period_start:', invoice.period_start, 'period_end:', invoice.period_end, 'paid_at:', invoice.status_transitions?.paid_at)
          // Use our own sequential invoice number (starts at KC-00050)
          const { data: kcInvoiceNum } = await supabase.rpc('get_next_invoice_number')
          invoiceNumber      = kcInvoiceNum ?? invoice.number ?? ''
          paymentDate        = formatDate(invoice.status_transitions?.paid_at ?? null)
          invoicePeriodStart = invoice.period_start ?? 0
          const pm = (invoice as any).payment_intent?.payment_method
          if (pm?.card) {
            cardBrand = pm.card.brand ?? 'Card'
            cardLast4 = pm.card.last4 ?? '****'
          }
        }

        // next billing date = when Stripe will charge again = end of current period
        const subItem           = freshSub.items.data[0]
        const itemPeriodEnd     = subItem?.current_period_end
        const itemPeriodStart   = subItem?.current_period_start
        console.log('[subscription.created] item current_period_end:', itemPeriodEnd, '| formatted:', formatDate(itemPeriodEnd))
        const nextBillingDate = formatDate(itemPeriodEnd)
        const periodStart     = formatDate(invoicePeriodStart || itemPeriodStart)
        const periodEnd       = formatDate(itemPeriodEnd)

        let html = getConfirmationTemplate(tier, interval)
        html = html
          .replaceAll('{{first_name}}',       firstName)
          .replaceAll('{{plan_name}}',         planName)
          .replaceAll('{{app_url}}',           appUrl)
          .replaceAll('{{manage_url}}',        `${appUrl}/account`)
          .replaceAll('{{privacy_url}}',       `${appUrl}/privacy`)
          .replaceAll('{{terms_url}}',         `${appUrl}/terms`)
          .replaceAll('{{card_brand}}',        cardBrand.charAt(0).toUpperCase() + cardBrand.slice(1))
          .replaceAll('{{card_last4}}',        cardLast4)
          .replaceAll('{{invoice_number}}',    invoiceNumber)
          .replaceAll('{{payment_date}}',      paymentDate)
          .replaceAll('{{next_billing_date}}', nextBillingDate)
          .replaceAll('{{period_start}}',      periodStart)
          .replaceAll('{{period_end}}',        periodEnd)

        const subject = `Your Kart Connect subscription is confirmed – ${planName}`
        console.log('[subscription.created] Sending confirmation to:', email, '| tier:', tier, '| interval:', interval)
        await sendResendEmail(email, subject, html)
        console.log('[subscription.created] Confirmation sent')
      } catch (emailErr) {
        console.error('[subscription.created] Failed to send confirmation:', (emailErr as Error).message)
      }

      break
    }

    case 'customer.subscription.updated': {
      const sub    = event.data.object as Stripe.Subscription
      const userId = sub.metadata?.supabase_user_id
      const updatedPeriodEnd = (sub as any).items?.data?.[0]?.current_period_end ?? sub.current_period_end

      // Derive the new tier from the price ID on the subscription item.
      // Subscription metadata.tier is not updated when a customer changes plan,
      // so the price ID is the only reliable signal for which tier is now active.
      const priceId = sub.items?.data?.[0]?.price?.id ?? null
      const PRICE_TIER: Record<string, string> = {}
      ;([
        ['STRIPE_PRICE_ID_PRIVATEER', 'privateer'],
        ['STRIPE_PRICE_ID_TEAM',      'team'],
        ['STRIPE_PRICE_ID_PRO_TEAM',  'pro_team'],
      ] as [string, string][]).forEach(([envKey, tier]) => {
        const val = Deno.env.get(envKey)
        if (val) PRICE_TIER[val] = tier
      })
      const newTier = priceId ? (PRICE_TIER[priceId] ?? undefined) : undefined
      console.log('[subscription.updated] priceId:', priceId ?? 'none', '| mapped newTier:', newTier ?? 'unknown (not in price map)')

      // 1. Read the stored tier from DB BEFORE overwriting it.
      //    Our subscriptions table is the authoritative source of the old tier.
      let oldTier: string | undefined
      let rowExists = false
      if (newTier && userId) {
        const { data: storedSub } = await supabase
          .from('subscriptions')
          .select('tier')
          .eq('stripe_subscription_id', sub.id)
          .single()
        rowExists = storedSub !== null
        oldTier   = (storedSub?.tier as string | undefined) ?? undefined
        console.log('[subscription.updated] DB oldTier:', oldTier ?? 'not found', '| rowExists:', rowExists, '| incoming newTier:', newTier)
      }

      // 1a. No row found — bootstrap one with the current state and stop.
      //     The next subscription.updated event will have a valid oldTier to
      //     compare against, so the upgrade/downgrade email can fire correctly.
      if (!rowExists && newTier && userId) {
        console.log('[subscription.updated] No existing row — inserting bootstrap record for future comparisons')
        await supabase.from('subscriptions').upsert({
          user_id:                userId,
          stripe_customer_id:     sub.customer as string,
          stripe_subscription_id: sub.id,
          status:                 sub.status,
          tier:                   newTier,
          current_period_end:     toIso(updatedPeriodEnd),
        }, { onConflict: 'user_id' })
        break
      }

      // 2. Update DB to the new state
      await supabase.from('subscriptions')
        .update({
          status: sub.status,
          tier: newTier,
          current_period_end: toIso(updatedPeriodEnd),
        })
        .eq('stripe_subscription_id', sub.id)

      // 3. Send plan-change email if the tier actually changed
      if (oldTier && newTier && oldTier !== newTier) {
        if (!userId) {
          console.log('[subscription.updated] Plan change detected but no supabase_user_id in metadata — skipping email')
          break
        }

        try {
          const { data: { user: authUser } } = await supabase.auth.admin.getUserById(userId)
          const email = authUser?.email
          if (!email) { console.log('[subscription.updated] No user email — skipping email'); break }

          const fullName  = (authUser.user_metadata?.full_name as string | undefined) ?? ''
          const firstName = fullName.split(' ')[0].trim() || 'Racer'
          const appUrl    = Deno.env.get('APP_URL') ?? 'https://kart-connect.com'
          const interval  = (sub.items.data[0]?.price?.recurring?.interval ?? 'month') as 'month' | 'year'

          const TIER_RANK: Record<string, number> = { privateer: 1, team: 2, pro_team: 3 }
          const isUpgrade = (TIER_RANK[newTier] ?? 0) > (TIER_RANK[oldTier] ?? 0)

          // Static price labels — kept in sync with Stripe product prices
          const PLAN_PRICE_LABELS: Record<string, Record<string, string>> = {
            privateer: { month: '£12.99/month', year: '£129.99/year' },
            team:      { month: '£29.99/month', year: '£299.99/year' },
            pro_team:  { month: '£49.99/month', year: '£499.99/year' },
          }

          const oldPrice    = PLAN_PRICE_LABELS[oldTier]?.[interval] ?? ''
          const newPrice    = PLAN_PRICE_LABELS[newTier]?.[interval] ?? ''
          const oldPlanName = PLAN_NAMES[oldTier] ?? oldTier
          const newPlanName = PLAN_NAMES[newTier] ?? newTier
          const changeDate  = formatDate(Math.floor(Date.now() / 1000))
          const subItem     = sub.items.data[0]
          const nextBillingDate = formatDate((subItem as any)?.current_period_end ?? null)
          const planKey     = `${oldTier}→${newTier}` as const

          if (isUpgrade) {
            // Features unlocked, keyed by transition
            const UPGRADE_FEATURES: Record<string, [string, string, string, string]> = {
              'privateer→team': [
                'Multi-driver Profiles',
                'Add and manage profiles for multiple drivers from one account.',
                'Team Leaderboards',
                'Compare lap times and performance across every driver in your team.',
              ],
              'team→pro_team': [
                'Advanced AI Analysis',
                'Deeper AI-powered insights with multi-session trend analysis and setup recommendations.',
                'Priority Support',
                'Dedicated priority support for Pro Team subscribers.',
              ],
              'privateer→pro_team': [
                'Everything in Team',
                'Multi-driver profiles, team leaderboards, and collaborative session logging.',
                'Advanced AI & Priority Support',
                'Pro-level AI insights, setup recommendations, and dedicated support.',
              ],
            }
            const feats = UPGRADE_FEATURES[planKey] ?? [
              'More features', 'See your account for details.',
              'Enhanced access', 'Explore what\'s new in your dashboard.',
            ]

            let html = planUpgradedHtml
            html = html
              .replaceAll('{{first_name}}',              firstName)
              .replaceAll('{{old_plan}}',                oldPlanName)
              .replaceAll('{{new_plan}}',                newPlanName)
              .replaceAll('{{old_price}}',               oldPrice)
              .replaceAll('{{new_price}}',               newPrice)
              .replaceAll('{{unlocked_feature_1}}',      feats[0])
              .replaceAll('{{unlocked_feature_1_desc}}', feats[1])
              .replaceAll('{{unlocked_feature_2}}',      feats[2])
              .replaceAll('{{unlocked_feature_2_desc}}', feats[3])
              .replaceAll('{{upgrade_date}}',            changeDate)
              .replaceAll('{{prorated_amount}}',         'See your next invoice')
              .replaceAll('{{next_billing_date}}',       nextBillingDate)
              .replaceAll('{{manage_url}}',              `${appUrl}/account`)
              .replaceAll('{{app_url}}',                 appUrl)
              .replaceAll('{{privacy_url}}',             `${appUrl}/privacy`)
              .replaceAll('{{terms_url}}',               `${appUrl}/terms`)

            console.log('[subscription.updated] Sending upgrade email to:', email, '|', oldTier, '→', newTier)
            await sendResendEmail(email, `You've upgraded to Kart Connect ${newPlanName}`, html)
          } else {
            // Features lost in the downgrade
            const DOWNGRADE_FEATURES: Record<string, [string, string, string, string]> = {
              'team→privateer': [
                'Multi-driver Profiles',
                'Team member management and multi-driver session tracking.',
                'Team Leaderboards',
                'Shared performance tracking across your team.',
              ],
              'pro_team→team': [
                'Advanced AI Analysis',
                'Multi-session trend analysis and enhanced AI recommendations.',
                'Priority Support',
                'Dedicated priority support channel.',
              ],
              'pro_team→privateer': [
                'Team & Multi-driver Features',
                'Multi-driver profiles, team leaderboards, and collaborative session logging.',
                'Advanced AI Analysis & Priority Support',
                'Enhanced AI insights and dedicated support access.',
              ],
            }
            const feats = DOWNGRADE_FEATURES[planKey] ?? [
              'Some features', 'These are no longer included.',
              'Reduced access', 'See your account for what\'s available.',
            ]

            // Downgrades typically take effect at the next billing date
            const effectiveDate = nextBillingDate

            let html = planDowngradedHtml
            html = html
              .replaceAll('{{first_name}}',              firstName)
              .replaceAll('{{old_plan}}',                oldPlanName)
              .replaceAll('{{new_plan}}',                newPlanName)
              .replaceAll('{{old_price}}',               oldPrice)
              .replaceAll('{{new_price}}',               newPrice)
              .replaceAll('{{effective_date}}',          effectiveDate)
              .replaceAll('{{removed_feature_1}}',       feats[0])
              .replaceAll('{{removed_feature_1_desc}}',  feats[1])
              .replaceAll('{{removed_feature_2}}',       feats[2])
              .replaceAll('{{removed_feature_2_desc}}',  feats[3])
              .replaceAll('{{upgrade_url}}',             `${appUrl}/account`)
              .replaceAll('{{manage_url}}',              `${appUrl}/account`)
              .replaceAll('{{app_url}}',                 appUrl)
              .replaceAll('{{privacy_url}}',             `${appUrl}/privacy`)
              .replaceAll('{{terms_url}}',               `${appUrl}/terms`)

            console.log('[subscription.updated] Sending downgrade email to:', email, '|', oldTier, '→', newTier)
            await sendResendEmail(email, `Your Kart Connect plan has changed to ${newPlanName}`, html)
          }
          console.log('[subscription.updated] Plan change email sent')
        } catch (emailErr) {
          console.error('[subscription.updated] Failed to send plan change email:', (emailErr as Error).message)
        }
      }
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await supabase.from('subscriptions')
        .update({ status: 'canceled', tier: null })
        .eq('stripe_subscription_id', sub.id)

      // Send cancellation confirmation email
      const cancelledUserId = sub.metadata?.supabase_user_id
      if (cancelledUserId) {
        try {
          const { data: { user: authUser } } = await supabase.auth.admin.getUserById(cancelledUserId)
          const email = authUser?.email
          if (email) {
            const fullName   = (authUser.user_metadata?.full_name as string | undefined) ?? ''
            const firstName  = fullName.split(' ')[0].trim() || 'Racer'
            const tier       = sub.metadata?.tier ?? 'privateer'
            const planName   = PLAN_NAMES[tier] ?? 'Privateer'
            const appUrl     = Deno.env.get('APP_URL') ?? 'https://kart-connect.com'
            const cancelDate = formatDate((sub as any).canceled_at ?? null)
            const subItem    = (sub as any).items?.data?.[0]
            const accessUntil = formatDate(subItem?.current_period_end ?? null)
            let html = subscriptionCancelledHtml
            html = html
              .replaceAll('{{first_name}}',      firstName)
              .replaceAll('{{plan_name}}',       planName)
              .replaceAll('{{cancel_date}}',     cancelDate)
              .replaceAll('{{access_until}}',    accessUntil)
              .replaceAll('{{manage_url}}',      `${appUrl}/account`)
              .replaceAll('{{privacy_url}}',     `${appUrl}/privacy`)
              .replaceAll('{{terms_url}}',       `${appUrl}/terms`)
              .replaceAll('{{unsubscribe_url}}', `${appUrl}/unsubscribe`)
              .replaceAll('{{app_url}}',         appUrl)
            console.log('[subscription.deleted] Sending cancellation email to:', email)
            await sendResendEmail(email, `Your Kart Connect subscription has been cancelled`, html)
          }
        } catch (emailErr) {
          console.error('[subscription.deleted] Failed to send cancellation email:', (emailErr as Error).message)
        }
      }
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      console.log('[payment_failed] invoice.id:', invoice.id, '| subscription:', invoice.subscription, '| amount_due:', invoice.amount_due, '| billing_reason:', invoice.billing_reason)

      if (invoice.subscription) {
        await supabase.from('subscriptions')
          .update({ status: 'past_due' })
          .eq('stripe_subscription_id', invoice.subscription as string)
        console.log('[payment_failed] DB status updated to past_due')
      }

      try {
        const failedSubId = invoice.subscription as string | null
        let email: string | undefined
        let firstName = 'Racer'
        let planName  = 'Kart Connect'

        // Primary path: resolve email + name via subscription metadata
        if (failedSubId) {
          console.log('[payment_failed] Retrieving subscription:', failedSubId)
          const failedSub = await stripe.subscriptions.retrieve(failedSubId)
          const userId    = failedSub.metadata?.supabase_user_id
          console.log('[payment_failed] userId from metadata:', userId)

          if (userId) {
            const { data: { user: authUser } } = await supabase.auth.admin.getUserById(userId)
            email = authUser?.email
            const fullName = (authUser?.user_metadata?.full_name as string | undefined) ?? ''
            firstName = fullName.split(' ')[0].trim() || 'Racer'
            console.log('[payment_failed] auth user email:', email ?? 'NOT FOUND')
          }

          const tier = failedSub.metadata?.tier ?? 'privateer'
          planName   = PLAN_NAMES[tier] ?? 'Privateer'
        }

        // Fallback: use customer email directly from the invoice / Stripe customer
        if (!email) {
          email = (invoice as any).customer_email ?? undefined
          console.log('[payment_failed] Fallback customer_email on invoice:', email ?? 'none')

          if (!email && invoice.customer) {
            console.log('[payment_failed] Looking up Stripe customer:', invoice.customer)
            const customer = await stripe.customers.retrieve(invoice.customer as string)
            if (!('deleted' in customer)) {
              email     = customer.email ?? undefined
              firstName = (customer.name ?? '').split(' ')[0].trim() || 'Racer'
            }
            console.log('[payment_failed] Customer email from Stripe:', email ?? 'NOT FOUND')
          }
        }

        if (!email) {
          console.log('[payment_failed] No email found via any path — skipping email')
          break
        }

        const appUrl    = Deno.env.get('APP_URL') ?? 'https://kart-connect.com'
        const amountDue = formatCurrency(invoice.amount_due, invoice.currency)
        console.log('[payment_failed] Building email — firstName:', firstName, '| plan:', planName, '| amount:', amountDue, '| to:', email)

        let html = paymentFailedHtml
        html = html
          .replaceAll('{{first_name}}',      firstName)
          .replaceAll('{{plan_name}}',       planName)
          .replaceAll('{{amount_due}}',      amountDue)
          .replaceAll('{{manage_url}}',      `${appUrl}/account`)
          .replaceAll('{{privacy_url}}',     `${appUrl}/privacy`)
          .replaceAll('{{terms_url}}',       `${appUrl}/terms`)
          .replaceAll('{{unsubscribe_url}}', `${appUrl}/unsubscribe`)
          .replaceAll('{{app_url}}',         appUrl)
        await sendResendEmail(email, `Action required: Your Kart Connect payment failed`, html)
        console.log('[payment_failed] Email sent to:', email)
      } catch (emailErr) {
        console.error('[payment_failed] Error:', (emailErr as Error).message)
      }
      break
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice

      // Only send for renewals, not the first payment (handled by subscription.created)
      if (invoice.billing_reason !== 'subscription_cycle') break

      const renewedSubId = invoice.subscription as string | null
      if (!renewedSubId) break

      // Update DB status back to active (in case it was past_due)
      await supabase.from('subscriptions')
        .update({ status: 'active' })
        .eq('stripe_subscription_id', renewedSubId)

      try {
        const renewedSub = await stripe.subscriptions.retrieve(renewedSubId)
        const userId     = renewedSub.metadata?.supabase_user_id
        if (!userId) break
        const { data: { user: authUser } } = await supabase.auth.admin.getUserById(userId)
        const email = authUser?.email
        if (!email) break

        const fullName  = (authUser.user_metadata?.full_name as string | undefined) ?? ''
        const firstName = fullName.split(' ')[0].trim() || 'Racer'
        const tier      = renewedSub.metadata?.tier ?? 'privateer'
        const planName  = PLAN_NAMES[tier] ?? 'Privateer'
        const appUrl    = Deno.env.get('APP_URL') ?? 'https://kart-connect.com'
        const amountPaid  = formatCurrency(invoice.amount_paid, invoice.currency)
        const paymentDate = formatDate(invoice.status_transitions?.paid_at ?? null)
        const subItem     = renewedSub.items.data[0]
        const nextBillingDate = formatDate(subItem?.current_period_end)

        // Card details and invoice number
        let cardBrand = 'Card', cardLast4 = '****', invoiceNumber = ''
        const fullInvoice = await stripe.invoices.retrieve(invoice.id, {
          expand: ['payment_intent.payment_method'],
        })
        const pm = (fullInvoice as any).payment_intent?.payment_method
        if (pm?.card) {
          cardBrand = pm.card.brand ?? 'Card'
          cardLast4 = pm.card.last4 ?? '****'
        }
        const { data: kcInvoiceNum } = await supabase.rpc('get_next_invoice_number')
        invoiceNumber = kcInvoiceNum ?? invoice.number ?? ''

        let html = subscriptionRenewedHtml
        html = html
          .replaceAll('{{first_name}}',       firstName)
          .replaceAll('{{plan_name}}',         planName)
          .replaceAll('{{amount_paid}}',       amountPaid)
          .replaceAll('{{payment_date}}',      paymentDate)
          .replaceAll('{{next_billing_date}}', nextBillingDate)
          .replaceAll('{{card_brand}}',        cardBrand.charAt(0).toUpperCase() + cardBrand.slice(1))
          .replaceAll('{{card_last4}}',        cardLast4)
          .replaceAll('{{invoice_number}}',    invoiceNumber)
          .replaceAll('{{manage_url}}',        `${appUrl}/account`)
          .replaceAll('{{privacy_url}}',       `${appUrl}/privacy`)
          .replaceAll('{{terms_url}}',         `${appUrl}/terms`)
          .replaceAll('{{unsubscribe_url}}',   `${appUrl}/unsubscribe`)
          .replaceAll('{{app_url}}',           appUrl)
        console.log('[payment_succeeded] Sending renewal email to:', email)
        await sendResendEmail(email, `Your Kart Connect subscription has renewed – ${planName}`, html)
      } catch (emailErr) {
        console.error('[payment_succeeded] Failed to send renewal email:', (emailErr as Error).message)
      }
      break
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
