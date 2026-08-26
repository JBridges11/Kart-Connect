-- Allow tracks to be deleted even when sessions or race_weekends reference them.
-- Sessions: make track_id nullable and switch FK to SET NULL.
-- Race weekends: switch FK to SET NULL (also make nullable).

ALTER TABLE public.sessions ALTER COLUMN track_id DROP NOT NULL;
ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_track_id_fkey;
ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_track_id_fkey
  FOREIGN KEY (track_id) REFERENCES public.tracks(id) ON DELETE SET NULL;

ALTER TABLE public.race_weekends ALTER COLUMN track_id DROP NOT NULL;
ALTER TABLE public.race_weekends DROP CONSTRAINT IF EXISTS race_weekends_track_id_fkey;
ALTER TABLE public.race_weekends
  ADD CONSTRAINT race_weekends_track_id_fkey
  FOREIGN KEY (track_id) REFERENCES public.tracks(id) ON DELETE SET NULL;
