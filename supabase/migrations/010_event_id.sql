alter table sessions
  add column if not exists event_id uuid;

create index if not exists sessions_event_id_idx on sessions (event_id);
