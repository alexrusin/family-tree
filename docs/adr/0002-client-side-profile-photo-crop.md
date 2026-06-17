# Client-side profile photo cropping

## Status

accepted

## Decision

Profile Photos are cropped **in the browser**: when a user picks an image, a circular pan/zoom editor (`react-easy-crop`) produces a square WebP crop that is uploaded in place of the raw file. We store **only the cropped square**, not the original, and the existing server pipeline (`sharp` `fit:"inside"` 800×800 → WebP@82 → S3) is left unchanged.

## Why

This decision is **hard to reverse** (we never persist the original, so moving cropping server-side later would require capturing originals plus a data migration), **surprising without context** (a future reader will wonder why the app cannot re-crop a saved photo from its original framing), and the result of a **real trade-off**: client-side cropping ships a complete framing experience with zero changes to the API, S3 layout, or schema, at the cost of discarding the pristine source. We judged that the user need — turning a group photo into a well-framed avatar — is fully met by the cropped result, and that the simplicity and unchanged storage path outweigh the lost ability to re-frame from an original.

## Consequences

- Re-cropping a previously saved Profile Photo can only operate on the already-cropped square, so that capability is deliberately not offered; re-framing means re-selecting the source file.
- The image-processing/S3/serving code and the Member schema are untouched; the cropped square simply flows through the existing multipart upload path.
- The same editor and contract apply to Member photos and the account holder's avatar (see CONTEXT.md *Profile Photo*).
