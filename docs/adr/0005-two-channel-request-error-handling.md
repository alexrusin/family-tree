# Domain errors throw and are centrally mapped; request validation returns locally

## Status

accepted

## Decision

API request handling uses **two deliberately separate error channels**, split by who detects the failure:

- **Domain rule violations throw.** Tree-domain services raise a typed `DomainError` carrying a stable `ERR_*` code (e.g. `ERR_FORBIDDEN`, `ERR_MEMBER_LIMIT_REACHED`, `ERR_DUPLICATE_RELATIONSHIP`). One route seam — the `withSession` / `withTreeRole` wrappers — catches these and maps `code → HTTP status` through a **single table**. Anything that is not a `DomainError` becomes `500` and is logged as a bug. The wrapper always emits the `{ errorCode: "ERR_*" }` body shape.
- **Request-shape validation returns.** Malformed-input checks that are specific to one route (missing file, unparseable JSON, an out-of-range enum — `ERR_NO_FILE`, `ERR_INVALID_ARRANGEMENT`, `ERR_INVALID_RELATIONSHIP`, …) stay as inline `return NextResponse.json({ errorCode }, { status })` in the handler that owns them. They are **not** routed through the central table.

The dividing line is intentional: the table owns the failures that are *shared and repeated* across routes (auth, role, domain rules); route-local input checks stay where their context is.

## Why

This is **surprising without context**: a future reader will notice that some `400`s are `throw`n and centrally mapped while others are `return`ed inline, and will reasonably ask "why aren't these handled the same way?" The obvious-looking "fix" is to pull every `ERR_*` into the central table so there is one uniform path.

We considered exactly that — **one total table, everything throws** — and rejected it. Route-local validation codes are used by a single handler; hoisting them into a global `code → status` table dilutes its value (it fills with single-use entries) and pulls a check away from the request-parsing context that gives it meaning. Keeping the table scoped to the genuinely cross-cutting failures preserves **locality**: the repeated preamble is concentrated in one tested module, and a route's own input rules stay readable inside that route.

It is a **real trade-off** (uniformity vs. locality, and we chose locality) and **hard to reverse** as a convention: it shapes how all ~27 routes and ~25 domain throw-sites signal failure. Re-uniforming later means touching every one of them.

## Consequences

- A `DomainError` is the contract between tree-domain services and the route seam; throwing a bare `Error` from a service will surface as a `500`, not a mapped status — by design, so unexpected errors are never silently dressed up as expected ones.
- The `code → status` table is the one place to learn every domain failure's HTTP meaning; route input-validation statuses are found by reading the route.
- Adding a new domain rule means: throw a `DomainError(code)` and add one table row. Adding a new request-shape check means: `return` it inline. Contributors should not migrate the latter into the table.
- All API error bodies are `{ errorCode: "ERR_*" }`; the legacy `{ error: "prose" }` shape (previously emitted by the create/rename/delete routes) is retired.
