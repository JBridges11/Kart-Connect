alter table setups
  add column if not exists axle_hardness text
    check (axle_hardness in ('Soft', 'Med', 'Hard')),
  add column if not exists axle_length text
    check (axle_length in ('Long', 'Short'));
