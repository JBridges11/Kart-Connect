alter table sessions
  add column if not exists wind_speed_mph numeric(5,1);
