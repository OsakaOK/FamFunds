-- ============================================================================
-- Migration 02 — profiles
-- ----------------------------------------------------------------------------
-- Adds a public "profiles" table so the app can show each family member's name
-- next to their expenses. auth.users isn't directly readable by the app, so we
-- mirror the safe fields (email, full_name) into this table.
--
-- This migration is ADDITIVE — it does NOT drop your families/expenses data.
-- Run it in Supabase: SQL Editor -> New query -> paste -> Run.
-- ============================================================================

create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text,
  full_name  text,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: create profiles for anyone who already signed up before this migration.
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;

-- Helper: do I share at least one family with this other user?
-- security definer avoids re-triggering RLS (which would loop).
create or replace function public.shares_family_with(other uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from family_members a
    join family_members b on a.family_id = b.family_id
    where a.user_id = auth.uid() and b.user_id = other
  );
$$;

-- RLS: you can see your own profile, and the profiles of people in your families.
alter table public.profiles enable row level security;

drop policy if exists "view profiles in my families" on public.profiles;
create policy "view profiles in my families"
  on public.profiles for select
  using (id = auth.uid() or public.shares_family_with(id));
