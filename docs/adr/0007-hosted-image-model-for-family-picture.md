# Family Picture generation uses a hosted image model called directly, not Strands or Bedrock's own image models

## Status

accepted — provider resolved to **OpenAI** by the spike (see Spike outcome below)

## Decision

The Family Picture feature generates images by calling a hosted image model's own SDK **directly** from a Next.js API route — the same shape as our existing `@aws-sdk/client-s3` usage — not through the Strands agent framework, and **not** on Amazon Bedrock's native image models.

The provider was decided by a throwaway spike, run **before** any UI/DB work, that tested the real APIs (not the chat apps) of **Gemini Nano Banana** and **OpenAI `gpt-image`** on real family photos against three criteria: (1) does it comply or refuse, (2) does it preserve each person's identity, (3) does a follow-up tweak hold identities. Output is photorealistic at 1K, stored as `.webp` in S3 like existing Profile Photos.

## Spike outcome

**OpenAI won; v1 ships on `gpt-image` (tested as `gpt-image-2`).** Both providers complied (no refusals) and composed the four real reference faces — including a child (Anton) and both grandparents — into a coherent group portrait, so compliance was not the deciding factor. **Identity fidelity was.** Gemini (tested on `gemini-3-pro-image`, the higher-fidelity Pro model) systematically **aged the subjects** — greyer, more lined faces than the inputs — and dropped identifying detail (it swapped the child's martial-arts gi for a plain t-shirt). OpenAI held ages true to the source photos and preserved that detail (the gi). Since the whole feature rests on "these look like *my* family," the aging failure is disqualifying. The exact `gpt-image` model id to standardise on must be confirmed at build time (ids move fast); `gpt-image-2` was what the spike ran.

## Considered Options

- **Strands agent SDK (the original idea).** Strands is genuinely model-agnostic and has a first-class TypeScript SDK, so the two objections that first killed it (Python-only, Bedrock-only) were wrong. It was still rejected: Strands is an *agent* framework built around chat/tool-calling reasoning loops, and our flow is fully scripted and single-shot (select members → generate → optionally tweak). There is no autonomous decision for an agent to make. Even conversational tweaking is a native capability of the image model (multi-turn editing), not something that needs an agent loop. Strands would add a runtime and an abstraction layer for zero benefit, and image *generation* is not its sweet spot (its multimodal support is image *input*, not output).
- **Amazon Bedrock native image models.** Attractive because we already live in AWS (S3, EC2 deploy, one IAM setup). Rejected because Bedrock's flagship image model, Nova Canvas, is **Legacy with EOL 2026-09-30**, and neither it nor its Stability successors offer documented multi-reference face-identity preservation — the one capability this feature cannot ship without. Bedrock's models also lack the conversational image-editing needed for tweaks.

## Why

The feature is worthless unless the generated portrait actually looks like the real relatives — *multi-subject identity preservation from reference photos*. Only a small set of current hosted models do this well (Gemini Nano Banana, OpenAI `gpt-image-1`); Bedrock's do not. Calling the chosen model's SDK directly is simpler than an agent runtime, cheaper per call, and far easier to reason about for the per-Generation cost cap that protects us from losing money.

Photorealism of real, identifiable people sits close to policy limits that every hosted provider enforces (Gemini's Feb 2026 update specifically added face-swap restrictions), and behaviour differs by provider — which is exactly why the provider is chosen by an empirical compliance spike rather than by docs, with a provider already proven to comply held as the fallback.

## Consequences

- Adds **OpenAI as a vendor/credential relationship** alongside AWS (spike outcome). Both providers require billing enabled — image generation is not free on either — which is expected and consistent with the metered-from-day-one cost model.
- Prompts and the tweak flow will be tuned to `gpt-image`; swapping providers later is not free. Gemini remains the documented alternative if OpenAI's identity fidelity or pricing regresses.
- Generated images are labeled as AI-generated and retain the model's provenance metadata (OpenAI images carry C2PA metadata), because they depict real, often deceased people in scenes that never happened.
- The tweak flow uses OpenAI `images.edit` (v1's output fed back in), which held identities acceptably in the spike; whether to re-supply the original face crops on each tweak to fight drift over many edits remains a build-time tuning knob.
