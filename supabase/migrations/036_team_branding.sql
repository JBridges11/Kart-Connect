create table if not exists public.team_branding (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  team_name  text,
  logo_url   text,
  updated_at timestamptz not null default now()
);

alter table public.team_branding enable row level security;

create policy "own branding"
  on public.team_branding for all
  using (user_id = auth.uid());

insert into storage.buckets (id, name, public)
  values ('team-logos', 'team-logos', true)
  on conflict (id) do nothing;

create policy "team logo upload"
  on storage.objects for insert
  with check (bucket_id = 'team-logos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "team logo read"
  on storage.objects for select
  using (bucket_id = 'team-logos');

create policy "team logo update"
  on storage.objects for update
  using (bucket_id = 'team-logos' and auth.uid()::text = (storage.foldername(name))[1]);
