-- Seat stay values changed from Yes/No to None/1/2
-- Clear any legacy Yes/No values first, then update the CHECK constraint
UPDATE public.setups SET seat_stay_left  = NULL WHERE seat_stay_left  IN ('Yes', 'No');
UPDATE public.setups SET seat_stay_right = NULL WHERE seat_stay_right IN ('Yes', 'No');

ALTER TABLE public.setups DROP CONSTRAINT IF EXISTS setups_seat_stay_left_check;
ALTER TABLE public.setups DROP CONSTRAINT IF EXISTS setups_seat_stay_right_check;

ALTER TABLE public.setups
  ADD CONSTRAINT setups_seat_stay_left_check  CHECK (seat_stay_left  IN ('None', '1', '2')),
  ADD CONSTRAINT setups_seat_stay_right_check CHECK (seat_stay_right IN ('None', '1', '2'));
