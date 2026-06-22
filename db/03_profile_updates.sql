-- ============================================================================
-- Migration 03 — let users edit their own profile (display name)
-- ----------------------------------------------------------------------------
-- Migration 02 only allowed READING profiles. This adds an UPDATE policy so a
-- user can change their own full_name. Additive — run it once in the Supabase
-- SQL Editor (New query -> paste -> Run).
-- ============================================================================

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());
