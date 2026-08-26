-- Store manager's unit preferences on the race weekend so drivers see the same units via QR
ALTER TABLE public.race_weekends
  ADD COLUMN IF NOT EXISTS pressure_unit TEXT NOT NULL DEFAULT 'bar'
    CHECK (pressure_unit IN ('bar', 'psi')),
  ADD COLUMN IF NOT EXISTS alt_unit TEXT NOT NULL DEFAULT 'm'
    CHECK (alt_unit IN ('m', 'ft')),
  ADD COLUMN IF NOT EXISTS temp_unit TEXT NOT NULL DEFAULT 'c'
    CHECK (temp_unit IN ('c', 'f')),
  ADD COLUMN IF NOT EXISTS speed_unit TEXT NOT NULL DEFAULT 'kph'
    CHECK (speed_unit IN ('kph', 'mph'));
