-- Track whether a user has ever started a free trial so it cannot be repeated.
-- Defaults to false for existing rows; the stripe-webhook sets it to true when
-- a trialing subscription is first created.

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS has_trialed BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill: anyone whose current status is 'trialing' has already started a trial
UPDATE subscriptions SET has_trialed = TRUE WHERE status = 'trialing';
