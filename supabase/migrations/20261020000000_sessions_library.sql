-- Session library: stores uploaded data logger files per user
create table public.sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users not null,
  filename     text not null,
  brand        text not null,         -- 'unipro' | 'aim' | 'starlane' | 'alfano' | 'unknown'
  storage_path text not null,         -- path inside session-files bucket
  lap_count    int,
  duration_s   numeric,
  created_at   timestamptz default now()
);

alter table public.sessions enable row level security;

create policy "Users manage own sessions"
  on public.sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index sessions_user_id_idx on public.sessions (user_id, created_at desc);
