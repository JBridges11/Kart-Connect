alter table sessions drop constraint sessions_kart_id_fkey;
alter table sessions add constraint sessions_kart_id_fkey
  foreign key (kart_id) references karts(id) on delete set null;
