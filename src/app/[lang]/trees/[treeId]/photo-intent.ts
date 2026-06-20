export type PhotoIntent =
  | { kind: "unchanged" }
  | { kind: "replace"; file: File }
  | { kind: "remove" };

export function resolvePhotoIntent(
  selectedFile: File | null,
  pendingRemove: boolean,
): PhotoIntent {
  if (selectedFile) return { kind: "replace", file: selectedFile };
  if (pendingRemove) return { kind: "remove" };
  return { kind: "unchanged" };
}

export function applyPhotoIntentToFormData(
  body: FormData,
  intent: PhotoIntent,
): void {
  if (intent.kind === "replace") {
    body.append("photo", intent.file);
  } else if (intent.kind === "remove") {
    body.append("removePhoto", "true");
  }
}
