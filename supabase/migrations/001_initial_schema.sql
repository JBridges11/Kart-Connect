-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ============================================================
-- TRACKS
-- ============================================================
create table tracks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  country      text,
  circuit_type text check (circuit_type in ('indoor', 'outdoor')),
  layout_notes text,
  created_at   timestamptz not null default now()
);

create index on tracks(user_id);
alter table tracks enable row level security;
create policy "own tracks" on tracks
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- KARTS
-- ============================================================
create table karts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  nickname     text not null,
  chassis_type text not null,
  engine_type  text not null,
  notes        text,
  created_at   timestamptz not null default now()
);

create index on karts(user_id);
alter table karts enable row level security;
create policy "own karts" on karts
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- SESSIONS
-- ============================================================
create table sessions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  kart_id           uuid not null references karts(id) on delete restrict,
  track_id          uuid not null references tracks(id) on delete restrict,
  session_date      date not null,
  conditions        text check (conditions in ('dry', 'wet', 'damp')),
  air_temp_c        numeric(4,1),
  track_temp_c      numeric(4,1),
  humidity_pct      numeric(5,2),
  wind_description  text,
  session_type      text not null check (session_type in ('practice', 'qualifying', 'race', 'testing')),
  best_lap_time_ms  integer,
  total_laps        integer,
  notes             text,
  created_at        timestamptz not null default now()
);

create index on sessions(user_id);
create index on sessions(track_id);
create index on sessions(kart_id);
alter table sessions enable row level security;
create policy "own sessions" on sessions
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- SETUPS (one-to-one with session)
-- ============================================================
create table setups (
  id                     uuid primary key default gen_random_uuid(),
  session_id             uuid not null unique references sessions(id) on delete cascade,
  created_at             timestamptz not null default now(),

  -- The Kart (required)
  chassis_type           text not null,
  engine_type            text not null,

  -- Rear
  rear_bumper            text check (rear_bumper in ('Loose', 'Tight')),
  rear_width_mm          numeric(6,1),
  rear_hub_length_mm     numeric(5,1),
  third_bearing          boolean,
  axle_height            text check (axle_height in ('Low', 'Med', 'High')),
  brake_pads             text check (brake_pads in ('Soft', 'Med', 'Hard')),

  -- Engine
  rear_sprocket_teeth    integer,
  engine_sprocket_teeth  integer,
  sprocket_carrier_type  text check (sprocket_carrier_type in ('Loose', 'Fixed')),
  chain_measurement      text,
  spark_plug             text,

  -- Carb
  main_jet               text,
  air_screw              text,
  needle_position        text,

  -- Front End
  front_width_mm         numeric(6,1),
  front_hub_length_mm    numeric(5,1),
  right_height           text check (right_height in ('Lowest', 'Low', 'Med', 'High', 'Highest')),
  camber                 text,
  caster                 text,
  toe                    text,
  stub_axle              text check (stub_axle in ('Soft', 'Hard')),

  -- Wheels & Tyres
  wheel_type             text check (wheel_type in ('Summer', 'Winter', 'Wet')),
  tyre_make              text,
  tyre_model             text,
  tyre_pressure_fl       numeric(5,2),
  tyre_pressure_fr       numeric(5,2),
  tyre_pressure_rl       numeric(5,2),
  tyre_pressure_rr       numeric(5,2)
);

create index on setups(session_id);
alter table setups enable row level security;

-- RLS via session ownership
create policy "own setups" on setups
  for all using (
    exists (
      select 1 from sessions s
      where s.id = setups.session_id
        and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from sessions s
      where s.id = setups.session_id
        and s.user_id = auth.uid()
    )
  );

-- ============================================================
-- SETUP_CHANGES
-- ============================================================
create table setup_changes (
  id                 uuid primary key default gen_random_uuid(),
  session_id         uuid not null references sessions(id) on delete cascade,
  from_setup_id      uuid references setups(id) on delete set null,
  to_setup_id        uuid references setups(id) on delete set null,
  change_description text not null,
  lap_delta_ms       integer,
  driver_feedback    text,
  timestamp          timestamptz not null default now()
);

create index on setup_changes(session_id);
alter table setup_changes enable row level security;
create policy "own setup_changes" on setup_changes
  for all using (
    exists (
      select 1 from sessions s
      where s.id = setup_changes.session_id
        and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from sessions s
      where s.id = setup_changes.session_id
        and s.user_id = auth.uid()
    )
  );

-- ============================================================
-- LAP_TIMES
-- ============================================================
create table lap_times (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references sessions(id) on delete cascade,
  lap_number   integer not null,
  lap_time_ms  integer not null,
  notes        text,
  unique (session_id, lap_number)
);

create index on lap_times(session_id);
alter table lap_times enable row level security;
create policy "own lap_times" on lap_times
  for all using (
    exists (
      select 1 from sessions s
      where s.id = lap_times.session_id
        and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from sessions s
      where s.id = lap_times.session_id
        and s.user_id = auth.uid()
    )
  );
