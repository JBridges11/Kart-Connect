alter table setups
  add column if not exists hot_pressure_fl numeric(5,2),
  add column if not exists hot_pressure_fr numeric(5,2),
  add column if not exists hot_pressure_rl numeric(5,2),
  add column if not exists hot_pressure_rr numeric(5,2);
