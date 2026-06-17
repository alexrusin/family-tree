# Personal, device-local Drag Lock

## Status

accepted

## Decision

The **Drag Lock** — the editor control that disables dragging of Member nodes to prevent accidental moves while panning — is a **personal preference stored locally on the editor's device** (browser `localStorage`), as a **single global value** applied to every Family Tree that editor opens on that device. Its initial state, when no preference is stored, is derived from the device's pointer capability: coarse/touch pointers default to **locked**, fine/mouse pointers default to **unlocked**. The Drag Lock never reads from or writes to the shared Manual Tree Arrangement, and there is no server-side or per-tree persistence of it.

## Why

This decision is **surprising without context**: the established domain rule is that workspace layout state is *shared* Family Tree data — the Manual Tree Arrangement glossary entry explicitly warns _Avoid: personal layout_. Introducing a layout-adjacent control that is intentionally *personal and device-local* runs against that grain, so a future reader will reasonably ask "why isn't the Drag Lock shared like the arrangement, and why does it behave differently per device?"

It is the result of a **real trade-off**. The alternative was to persist the Drag Lock as shared, per-tree, server-side state alongside the Manual Tree Arrangement. We rejected that because the problem being solved is about an individual's *input habits on a specific device* (a touchscreen producing stray drags), not about the tree's content or presentation. A shared lock would let one collaborator's device preference disable dragging for everyone, which is both confusing and counter to the feature's intent. A device-local global preference matches how the friction actually occurs and keeps the feature free of schema, API, and migration cost.

The hard-to-reverse aspect is the weaker of the three criteria here — a preference can be relocated later — but the conceptual contrast with shared arrangement state is significant enough that recording the choice prevents future confusion and accidental "fixes" that try to make the lock shared.

## Consequences

- The Drag Lock is not synchronized across devices or collaborators: the same editor may have it locked on a phone and unlocked on a laptop, by design.
- There is no schema, API, or server change; the existing Manual Tree Arrangement persistence, Reset Layout, and public read paths are untouched.
- The lock only narrows an editor's interaction in the moment; it grants no new permissions and does not alter the editor/viewer boundary. Collaborator Viewers and Guest Viewers, who already cannot drag, never see the control.
- Because the preference is read from the device after mount, the padlock toggle may briefly show the default state before hydrating to the stored value; this is acceptable since the lock has no effect on the rendered layout, only on interactivity.
- Adding a Member deliberately forces the preference to unlocked (and persists it), accepting that a per-device global preference can be changed by an in-app action as well as by the toggle.
