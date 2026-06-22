-- ============================================================================
-- FamFunds database schema
-- ----------------------------------------------------------------------------
-- HOW TO USE: open your Supabase project -> SQL Editor -> New query ->
-- paste this whole file -> Run. Safe to re-run (it drops & recreates).
-- ============================================================================

-- Clean slate (so you can re-run this file while developing) ------------------
drop function if exists public.create_family(text);
drop function if exists public.join_family(text);
drop function if exists public.is_member_of(uuid);
drop table if exists public.budgets cascade;
drop table if exists public.expenses cascade;
drop table if exists public.family_members cascade;
drop table if exists public.families cascade;

-- ============================================================================
-- TABLES
-- ============================================================================

-- A family group. One row per family. The invite_code lets others join.
create table public.families (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  invite_code text unique not null,
  created_by  uuid not null references auth.users (id),
  created_at  timestamptz not null default now()
);

-- Links users to families (a join table). Roles: admin or member.
create table public.family_members (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references public.families (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now(),
  unique (family_id, user_id)   -- a user can't join the same family twice
);

-- The main data table: every logged expense.
create table public.expenses (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references public.families (id) on delete cascade,
  user_id     uuid not null references auth.users (id),
  amount      numeric(12, 2) not null check (amount >= 0),
  category    text not null,
  note        text,
  spent_on    date not null default current_date,
  receipt_url text,
  created_at  timestamptz not null default now()
);

-- Monthly budget limits, one row per category per family.
create table public.budgets (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid not null references public.families (id) on delete cascade,
  category      text not null,
  monthly_limit numeric(12, 2) not null check (monthly_limit >= 0),
  created_at    timestamptz not null default now(),
  unique (family_id, category)
);

-- Helpful indexes for common lookups.
create index on public.family_members (user_id);
create index on public.expenses (family_id, spent_on);

-- ============================================================================
-- HELPER: is the current user a member of a given family?
-- ----------------------------------------------------------------------------
-- "security definer" lets this run with elevated rights so it can check
-- membership WITHOUT triggering the RLS policies again (which would loop).
-- ============================================================================
create or replace function public.is_member_of(fam uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.family_members
    where family_id = fam and user_id = auth.uid()
  );
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- Turn it on for every table, then add policies. With RLS on and no matching
-- policy, access is DENIED by default — exactly what we want.
-- ============================================================================
alter table public.families       enable row level security;
alter table public.family_members enable row level security;
alter table public.expenses       enable row level security;
alter table public.budgets        enable row level security;

-- families: you can only see families you belong to.
create policy "view own families"
  on public.families for select
  using (public.is_member_of(id));

-- family_members: you can see the members of your own families.
create policy "view own family members"
  on public.family_members for select
  using (public.is_member_of(family_id));

-- expenses: members can read/add/edit/delete expenses in their families.
create policy "view family expenses"
  on public.expenses for select
  using (public.is_member_of(family_id));

create policy "add own expenses"
  on public.expenses for insert
  with check (public.is_member_of(family_id) and user_id = auth.uid());

create policy "edit own expenses"
  on public.expenses for update
  using (public.is_member_of(family_id) and user_id = auth.uid());

create policy "delete own expenses"
  on public.expenses for delete
  using (public.is_member_of(family_id) and user_id = auth.uid());

-- budgets: any family member can view and manage the family's budgets.
create policy "view family budgets"
  on public.budgets for select
  using (public.is_member_of(family_id));

create policy "manage family budgets"
  on public.budgets for all
  using (public.is_member_of(family_id))
  with check (public.is_member_of(family_id));

-- ============================================================================
-- RPC: create a family (and make the creator its admin)
-- The app calls supabase.rpc('create_family', { family_name: '...' }).
-- ============================================================================
create or replace function public.create_family(family_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_code      text;
  new_family_id uuid;
begin
  -- Generate a unique 6-character invite code.
  loop
    new_code := upper(substr(md5(random()::text), 1, 6));
    exit when not exists (select 1 from families where invite_code = new_code);
  end loop;

  insert into families (name, invite_code, created_by)
  values (family_name, new_code, auth.uid())
  returning id into new_family_id;

  insert into family_members (family_id, user_id, role)
  values (new_family_id, auth.uid(), 'admin');

  return new_family_id;
end;
$$;

-- ============================================================================
-- RPC: join a family with an invite code
-- The app calls supabase.rpc('join_family', { code: 'ABC123' }).
-- ============================================================================
create or replace function public.join_family(code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_family_id uuid;
begin
  select id into target_family_id
  from families
  where invite_code = upper(code);

  if target_family_id is null then
    raise exception 'Invalid invite code';
  end if;

  insert into family_members (family_id, user_id, role)
  values (target_family_id, auth.uid(), 'member')
  on conflict (family_id, user_id) do nothing;  -- already a member? no problem

  return target_family_id;
end;
$$;

-- Allow logged-in users to call these two functions.
grant execute on function public.create_family(text) to authenticated;
grant execute on function public.join_family(text) to authenticated;
