alter table sessions
  add column if not exists event_name text;
