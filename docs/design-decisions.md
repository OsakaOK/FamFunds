# FamFunds — Design Decisions

> Reference doc from a domain-grilling session on 2026-06-22. Captures what FamFunds
> *is*, the 13 decisions that define its model, and the build list they imply.
> Companion files: [CONTEXT.md](../CONTEXT.md) (glossary) and
> [docs/adr/0001-spaces-not-families.md](adr/0001-spaces-not-families.md) (rename ADR).

## What FamFunds is

A **shared expense tracker built on Spaces.** A **Space** is the ledger that owns
expenses, budgets, and categories. Every Space is one of two intrinsic, permanent kinds:

- **Personal Space** — auto-created for every user at signup, private, never deletable, can never be shared.
- **Family Space** — shared by two or more members via an invite code; everyone in it sees every expense in it.

You switch which Space you're viewing. Within a Space, **Admins** are the financial
stewards (edit any expense, own the budget plan, control the invite code); regular
**members** log and manage only their own expenses.

## The 13 decisions

| # | Question | Decision |
|---|----------|----------|
| 1–2 | Personal vs shared | **Separate Spaces** you switch between (not a per-expense privacy flag) |
| 3 | Personal Space provisioning | **Auto-created at signup, permanent** — can't be deleted or left |
| 4 | Is "kind" intrinsic? | **Yes** — `kind` is stamped at creation, never derived from member count |
| 5 | Categories | **Global fixed list**, enforced as the single source of truth |
| 6 | Budgets | **Per calendar month**, each month independent with its own history |
| 7 | Empty future month | **Auto-carry** from the nearest prior month on first touch |
| 8 | Editing others' expenses | **Admins only**; members edit/delete their own |
| 9 | Member leaves / removed | **Keep their expenses**; snapshot their display name onto each entry |
| 10 | Invite code | **Rotatable**, Admin-only regeneration; Personal Spaces reject joins |
| 11 | Schema naming | **Rename `families` → `spaces`** + add `kind` (done now, dev-stage, no data) |
| 12 | Refunds | **Deferred** — expenses-only, `amount >= 0` stays |
| 13 | Who sets budgets | **Admins only** |

## Rationale highlights

- **Why separate Spaces (not a privacy flag):** a privacy guarantee you can trust ("no one
  can ever see my Personal Space") only holds if Personal is a hard, unchangeable property —
  not a side effect of the current headcount. Hence intrinsic `kind`.
- **Why per-month budgets:** a single perpetual limit can't answer "did we stay under budget
  last December?" — past months retroactively inherit today's number. Per-month preserves history.
- **Why auto-carry on first touch:** keeps per-month independence without forcing users to
  re-enter budgets every month. Must track "this month has its own budgets" separately from
  "this month currently has rows," so a deliberately-emptied month isn't re-filled.
- **Why keep a departed member's expenses:** the money was really spent — a shared ledger
  shouldn't grow holes when someone leaves. Requires denormalizing the logger's display name
  onto the expense, because RLS stops resolving a non-member's profile for everyone else.
- **Why rename to `spaces` now:** the model's core noun is "Space"; the schema said "family."
  Renaming live tables is effectively one-way, so it's never cheaper than dev-stage with no data.
- **Why defer refunds:** the product sentence is "see where your money goes" — a spending
  tracker. "Settle up between members" is a separate feature (a Splitwise) that would double scope.

## Build list (what the decisions imply)

1. **Rename migration:** `families→spaces`, `family_members→space_members`, `family_id→space_id`;
   RPCs `create_family→create_space`, `join_family→join_space`.
2. **Add `spaces.kind`** (`personal` | `family`); make `invite_code` nullable (Personal has none).
3. **Auto-provision** a Personal Space in the `handle_new_user` trigger (alongside the profile row);
   **remove the `FamilySetupScreen` gate** so users land in their Personal feed. "Zero spaces" is no longer reachable.
4. **`join_space` guards `kind = 'family'`** so Personal Spaces refuse joins.
5. **Enforce the category list at the DB** (check constraint or FK) on `expenses.category` and `budgets.category`.
6. **`budgets`: add a `month` column**, change the unique constraint to `(space_id, category, month)`;
   implement auto-carry with "touched"/established tracking so emptied months don't re-fill.
7. **New `is_admin_of(space_id)` security-definer helper**; expense edit/delete policy → `user_id = auth.uid() OR is_admin_of(space_id)`.
8. **Snapshot the logger's display name** onto `expenses` at insert; build leave / remove-member /
   promote-admin flows (last admin can't leave without promoting first).
9. **`regenerate_invite_code` RPC** (Admin-only).
10. **Budgets management policy → Admin-only** (`is_admin_of`, replacing the current `is_member_of`).
11. **`expenses.amount` keeps `>= 0`** — refunds deferred; a return is handled by editing/deleting the original.

## Open areas not yet grilled

- Receipts (`receipt_url`) and charts behavior
- Multi-Space switching UX (the Space switcher alongside the Month Switcher)
- What the Settings / Members screens should actually do
