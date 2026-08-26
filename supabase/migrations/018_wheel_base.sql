alter table setups
  add column if not exists wheel_base text check (wheel_base in ('Standard', 'Short', 'Long'));
