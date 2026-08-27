import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'npm:stripe'

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

const PLAN_NAMES: Record<string, string> = {
  privateer: 'Privateer',
  team: 'Team',
  pro_team: 'Pro Team',
}

function getTemplateId(tier: string, interval: string, isTrialing: boolean): string | null {
  if (tier === 'privateer' && interval === 'month' && isTrialing) return 'c898abf1-8d6b-4b7d-a197-790ea0137ca8'
  if (tier === 'privateer' && interval === 'month')               return '80869b05-35bc-45e4-b1c8-b6eb3d9c9d46'
  if (tier === 'team'      && interval === 'month')               return '7023e5d6-1816-4dcd-ad61-ba7cf11e9436'
  if (tier === 'pro_team'  && interval === 'month')               return '8729a41c-95ed-421e-890d-ba014efe7deb'
  if (tier === 'privateer' && interval === 'year')                return 'cd9c46fa-832f-436a-a4a9-1e6355e6028b'
  if (tier === 'team'      && interval === 'year')                return '51189479-f495-4b2a-9342-1f5e8c3bff80'
  if (tier === 'pro_team'  && interval === 'year')                return '86932b2e-ee7a-475a-98c5-8d4df04f70eb'
  return null
}

async function sendResendEmail(
  to: string,
  templateId: string,
  variables: Record<string, string>,
) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'noreply@kart-connect.com',
      to: [to],
      template_id: templateId,
      with: variables,
    }),
  })
  if (!res.ok) {
    console.error('[email] Resend error:', await res.text())
  } else {
    console.log('[email] sent template', templateId, 'to', to)
  }
}

serve(async (req) => {
  const sig = req.headers.get('stripe-signature')
  const body = await req.text()

  if (!sig) return new Response('Missing stripe-signature header', { status: 400 })

  const valid = await verifyStripeSignature(body, sig, Deno.env.get('STRIPE_WEBHOOK_SECRET')!)
  if (!valid) return new Response('Invalid signature', { status: 400 })

  let event: Stripe.Event
  try {
    event = JSON.parse(body) as Stripe.Event
  } catch {
    return new Response('Invalid JSON body', { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.mode !== 'subscription') break

      const stripeSub = await stripe.subscriptions.retrieve(session.subscription as string)
      const userId = stripeSub.metadata.supabase_user_id
      const tier   = stripeSub.metadata.tier ?? 'privateer'
      if (!userId) break

      // Save subscription to DB
      await supabase.from('subscriptions').upsert({
        user_id: userId,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: stripeSub.id,
        status: stripeSub.status,
        tier,
        current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
      }, { onConflict: 'user_id' })

      // Send welcome / confirmation email via Resend
      try {
        const { data: { user: authUser } } = await supabase.auth.admin.getUserById(userId)
        const email = authUser?.email
        if (email) {
          const interval  = stripeSub.items.data[0]?.plan?.interval ?? 'month'
          const isTrialing = stripeSub.status === 'trialing'
          const templateId = getTemplateId(tier, interval, isTrialing)

          if (templateId) {
            const fullName  = (authUser.user_metadata?.full_name as string | undefined) ?? ''
            const firstName = fullName.split(' ')[0].trim() || 'Racer'
            const appUrl    = Deno.env.get('APP_URL') ?? 'https://kart-connect.com'
            const planName  = PLAN_NAMES[tier] ?? 'Privateer'

            await sendResendEmail(email, templateId, { first_name: firstName, plan_name: planName, app_url: appUrl })
          } else {
            console.warn('[email] no template for tier:', tier, 'interval:', interval, 'trialing:', isTrialing)
          }
        }
      } catch (emailErr) {
        // Email failure must not break the webhook response
        console.error('[email] failed to send welcome email:', (emailErr as Error).message)
      }

      break
    }

    case 'customer.subscription.updated': {
      const sub  = event.data.object as Stripe.Subscription
      const tier = sub.metadata.tier ?? undefined
      await supabase.from('subscriptions')
        .update({
          status: sub.status,
          tier,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        })
        .eq('stripe_subscription_id', sub.id)
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await supabase.from('subscriptions')
        .update({ status: 'canceled', tier: null })
        .eq('stripe_subscription_id', sub.id)
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      if (invoice.subscription) {
        await supabase.from('subscriptions')
          .update({ status: 'past_due' })
          .eq('stripe_subscription_id', invoice.subscription as string)
      }
      break
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
