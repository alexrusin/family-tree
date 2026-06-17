// Personal, device-local collapse preference per tree (see docs/adr/0004).
//
// Framework-free so it can be unit-tested without a DOM. Callers supply a
// storage backend (e.g. window.localStorage). The stored value is the set of
// collapsed Branch Anchor ids, keyed per Family Tree.

export function collapseStorageKey(treeId: string): string {
  return `family-tree:collapsed-branches:${treeId}`;
}

export interface CollapseStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * Reads the stored set of collapsed anchor ids for a tree.
 * Returns an empty set when nothing is stored or the data is invalid.
 */
export function getCollapsedAnchors(
  storage: CollapseStorage,
  treeId: string,
): string[] {
  const raw = storage.getItem(collapseStorageKey(treeId));
  if (raw === null) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

/** Persists the full set of collapsed anchor ids for a tree. */
export function setCollapsedAnchors(
  storage: CollapseStorage,
  treeId: string,
  anchorIds: string[],
): void {
  storage.setItem(collapseStorageKey(treeId), JSON.stringify(anchorIds));
}

/** Adds an anchor id to the collapsed set (idempotent). */
export function addCollapsedAnchor(
  storage: CollapseStorage,
  treeId: string,
  anchorId: string,
): void {
  const current = getCollapsedAnchors(storage, treeId);
  if (current.includes(anchorId)) return;
  setCollapsedAnchors(storage, treeId, [...current, anchorId]);
}

/** Removes an anchor id from the collapsed set (no-op if missing). */
export function removeCollapsedAnchor(
  storage: CollapseStorage,
  treeId: string,
  anchorId: string,
): void {
  const current = getCollapsedAnchors(storage, treeId);
  if (!current.includes(anchorId)) return;
  setCollapsedAnchors(
    storage,
    treeId,
    current.filter((id) => id !== anchorId),
  );
}
