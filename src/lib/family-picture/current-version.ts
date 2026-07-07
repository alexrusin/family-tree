/**
 * Picks the Version a Family Picture should show by default: the one
 * pointed at by `currentVersionNumber`, or the highest-numbered Version if
 * that pointer is unset (e.g. no revert has happened yet) or stale.
 */
export function resolveCurrentVersion<T extends { versionNumber: number }>(
  versions: T[],
  currentVersionNumber: number | null,
): T | null {
  if (versions.length === 0) {
    return null;
  }

  if (currentVersionNumber !== null) {
    const match = versions.find((v) => v.versionNumber === currentVersionNumber);
    if (match) {
      return match;
    }
  }

  return versions.reduce((latest, v) =>
    v.versionNumber > latest.versionNumber ? v : latest,
  );
}
