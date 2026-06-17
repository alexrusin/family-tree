# GEDCOM mapping and fidelity boundaries

## Status

accepted

## Decision

To support GEDCOM 5.5.1 import/export, we bridge two different models: the app's **relationship graph** (typed `parent`/`spouse`/`sibling` edges, with `Union` derived at layout time) and GEDCOM's **`INDI` + `FAM`** records (where siblings are implicit co-children). We accept the following deliberate boundaries:

- **Import always creates a new Family Tree** owned by the importer; we do not merge into existing trees. "No duplicate profiles" therefore means intra-file de-duplication by `@XREF@` id only — no fuzzy entity resolution.
- **Siblings round-trip via a parentless `FAM`.** Because the layout engine never renders `sibling` edges and GEDCOM has no explicit sibling link, an explicit sibling-only cluster is exported as a `FAM` with `CHIL` and no parents, and a parent-less child-only `FAM` is imported back into `sibling` edges. Families with parents rely on implicit (shared-parent) siblings.
- **Import is lossy and honest.** Data with no home in our schema (places, events, sources, extra notes, custom tags) is dropped and surfaced in an Import Report rather than stuffed into bios or stored as raw GEDCOM. Approximate dates (`ABT`/`EST`/`CAL`) collapse to year precision; bounds and ranges (`BEF`/`AFT`/`BET…AND`/`FROM…TO`) are dropped, never stored as if exact. `isLiving` is inferred (no death + recent birth) since GEDCOM has no living flag.
- **Imports are capped at 300 individuals**, consistent with the existing per-tree member limit; larger files are rejected up front.
- **Maiden Name maps to a secondary typed `NAME`, with the current surname kept primary.** A Member's current surname (`lastName`) is exported as the primary `1 NAME Given /Surname/`, and an optional Maiden Name is exported as a secondary `1 NAME Given /Maiden/` carrying `2 TYPE maiden`. On import, the maiden-typed `NAME` populates Maiden Name and the primary (untyped) `NAME` populates the current surname; a file whose only `NAME` is maiden-typed still yields a current surname of empty rather than promoting the maiden value. This deliberately **inverts the genealogical convention** in which the birth/maiden name is the primary record and married names are secondary.

## Why

The graph↔`FAM` mapping and these fidelity boundaries are **hard to reverse** (they shape data written to the database), **surprising without context** (a future reader will ask "why parentless FAMs?", "why no merge?", "why are some dates dropped?"), and the result of a **real trade-off**: we chose a safe, shippable v1 that delivers the "your data is yours" trust signal quickly over a higher-fidelity, higher-risk design (merge with entity resolution, schema extensions for places/events/date qualifiers, raw-GEDCOM round-tripping). Storing a date bound as an exact year, or silently dropping sibling-only relationships, would corrupt genealogical facts — so we preserve accuracy and report losses instead.

The Maiden Name mapping carries the same three properties. It is **hard to reverse** because the `2 TYPE maiden` convention is written into exported files that other genealogy tools may already have consumed; changing it later strands those files. It is **surprising** because keeping the current surname as the primary `NAME` inverts the usual genealogical convention, where the birth/maiden name is primary and married names are the typed secondaries. It is a **real trade-off**: making the maiden name primary would match convention but would change which value flows into `lastName` on a plain round-trip, breaking the existing surname mapping and every test and layout that assumes the primary `NAME` is the current surname. We chose continuity of the current-surname round-trip over convention conformance, accepting that our export reads "backwards" to a convention-aware reader.

## Consequences

- Round-trips are *structurally* stable but not byte-identical: unmapped tags and dropped dates do not survive, and a re-imported sibling-only group is reconstructed from a parentless `FAM`.
- The 300-member ceiling limits importing large real-world trees; raising the per-tree member limit (with a layout/performance check at thousands of nodes) is the natural follow-up.
- Photos, merge, and high-fidelity tag preservation are explicitly deferred (see the PRD's Out of Scope).
- Maiden Name round-trips structurally, but only the `maiden` name type is recognized; other `NAME` types a file may carry (`married`, `aka`, `birth`, …) remain unmapped and are dropped per the lossy-and-honest boundary. An importing tool that treats the maiden-typed secondary `NAME` as primary may surface the surnames in the opposite order from our app.
