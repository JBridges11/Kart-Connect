alter table setups
  add column if not exists chassis_make   text,
  add column if not exists engine_number  text,
  add column if not exists engine_rank    integer check (engine_rank between 1 and 5);
