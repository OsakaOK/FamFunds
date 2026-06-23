-- ============================================================================
-- FamFunds migration — OVERALL monthly budget per space
-- ----------------------------------------------------------------------------
-- Adds the single top-line "are we okay this month?" budget the Home screen
-- measures total spend against. Per-category budgets stay as the drill-down.
--
-- SAFE TO RUN ON EXISTING DATA — it only ADDS a table + policies and replaces
-- one function. It does NOT drop anything. Run once in Supabase -> SQL Editor.
-- (Already folded into supabase_schema.sql for fresh setups.)
-- ============================================================================

-- 1. The table: one overall limit per (space, month).
create table if not exists public.space_budgets (
  id          uuid primary key default gen_random_uuid(),
  space_id    uuid not null references public.spaces (id) on delete cascade,
  month       date not null, -- first day of the month
  total_limit numeric(12, 2) not null check (total_limit >= 0),
  created_at  timestamptz not null default now(),
  unique (space_id, month)
);

-- 2. Row level security: members read, only admins manage (mirrors budgets).
alter table public.space_budgets enable row level security;

drop policy if exists "view space total budget"   on public.space_budgets;
drop policy if exists "admins manage total budget" on public.space_budgets;

create policy "view space total budget" on public.space_budgets for select
  using (public.is_member_of(space_id));
create policy "admins manage total budget" on public.space_budgets for all
  using (public.is_admin_of(space_id)) with check (public.is_admin_of(space_id));

-- 3. Auto-carry: when a new month is first touched, also copy the overall budget
--    forward from the nearest prior established month (same rule as categories).
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
    insert into space_budgets (space_id, month, total_limit)
      select space, m, total_limit from space_budgets where space_id = space and month = prior
      on conflict (space_id, month) do nothing;
  end if;
end;
$$;
