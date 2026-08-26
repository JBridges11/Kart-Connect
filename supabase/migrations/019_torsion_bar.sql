alter table setups
  add column if not exists torsion_bar text check (torsion_bar in ('None', 'Soft', 'Med', 'Hard'));
