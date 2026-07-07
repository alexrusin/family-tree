# Family Picture allows a constrained custom scene, not open prompting

## Status

accepted — **amends** the "free-text as the first-shot prompt" Out-of-Scope item in the [Family Picture PRD](../family-picture/PRD.md) and supplements [ADR 0007](0007-hosted-image-model-for-family-picture.md). Decided during the approved UI-mockup review with Alex (2026-07-03); the mockup ([`docs/family-picture/ui-mockup.html`](../family-picture/ui-mockup.html)) reflects it.

## Context

The PRD's Out of Scope section deliberately deferred **"free-text as the first-shot prompt … for abuse-surface reasons,"** scoping v1 to *presets + a short constrained field*. During the UI-mockup review a gap surfaced: a fixed set of setting presets (studio, garden, holiday table, …) cannot name the places families actually care about — the ancestral home, a hometown landmark ("Chicago, Millennium Park, beside the Bean"). For a feature whose whole payload is *emotional connection to real people and places*, "where" is often the point, and presets alone can't express it.

## Decision

The **Setting** step offers a **"Somewhere specific"** option that reveals a single free-text **custom-place** field. This is distinct from the existing **personal-touch** field. Both fields are:

- **separate** — custom place = *where* (a location/scene); personal touch = *an added object or action* ("add a birthday cake");
- **optional**;
- **each capped at 150 characters** (one uniform validation rule);
- **server-validated** — length **and** a content guard — before the value reaches the Prompt builder.

This is a deliberate, **bounded** widening of the free-text surface — **not** a move to open first-shot prompting. There is still no single blank "describe your whole image" box: **Style stays preset-only**, **Setting is preset-first** (custom place is an explicit opt-in), and the two custom fields are short, purpose-scoped, and validated. The preset scaffolding still frames every prompt.

## Considered Options

- **Presets only (original PRD).** Rejected: cannot express meaningful specific places; the family home or a hometown landmark is frequently the entire reason for the portrait.
- **Merge custom place + personal touch into one "describe your scene" box** (floated in the review). Rejected: conflates *where* and *what*, and widens the free-text surface more than necessary. Two short, single-purpose fields keep user intent legible and make each field independently boundable and validatable.
- **Full open first-shot prompting.** Still out of scope: it is the largest abuse surface and defeats the preset guardrails that the provider-policy concerns in ADR 0007 depend on.

## Why

The specific place is often the whole point of a Family Picture, so presets alone leave the feature unable to do the one thing users most want. Two short, separate, validated fields deliver that expressiveness while keeping the abuse surface small: hard length caps, single-purpose scoping, mandatory server-side validation, and the fact that Style + Setting presets still scaffold the prompt around the free text. A uniform 150-character cap on both fields gives implementers one simple, consistent rule.

## Consequences

- **Prompt builder (issue 04) signature widens.** `Setting` becomes *either* a preset id *or* a custom-place string; the builder maps both in the one module. Documented in [`issues/04-prompt-builder.md`](../family-picture/issues/04-prompt-builder.md).
- **Server-side validation is now required** on both custom-place and personal-touch: enforce the 150-char cap and run a content guard (reject attempts to inject style/instruction overrides or disallowed-content terms) *before* building the prompt. This is new work relative to a presets-only v1.
- **Prompt-injection / policy risk rises modestly** versus presets-only, mitigated by the constraints above and by the provider's own refusal behaviour (a refused generation is treated as a failure and refunded — ADR 0007, PRD metering rules).
- **Config-level kill switch.** If abuse shows up in practice, the custom-place tile can be disabled via configuration without touching the rest of the flow — presets keep working.
