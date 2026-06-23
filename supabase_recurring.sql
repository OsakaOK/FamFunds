-- ============================================================================
-- FamFunds migration — RECURRING CHARGES (rent, subscriptions, phone bill…)
-- ----------------------------------------------------------------------------
-- A recurring template auto-materialises into a real expense once per month, so
-- fixed/autopay costs aren't invisible and the budget bar stays honest.
--
-- SAFE TO RUN ON EXISTING DATA — only ADDS tables/columns/policies and replaces
-- one function. It does NOT drop anything. Run once in Supabase -> SQL Editor.
-- (Already folded into supabase_schema.sql for fresh setups.)
-- ============================================================================

-- 1. The template table.
create table if not exists public.recurring_expenses (
  id          uuid primary key default gen_random_uuid(),
  space_id    uuid not null references public.spaces (id) on delete cascade,
  user_id     uuid not null references auth.users (id),
  logger_name text,
  amount      numeric(12, 2) not null check (amount > 0),
  category    text not null check (category in
                ('Groceries', 'Dining', 'Health', 'Entertainment', 'Shopping', 'Other')),
  note        text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists recurring_expenses_space_id_idx on public.recurring_expenses (space_id);

-- 2. Link generated expenses back to their template.
alter table public.expenses
  add column if not exists recurring_id uuid references public.recurring_expenses (id) on delete set null;

-- 3. "Already generated this month" marker (so a deleted one doesn't resurrect).
create table if not exists public.recurring_runs (
  recurring_id uuid not null references public.recurring_expenses (id) on delete cascade,
  month        date not null,
  created_at   timestamptz not null default now(),
  primary key (recurring_id, month)
);

-- 4. Row level security.
alter table public.recurring_expenses enable row level security;
alter table public.recurring_runs     enable row level security;

drop policy if exists "view space recurring"        on public.recurring_expenses;
drop policy if exists "add own recurring"           on public.recurring_expenses;
drop policy if exists "edit own or admin recurring" on public.recurring_expenses;
drop policy if exists "delete own or admin recurring" on public.recurring_expenses;

create policy "view space recurring" on public.recurring_expenses for select
  using (public.is_member_of(space_id));
create policy "add own recurring" on public.recurring_expenses for insert
  with check (public.is_member_of(space_id) and user_id = auth.uid());
create policy "edit own or admin recurring" on public.recurring_expenses for update
  using (public.is_member_of(space_id) and (user_id = auth.uid() or public.is_admin_of(space_id)));
create policy "delete own or admin recurring" on public.recurring_expenses for delete
  using (public.is_member_of(space_id) and (user_id = auth.uid() or public.is_admin_of(space_id)));
-- recurring_runs: bookkeeping only, written by the RPC (security definer). RLS denies direct access.

-- 5. The generator: one expense per active template per month, ever; only from
--    the template's creation month onward; never into the future.
create or replace function public.ensure_recurring(space uuid, m date)
returns void language plpgsql security definer set search_path = public as $$
declare t record;
begin
  if not public.is_member_of(space) then return; end if;
  if m > date_trunc('month', current_date)::date then return; end if;

  for t in
    select * from recurring_expenses
    where space_id = space and active
      and date_trunc('month', created_at)::date <= m
  loop
    if exists (select 1 from recurring_runs where recurring_id = t.id and month = m) then
      continue;
    end if;
    insert into expenses (space_id, user_id, logger_name, amount, category, note, spent_on, recurring_id)
      values (space, t.user_id, t.logger_name, t.amount, t.category, t.note, m, t.id);
    insert into recurring_runs (recurring_id, month) values (t.id, m) on conflict do nothing;
  end loop;
end;
$$;

grant execute on function public.ensure_recurring(uuid, date) to authenticated;
