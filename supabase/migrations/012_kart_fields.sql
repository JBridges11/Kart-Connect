alter table karts
  add column if not exists kart_make      text,
  add column if not exists kart_model     text,
  add column if not exists chassis_number text,
  add column if not exists engine_make    text,
  add column if not exists kart_class     text,
  add column if not exists engine_number  text;
