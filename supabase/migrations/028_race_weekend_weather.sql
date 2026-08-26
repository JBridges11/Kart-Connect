ALTER TABLE public.race_weekends
  ADD COLUMN IF NOT EXISTS conditions          TEXT,
  ADD COLUMN IF NOT EXISTS weather_description TEXT,
  ADD COLUMN IF NOT EXISTS air_temp_c          NUMERIC,
  ADD COLUMN IF NOT EXISTS humidity_pct        NUMERIC,
  ADD COLUMN IF NOT EXISTS wind_speed_mph      NUMERIC,
  ADD COLUMN IF NOT EXISTS altitude_m          NUMERIC;
