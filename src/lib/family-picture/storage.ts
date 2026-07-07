/**
 * S3 key layout for generated Family Picture images, following the existing
 * Profile Photo storage pattern (see `tree-domain/photo-upload.ts`, whose
 * generic upload/download/delete-by-key helpers this feature reuses as-is).
 */
export function generateFamilyPictureVersionKey(
  userId: string,
  familyPictureId: string,
  versionNumber: number,
): string {
  return `users/${userId}/family-pictures/${familyPictureId}/v${versionNumber}.webp`;
}
