# Issue Reports are stored in our own database, not filed as GitHub issues

## Status

accepted

## Decision

User-submitted Issue Reports are persisted to a dedicated `IssueReport` table in our own Postgres database, which is the **source of truth**. A notification email is sent to the operator on each submission as an *alert*, not as the system of record. We do **not** file reports as GitHub issues.

Each report is owned by the User who filed it via a required `userId` foreign key with `onDelete: Cascade`: deleting a User removes their Issue Reports. A denormalized `userEmail` snapshot is kept for read convenience and dies with the row on cascade.

## Why

The motivating problem is operator insight: today, when something breaks for a signed-in User, there is no signal at all. The original instinct was to file each report as a GitHub issue — free, no new storage, and triageable from a place we already work.

We rejected GitHub Issues for two reasons that compound:

- **PII leakage.** Reports carry a User's email, the page they were on, the tree in view, and free-text that may name living relatives. A GitHub issue — even in a private repo — pushes that user PII into a developer tracker that is shared with collaborators, indexed, and outside our data-deletion control. Our app already treats user data carefully (see the Account Deletion Boundary); routing support intake through GitHub would quietly undermine that.
- **Wrong tool for the job.** GitHub Issues optimizes for developer bug tracking, not end-user support intake. Coupling user-facing support to our dev tracker also adds an external dependency (a GitHub token/App, API rate limits) for a low-traffic, authenticated, solo-scale app.

Storing reports in our own database keeps the data **queryable, private, and inside our own deletion guarantees**. Cascade-on-delete was chosen deliberately over `SetNull`: keeping a deleted User's email and report text around would mean lingering PII with no owner, which we explicitly did not want — even at the cost of losing the bug signal from a User who later quits.

Email remains as the alert channel because we already have working transactional email (Mailtrap) and an inbox notification is the cheapest way to actually notice a new report without building an admin UI.

## Consequences

- The `IssueReport` table is the durable record; the notification email is best-effort. Submission **persists first, then emails**, and a failed email is logged but does not fail the request or lose the report.
- A future reader will see a homegrown table plus an email rather than a GitHub integration; this ADR is why. Re-routing to GitHub later would reintroduce the PII concern and is not a free swap.
- Cascade delete means we cannot mine reports from departed Users for trends. This is an accepted loss in exchange for not holding ownerless PII.
- There is no admin UI yet: triage happens by reading the notification email or querying the table directly, including the `status` field (open/closed).
- Reports capture `treeId` as a plain column, not a foreign key, so a report survives deletion of the tree it referenced.
