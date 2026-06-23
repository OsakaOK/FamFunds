-- ============================================================================
-- FamFunds database schema — "Spaces" model
-- ----------------------------------------------------------------------------
-- Core unit is a SPACE (the ledger that owns expenses, budgets, categories).
-- Two intrinsic kinds:
--   personal — auto-created per user at signup, private, never joinable/deletable
--   family   — shared via an invite code; all members see all expenses
--
-- HOW TO USE: Supabase -> SQL Editor -> New query -> paste this WHOLE file -> Run.
-- It drops & recreates everything (safe in dev — data is disposable) and folds in
-- the old db/02 + db/03 migrations. You only ever run this one file.
-- ============================================================================

-- Clean slate (old AND new object names) -------------------------------------
-- IMPORTANT: drop TABLES first. Their RLS policies depend on the helper
-- functions, so dropping the tables (CASCADE) removes those policies and frees
-- the functions to be dropped afterwards.
drop trigger if exists on_auth_user_created on auth.users;

-- tables (CASCADE also removes their policies + indexes)
drop table if exists public.budget_months cascade;
drop table if exists public.budgets cascade;
drop table if exists public.expenses cascade;
drop table if exists public.space_members cascade;
drop table if exists public.spaces cascade;
drop table if exists public.family_members cascade; -- legacy
drop table if exists public.families cascade;       -- legacy
drop table if exists public.profiles cascade;

-- functions (CASCADE as a safety net for any remaining dependents)
drop function if exists public.handle_new_user() cascade;
drop function if exists public.create_family(text) cascade;
drop function if exists public.join_family(text) cascade;
drop function if exists public.create_space(text) cascade;
drop function if exists public.join_space(text) cascade;
drop function if exists public.regenerate_invite_code(uuid) cascade;
drop function if exists public.leave_space(uuid) cascade;
drop function if exists public.promote_member(uuid, uuid) cascade;
drop function if exists public.remove_member(uuid, uuid) cascade;
drop function if exists public.ensure_budget_month(uuid, date) cascade;
drop function if exists public.is_member_of(uuid) cascade;
drop function if exists public.is_admin_of(uuid) cascade;
drop function if exists public.shares_family_with(uuid) cascade;
drop function if exists public.shares_space_with(uuid) cascade;

-- ============================================================================
-- TABLES
-- ============================================================================

-- Mirror of the safe auth fields so the app can show member names.
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text,
  full_name  text,
  created_at timestamptz not null default now()
);

-- A Space: the ledger. `kind` is stamped at creation and never changes.
-- invite_code is null for personal Spaces (they can't be joined).
create table public.spaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  kind        text not null check (kind in ('personal', 'family')),
  invite_code text unique,
  created_by  uuid not null references auth.users (id),
  created_at  timestamptz not null default now()
);

-- A user's participation in one Space, with a role.
create table public.space_members (
  id         uuid primary key default gen_random_uuid(),
  space_id   uuid not null references public.spaces (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now(),
  unique (space_id, user_id)
);

-- An expense. category is constrained to the global list. logger_name is a
-- snapshot of the logger's display name, so attribution survives them leaving.
create table public.expenses (
  id          uuid primary key default gen_random_uuid(),
  space_id    uuid not null references public.spaces (id) on delete cascade,
  user_id     uuid not null references auth.users (id),
  logger_name text,
  amount      numeric(12, 2) not null check (amount >= 0),
  category    text not null check (category in
                ('Groceries', 'Dining', 'Health', 'Entertainment', 'Shopping', 'Other')),
  note        text,
  spent_on    date not null default current_date,
  receipt_url text,
  created_at  timestamptz not null default now()
);

-- Budgets are per calendar month: one limit per (space, category, month).
create table public.budgets (
  id            uuid primary key default gen_random_uuid(),
  space_id      uuid not null references public.spaces (id) on delete cascade,
  category      text not null check (category in
                  ('Groceries', 'Dining', 'Health', 'Entertainment', 'Shopping', 'Other')),
  month         date not null, -- first day of the month
  monthly_limit numeric(12, 2) not null check (monthly_limit >= 0),
  created_at    timestamptz not null default now(),
  unique (space_id, category, month)
);

-- Marks a (space, month) whose budgets have been "established" — so we can tell
-- a deliberately-emptied month from a never-touched one (no auto-refill).
create table public.budget_months (
  space_id       uuid not null references public.spaces (id) on delete cascade,
  month          date not null,
  established_at timestamptz not null default now(),
  primary key (space_id, month)
);

create index on public.space_members (user_id);
create index on public.expenses (space_id, spent_on);
create index on public.budgets (space_id, month);

-- ============================================================================
-- SECURITY-DEFINER HELPERS (bypass RLS internally to avoid recursion)
-- ============================================================================
create or replace function public.is_member_of(space uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from space_members where space_id = space and user_id = auth.uid());
$$;

create or replace function public.is_admin_of(space uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from space_members
    where space_id = space and user_id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.shares_space_with(other uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from space_members a
    join space_members b on a.space_id = b.space_id
    where a.user_id = auth.uid() and b.user_id = other
  );
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.profiles      enable row level security;
alter table public.spaces        enable row level security;
alter table public.space_members enable row level security;
alter table public.expenses      enable row level security;
alter table public.budgets       enable row level security;
alter table public.budget_months enable row level security;

-- profiles: see your own + anyone you share a Space with; edit your own.
create policy "view profiles in my spaces" on public.profiles for select
  using (id = auth.uid() or public.shares_space_with(id));
create policy "update own profile" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- spaces: see Spaces you belong to. (Creation/changes go through RPCs.)
create policy "view own spaces" on public.spaces for select
  using (public.is_member_of(id));

-- space_members: see the members of your Spaces.
create policy "view own space members" on public.space_members for select
  using (public.is_member_of(space_id));

-- expenses: members read all; insert your own; edit/delete your own OR (admin) any.
create policy "view space expenses" on public.expenses for select
  using (public.is_member_of(space_id));
create policy "add own expenses" on public.expenses for insert
  with check (public.is_member_of(space_id) and user_id = auth.uid());
create policy "edit own or admin" on public.expenses for update
  using (public.is_member_of(space_id) and (user_id = auth.uid() or public.is_admin_of(space_id)));
create policy "delete own or admin" on public.expenses for delete
  using (public.is_member_of(space_id) and (user_id = auth.uid() or public.is_admin_of(space_id)));

-- budgets: members read; only admins manage.
create policy "view space budgets" on public.budgets for select
  using (public.is_member_of(space_id));
create policy "admins manage budgets" on public.budgets for all
  using (public.is_admin_of(space_id)) with check (public.is_admin_of(space_id));

-- budget_months: members read (writes happen via ensure_budget_month RPC).
create policy "view budget months" on public.budget_months for select
  using (public.is_member_of(space_id));

-- ============================================================================
-- SIGNUP: create a profile AND a permanent Personal Space for every new user.
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare sid uuid;
begin
  insert into public.profiles (id, email) values (new.id, new.email)
    on conflict (id) do nothing;
  insert into public.spaces (name, kind, created_by) values ('Personal', 'personal', new.id)
    returning id into sid;
  insert into public.space_members (space_id, user_id, role) values (sid, new.id, 'admin');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- RPCs
-- ============================================================================

-- Create a FAMILY Space (with invite code) and make the creator its admin.
create or replace function public.create_space(space_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_code text; sid uuid;
begin
  loop
    new_code := upper(substr(md5(random()::text), 1, 6));
    exit when not exists (select 1 from spaces where invite_code = new_code);
  end loop;
  insert into spaces (name, kind, invite_code, created_by)
    values (space_name, 'family', new_code, auth.uid()) returning id into sid;
  insert into space_members (space_id, user_id, role) values (sid, auth.uid(), 'admin');
  return sid;
end;
$$;

-- Join a FAMILY Space by code. Personal Spaces (and bad codes) are rejected.
create or replace function public.join_space(code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare sid uuid; k text;
begin
  select id, kind into sid, k from spaces where invite_code = upper(code);
  if sid is null then raise exception 'Invalid invite code'; end if;
  if k <> 'family' then raise exception 'That space cannot be joined'; end if;
  insert into space_members (space_id, user_id, role) values (sid, auth.uid(), 'member')
    on conflict (space_id, user_id) do nothing;
  return sid;
end;
$$;

-- Admin rotates the invite code (invalidating the old one).
create or replace function public.regenerate_invite_code(space uuid)
returns text language plpgsql security definer set search_path = public as $$
declare new_code text;
begin
  if not public.is_admin_of(space) then raise exception 'Only an admin can regenerate the code'; end if;
  loop
    new_code := upper(substr(md5(random()::text), 1, 6));
    exit when not exists (select 1 from spaces where invite_code = new_code);
  end loop;
  update spaces set invite_code = new_code where id = space and kind = 'family';
  return new_code;
end;
$$;

-- Leave a family Space. Can't leave Personal. Last admin must promote first
-- (unless they're the only member, in which case the empty Space is removed).
create or replace function public.leave_space(space uuid)
returns void language plpgsql security definer set search_path = public as $$
declare k text; total int; admins int;
begin
  select kind into k from spaces where id = space;
  if k = 'personal' then raise exception 'You cannot leave your Personal Space'; end if;
  if not public.is_member_of(space) then raise exception 'You are not a member'; end if;

  select count(*) into total from space_members where space_id = space;
  select count(*) into admins from space_members where space_id = space and role = 'admin';
  if public.is_admin_of(space) and admins <= 1 and total > 1 then
    raise exception 'Promote another member to admin before leaving';
  end if;

  delete from space_members where space_id = space and user_id = auth.uid();
  if not exists (select 1 from space_members where space_id = space) then
    delete from spaces where id = space; -- last one out deletes the empty Space
  end if;
end;
$$;

-- Admin promotes another member to admin.
create or replace function public.promote_member(space uuid, target uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin_of(space) then raise exception 'Only an admin can promote members'; end if;
  update space_members set role = 'admin' where space_id = space and user_id = target;
end;
$$;

-- Admin removes another member (their expenses stay, attributed by snapshot name).
create or replace function public.remove_member(space uuid, target uuid)
returns void language plpgsql security definer set search_path = public as $$
declare k text;
begin
  if not public.is_admin_of(space) then raise exception 'Only an admin can remove members'; end if;
  select kind into k from spaces where id = space;
  if k = 'personal' then raise exception 'Not applicable to a Personal Space'; end if;
  if target = auth.uid() then raise exception 'Use "leave" to remove yourself'; end if;
  delete from space_members where space_id = space and user_id = target;
end;
$$;

-- Auto-carry: the first time a month is touched, copy budgets forward from the
-- nearest prior established month, and mark this month established. A month that
-- was deliberately emptied stays established (no rows) and won't be re-filled.
create or replace function public.ensure_budget_month(space uuid, m date)
returns void language plpgsql security definer set search_path = public as $$
declare prior date;
begin
  if not public.is_member_of(space) then return; end if;
  if exists (select 1 from budget_months where space_id = space and month = m) then return; end if;

  select max(month) into prior from budget_months where space_id = space and month < m;
  insert into budget_months (space_id, month) values (space, m) on conflict do nothing;

  if prior is not null then
    insert into budgets (space_id, category, month, monthly_limit)
      select space, category, m, monthly_limit from budgets where space_id = space and month = prior
      on conflict (space_id, category, month) do nothing;
  end if;
end;
$$;

grant execute on function public.create_space(text)            to authenticated;
grant execute on function public.join_space(text)              to authenticated;
grant execute on function public.regenerate_invite_code(uuid)  to authenticated;
grant execute on function public.leave_space(uuid)             to authenticated;
grant execute on function public.promote_member(uuid, uuid)    to authenticated;
grant execute on function public.remove_member(uuid, uuid)     to authenticated;
grant execute on function public.ensure_budget_month(uuid, date) to authenticated;

-- ============================================================================
-- BACKFILL: give every existing user a profile + a Personal Space.
-- (New users get theirs from the trigger above.)
-- ============================================================================
do $$
declare u record; sid uuid;
begin
  for u in select id, email from auth.users loop
    insert into public.profiles (id, email) values (u.id, u.email) on conflict (id) do nothing;
    if not exists (
      select 1 from spaces s join space_members m on m.space_id = s.id
      where s.kind = 'personal' and m.user_id = u.id
    ) then
      insert into public.spaces (name, kind, created_by) values ('Personal', 'personal', u.id)
        returning id into sid;
      insert into public.space_members (space_id, user_id, role) values (sid, u.id, 'admin');
    end if;
  end loop;
end;
$$;
