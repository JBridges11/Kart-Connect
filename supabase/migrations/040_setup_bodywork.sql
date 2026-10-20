alter table setups
  add column if not exists bodywork text check (bodywork in ('Tight', 'Loose'));
