alter table public.profiles
  add column if not exists stripe_connect_account_id text,
  add column if not exists payouts_enabled boolean default false,