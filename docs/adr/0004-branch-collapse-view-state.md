# Branch collapse is per-user, ephemeral view state

## Status

accepted

## Decision

The **Collapsed Branch** — collapsing the family that hangs off a **Branch Anchor** so a viewer can focus on one part of a large Family Tree — is a **personal, device-local, view-only** concern. The set of collapsed Branch Anchors is stored locally on the viewer's device (browser `localStorage`), keyed per Family Tree, exactly as the **Drag Lock** preference is stored (see ADR-0003). Collapsing a branch:

- **never persists to the tree** and **never reads from or writes to the shared Manual Tree Arrangement** (`nodePositions`);
- re-flows the visible Members through the existing automatic layout for display only, leaving any saved Manual Tree Arrangement untouched, so expanding restores the saved positions;
- is invisible to other Collaborators and to Guest Viewers — each person's collapse state is their own;
- requires **no schema change, no API, and no server-side persistence**.

The hidden-Member set is computed purely from the tree's Members and Relationships: starting from the anchor's ancestors, the closure follows Parent Relationships **and** Spouse/Divorced Relationships so that in-laws who married into the branch are hidden too, while the anchor and the anchor's own descendants are always kept. A candidate is rescued (stays visible) when it is still reachable from the kept set by a path that does not pass through the anchor.

## Why

This decision is **surprising without context** for the same reason ADR-0003 is: the established domain rule is that workspace layout state is *shared* Family Tree data — the Manual Tree Arrangement entry explicitly warns _Avoid: personal layout_. Collapse hides Members and re-flows the layout, which looks like it ought to be shared tree state. A future reader will reasonably ask "why isn't a collapsed branch saved on the tree, and why doesn't it affect what collaborators see?"

It is the result of a **real trade-off**. We considered (a) making collapse part of the shared arrangement so all collaborators see the same collapsed branches, and (b) persisting it server-side per user so it follows the user across devices. We rejected the shared option because one collaborator collapsing a branch would hide data from everyone else — confusing, and counter to the intent of a *personal* focus aid. We rejected the server-side per-user option because it adds a storage table, an API, and migration cost for what is fundamentally a transient, per-device navigation preference; the device-local approach matches how the friction actually occurs (a large tree being unwieldy *for the person looking at it right now*) and reuses the proven Drag Lock pattern.

The **hard-to-reverse** aspect is the weakest of the three criteria — a preference can be relocated to the server later — but the conceptual contrast with shared arrangement state is significant enough that recording the choice prevents future confusion and accidental "fixes" that try to make collapse shared or persistent.

## Consequences

- Collapse state is not synchronized across devices or collaborators, by design: the same user may have a branch collapsed on a laptop and expanded on a phone, and collaborators always see the full tree.
- Guest Viewers on a Public Share Link always see the complete shared tree; a collaborator's collapse never affects what is shared.
- There is no schema, API, or server change; Manual Tree Arrangement persistence, Reset Layout, GEDCOM Export/Import, and public read paths are all untouched.
- Re-flow after a collapse is display-only. Because the saved arrangement is never overwritten, expanding a branch returns Members to their hand-placed positions.
- Because the preference is read from the device after mount, a freshly loaded tree may render fully expanded for an instant before hydrating to the stored collapse state; this is acceptable since collapse affects only what is shown, not the underlying data.
- Stale collapse state is harmless: a collapsed anchor that has been deleted, or that has lost all of its ancestors, simply produces no Hidden Relatives Badge and hides nothing.
- Collapse is available to every role, including Collaborator Viewers and Guest Viewers, because it grants no permissions and changes no shared data — it only narrows what the viewer themselves sees.
