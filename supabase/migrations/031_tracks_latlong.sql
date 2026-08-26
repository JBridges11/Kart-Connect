-- Store precise GPS coordinates per track so weather is fetched for the exact location
ALTER TABLE public.tracks
  ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;
