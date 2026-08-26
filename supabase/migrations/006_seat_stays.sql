alter table setups
  add column if not exists seat_stay_left  text check (seat_stay_left  in ('Yes', 'No')),
  add column if not exists seat_stay_right text check (seat_stay_right in ('Yes', 'No'));
