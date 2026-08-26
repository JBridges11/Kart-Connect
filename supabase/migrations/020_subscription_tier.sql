alter table subscriptions
  add column if not exists tier text
    check (tier in ('privateer', 'team', 'pro_team'));
