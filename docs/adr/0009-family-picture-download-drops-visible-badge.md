# Family Picture downloads drop the visible "AI-generated" badge but keep provenance metadata

## Status

accepted — revises a Consequence of [ADR 0007](./0007-hosted-image-model-for-family-picture.md)

## Decision

Downloaded Family Pictures no longer carry the burned-in "AI-generated" badge. The download route serves the **untouched S3 original** instead of a re-encoded copy. The image's provenance is still asserted two ways: the invisible **C2PA metadata** OpenAI embeds (now preserved natively, since we no longer re-encode) and the **on-screen "AI-generated" label** shown in the app.

## Why

ADR 0007 listed "images are labeled as AI-generated" as a consequence of generating scenes of real, often deceased people. In practice the burned-in badge rendered poorly over photo content and degraded a keepsake that people download to print, frame, and share — so it wasn't reliably serving its provenance purpose while it *was* harming the artifact.

Removing the re-encode is a strict improvement for provenance-by-metadata: the previous badge step re-encoded the file (best-effort carrying C2PA), whereas serving the original preserves the provider's native C2PA metadata intact. The honesty intent of ADR 0007 is kept where it doesn't damage the photo (metadata + in-app label) and dropped only where it did (pixels on the downloaded file).

## Considered Options

- **Keep webp in S3, convert to jpg at download.** Rejected: it reintroduces a re-encode, which strips the native C2PA metadata this decision preserves and slightly degrades quality. Format is instead switched at generation time (native jpg), so the download stays the untouched original.
- **Strip every visible "AI-generated" trace, including the in-app label.** Rejected: the in-app label is unobtrusive and keeps the ADR 0007 honesty stance alive at no cost to the downloaded keepsake.

## Consequences

- `burnAiGeneratedLabel` (`src/lib/family-picture/watermark.ts`) and its test become dead code and are removed.
- The download-button copy "(AI-generated label included)" is no longer true and is updated across all three locales.
- Download Content-Type and filename derive from each Version's stored format, since older Versions remain `.webp` and new ones are `.jpg`.
