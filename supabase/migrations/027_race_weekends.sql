-- Extend sessions.session_type to include race_weekend
ALTER TABLE public.sessions
  DROP CONSTRAINT IF EXISTS sessions_session_type_check;
ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_session_type_check
  CHECK (session_type IN ('practice','qualifying','race','testing','race_weekend'));

-- Race weekend container (manager side)
CREATE TABLE IF NOT EXISTS public.race_weekends (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id        UUID NOT NULL REFERENCES public.tracks(id),
  session_name    TEXT NOT NULL,
  session_date    DATE NOT NULL,
  session_type    TEXT NOT NULL DEFAULT 'race_weekend'
                    CHECK (session_type IN ('practice','qualifying','race','race_weekend','testing')),
  is_live         BOOLEAN NOT NULL DEFAULT false,
  went_live_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  ended_at        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.race_weekends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manager full access to race_weekends"
  ON public.race_weekends FOR ALL
  USING (manager_id = auth.uid());

-- One row per selected driver per race weekend
CREATE TABLE IF NOT EXISTS public.race_weekend_drivers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  race_weekend_id       UUID NOT NULL REFERENCES public.race_weekends(id) ON DELETE CASCADE,
  manager_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kart_id               UUID NOT NULL REFERENCES public.karts(id) ON DELETE CASCADE,

  -- Snapshot of driver profile at creation time
  driver_name           TEXT NOT NULL,
  driver_class          TEXT,
  kart_make             TEXT,
  kart_model            TEXT,
  chassis_number        TEXT,
  chassis_stiffness     TEXT,
  engines_snapshot      JSONB,
  selected_engine_rank  INTEGER,

  -- Security token embedded in QR URL
  token                 TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  token_is_active       BOOLEAN NOT NULL DEFAULT false,

  -- Filled-in setup data accumulates as driver saves
  setup_data            JSONB,
  setup_started_at      TIMESTAMPTZ,
  setup_updated_at      TIMESTAMPTZ,
  setup_submitted       BOOLEAN NOT NULL DEFAULT false,
  submitted_at          TIMESTAMPTZ,

  -- Linked session/setup created on final submit
  session_id            UUID REFERENCES public.sessions(id),

  created_at            TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.race_weekend_drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manager full access to race_weekend_drivers"
  ON public.race_weekend_drivers FOR ALL
  USING (manager_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rwd_token      ON public.race_weekend_drivers(token);
CREATE INDEX IF NOT EXISTS idx_rwd_weekend    ON public.race_weekend_drivers(race_weekend_id);
CREATE INDEX IF NOT EXISTS idx_rw_manager     ON public.race_weekends(manager_id);
CREATE INDEX IF NOT EXISTS idx_rw_live        ON public.race_weekends(is_live, expires_at);

-- Auto-expire function called by hourly cron
CREATE OR REPLACE FUNCTION public.expire_race_weekends()
RETURNS void AS $$
  UPDATE public.race_weekends
    SET is_live = false, ended_at = now()
    WHERE is_live = true AND expires_at < now() AND ended_at IS NULL;
  UPDATE public.race_weekend_drivers
    SET token_is_active = false
    WHERE token_is_active = true
      AND race_weekend_id IN (
        SELECT id FROM public.race_weekends WHERE is_live = false
      );
$$ LANGUAGE sql SECURITY DEFINER;
