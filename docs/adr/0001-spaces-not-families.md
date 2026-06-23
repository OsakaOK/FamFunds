# Model the core unit as a "Space" with an intrinsic kind, not a "Family"

## Status

accepted

## Context & decision

FamFunds began as a family-sharing app, so the schema named its central unit `families` (with `family_members`, `family_id`, `create_family`, `join_family`). Designing the product further, we settled on a different core concept: a **Space** — the ledger that owns expenses, budgets, and categories — which comes in two intrinsic kinds, **Personal** (auto-created per user, private, never shareable) and **Family** (shared via an invite code). A Personal Space is not a degenerate family; "personal vs family" is a permanent `kind` stamped at creation, not derived from member count.

Because the domain term is now "Space," we are **renaming the storage layer to match**: `families → spaces`, `family_members → space_members`, `family_id → space_id`, and the RPCs/helpers accordingly, plus adding a `kind` column (`personal | family`). We do this now, in dev stage, with no real user data — it is never cheaper than today, and a clean schema is worth more to a solo dev than avoiding a one-time mechanical rename.

## Considered alternatives

- **Keep `families` in the DB, use "Space" only in the UI.** Rejected: a permanent impedance mismatch — a "personal" tracker built on a `families` table with `kind='personal'` is exactly the kind of thing a future reader wonders about, and it makes the glossary fight the schema.
- **Document the mismatch in an ADR but don't rename (hybrid).** This is the fallback *if real data already existed*. It doesn't, so we prefer the clean rename over a documented wart.

## Consequences

- A migration renames live objects; safe now because data is disposable. After real users exist, this decision is expensive to revisit — treat the rename as effectively one-way.
- `join_family` (→ `join_space`) must guard `kind = 'family'` so Personal Spaces refuse joins.
- Every user is auto-provisioned a permanent Personal Space at signup; "zero spaces" is no longer a reachable state, and the old `FamilySetupScreen` gate is removed in favor of landing directly in the Personal Space.
