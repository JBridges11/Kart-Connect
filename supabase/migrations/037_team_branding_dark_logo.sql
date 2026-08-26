-- Add dark-background logo variant to team_branding
ALTER TABLE public.team_branding
  ADD COLUMN IF NOT EXISTS logo_url_dark TEXT;
