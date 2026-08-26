alter table setups
  add column if not exists third_bearing_type text
    check (third_bearing_type in ('Loose', 'Tight'));
