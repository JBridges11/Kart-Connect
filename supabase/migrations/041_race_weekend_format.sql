alter table race_weekends
  add column if not exists weekend_format jsonb;
