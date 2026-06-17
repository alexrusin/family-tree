# Divorced relationship as a separate, mutually-exclusive type

## Status

accepted

## Decision

We model **divorced** as a distinct `RelationshipType` (alongside `parent`/`spouse`/`sibling`) that is **mutually exclusive** with `spouse` for a given pair, rather than as a status flag on the Spouse Relationship or as a second record coexisting with it. Creating a divorced relationship for a pair atomically deletes any existing spouse relationship for that pair, and vice-versa. A divorced pair still participates in `Union` derivation exactly like a spouse pair, so a divorced couple's shared children stay grouped; only the line between the former partners changes (drawn dotted instead of the spouse's solid double-line). GEDCOM round-trips it via the standard `FAM` + `DIV` event tag.

## Why

This decision is **hard to reverse** (it adds an enum value and a database migration, and shapes data written to the database), **surprising without context** (a future reader will ask "why does adding *divorced* silently delete the *spouse* record?" and "why does a *divorced* couple still form a Union?"), and the result of a **real trade-off**.

Modelling divorced as a separate type keeps it parallel to the existing spouse type — same canonicalization, same Add Relationship flow, same edge/popover/panel plumbing — which is the smallest, most consistent change. We considered two alternatives and rejected them:

- **A status flag on the Spouse Relationship** (`active`/`divorced`) would have departed from the codebase's purely type-based relationship model and pushed branching into every consumer of relationship type.
- **Coexisting spouse + divorced records** for the same pair (which the `(treeId, from, to, type)` unique constraint technically allows) would let a couple be simultaneously married and divorced — an inconsistent family history — and model remarriage-to-the-same-person poorly.

Mutual exclusion with an atomic swap on create makes the common real-world transitions ("they divorced", "they remarried") single actions while keeping the data internally consistent. Including divorced pairs in Union derivation avoids a layout regression: without it, marking a divorce would split a couple's shared children back into separate parent lines.

## Consequences

- The `Union` glossary term widens: a Union may group partners in a Spouse *or* Divorced Relationship (see `CONTEXT.md`).
- Adding a divorced relationship can delete a spouse relationship (and vice-versa) as a side effect of a single create request — callers should not assume create is purely additive for these two types.
- GEDCOM round-trips stay structurally stable for divorce status, but only the status itself is preserved — no divorce date or event metadata is emitted or read.
