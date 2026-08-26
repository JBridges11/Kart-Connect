alter table setups
  add column if not exists tyre_condition text
    check (tyre_condition in ('New','1','2','3','4','5','6','7','8','8+'));
