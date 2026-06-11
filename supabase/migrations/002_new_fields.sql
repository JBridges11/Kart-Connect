-- ============================================================
-- SESSIONS — weather description + altitude
-- ============================================================
alter table sessions
  add column if not exists weather_description text
    check (weather_description in ('Sunny','Light Sun','Cloudy','Light Rain','Rain','Heavy Rain','Snow')),
  add column if not exists altitude_m numeric(6,1);

-- ============================================================
-- SETUPS — new mechanical fields
-- ============================================================
alter table setups
  -- Rad tape (0 = none, 1–4 strips)
  add column if not exists tape_over_rad integer check (tape_over_rad between 0 and 4),

  -- Engine monitoring
  add column if not exists max_rpm           integer,
  add column if not exists low_rpm           integer,
  add column if not exists max_engine_temp_c numeric(5,1),
  add column if not exists low_engine_temp_c numeric(5,1),
  add column if not exists max_exhaust_temp_c numeric(5,1),
  add column if not exists low_exhaust_temp_c numeric(5,1),

  -- Carb additions
  add column if not exists float_height text,
  add column if not exists carb_year    text,

  -- Brakes
  add column if not exists brake_bias_pct numeric(4,1),

  -- Weight
  add column if not exists kart_driver_weight_kg numeric(5,2),

  -- Seat
  add column if not exists seat_hardness    text check (seat_hardness in ('Very Soft','Soft','Medium','Hard')),
  add column if not exists seat_bolts_front text check (seat_bolts_front in ('Loose','Tight')),
  add column if not exists seat_bolts_back  text check (seat_bolts_back  in ('Loose','Tight'));

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================
create table if not exists subscriptions (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null unique references auth.users(id) on delete cascade,
  stripe_customer_id       text,
  stripe_subscription_id   text,
  status                   text not null default 'trialing'
    check (status in ('trialing','active','past_due','canceled','incomplete')),
  trial_start              timestamptz not null default now(),
  trial_end                timestamptz not null default (now() + interval '3 days'),
  current_period_end       timestamptz,
  created_at               timestamptz not null default now()
);

create index if not exists subscriptions_user_id_idx on subscriptions(user_id);
alter table subscriptions enable row level security;

create policy "own subscription" on subscriptions
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
