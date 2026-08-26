-- Add session_ids JSONB column to track per-slot session references
-- The save function stores { "1": "uuid", "2": "uuid", ... } here
ALTER TABLE public.race_weekend_drivers
  ADD COLUMN IF NOT EXISTS session_ids JSONB NOT NULL DEFAULT '{}';
