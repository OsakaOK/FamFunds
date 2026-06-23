# FamFunds

A shared expense tracker. Money is tracked inside Spaces — either a private Personal Space or a shared Family Space. Members log expenses, categorize them, set budgets, and see where the money goes month-to-month.

## Language

**Space**:
The ledger you are currently viewing and switching between. The unit that owns expenses, budgets, and categories. Every expense belongs to exactly one Space. Comes in two kinds: Personal and Family.
_Avoid_: Account, group, ledger

**Personal Space**:
A Space with exactly one Member — you. Private; no one else can ever see it. Automatically created for every user at signup and never deletable — the guaranteed home you always have.
_Avoid_: Private account, my money

**Family Space**:
A Space shared by two or more Members via an invite code. Everyone in it sees every expense in it.
_Avoid_: Group, household, team

**Member**:
A user's participation in one Space. The same human is a separate Member in each Space they belong to. Carries a role: Admin or regular member.
_Avoid_: User, participant

**Admin**:
The financial steward of a Space. Can edit or delete any expense (not just their own), set and edit the Space's Budgets, and regenerate the Invite Code. The creator of a Family Space is its first Admin and may promote others. (A Personal Space's sole Member is trivially its Admin.)
_Avoid_: Owner, manager

**Expense**:
A single logged outflow of money in a Space: a non-negative amount in one Category on a given date, with an optional note and receipt, attributed to the Member who logged it. FamFunds records only outflows — refunds and reimbursements are not modeled (a return is handled by editing or deleting the original Expense).
_Avoid_: Transaction, purchase, payment

**Attribution**:
The Member who logged a given expense. Distinct from ownership — in a Family Space the expense belongs to the Space, but it is still attributed to whoever entered it. Preserved even after that Member leaves, by snapshotting their display name onto the expense. A departed Member's entries read as their snapshotted name (or "Former member").
_Avoid_: Owner, payer

**Category**:
One of a single, global, fixed set of expense labels (Groceries, Dining, Health, Entertainment, Shopping, Other), identical in every Space. Not customizable per Space; not user-defined. The canonical list is the one source of truth, and nothing off-list is a valid Category.
_Avoid_: Tag, label, type

**Budget**:
A spending target for one Category in one Space, scoped to a specific calendar month. Each month has its own limit; editing one month's Budget does not change any other month's. A month with no Budget set has no target for that Category. Set and edited only by an Admin.
_Avoid_: Limit, cap, allowance

**Invite Code**:
A short, shareable code that lets a person join one specific Family Space as a regular member. Exactly one is active per Family Space at a time; an Admin can regenerate it, which invalidates the previous code. Personal Spaces have no Invite Code and cannot be joined.
_Avoid_: Join link, token, password

**Active Month**:
The single calendar month currently being viewed. Scopes which expenses appear and which month's Budgets they are measured against. Changed via the Month Switcher.
_Avoid_: Period, current month
