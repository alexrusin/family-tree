// Personal, device-local Drag Lock preference (see docs/adr/0003).
//
// Framework-free so it can be unit-tested without a DOM. Callers supply a
// storage backend (e.g. window.localStorage) and the device's pointer
// capability (e.g. window.matchMedia('(pointer: coarse)').matches).

export const DRAG_LOCK_STORAGE_KEY = "family-tree:drag-lock";

export interface DragLockStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * Reads the stored Drag Lock preference, if any.
 * Returns `null` when no preference has been stored yet.
 */
export function getStoredDragLockPreference(
  storage: DragLockStorage,
): boolean | null {
  const raw = storage.getItem(DRAG_LOCK_STORAGE_KEY);
  if (raw === null) return null;
  return raw === "true";
}

/** Persists the Drag Lock preference. */
export function setStoredDragLockPreference(
  storage: DragLockStorage,
  locked: boolean,
): void {
  storage.setItem(DRAG_LOCK_STORAGE_KEY, locked ? "true" : "false");
}

/**
 * The default Drag Lock state when no preference is stored: coarse/touch
 * pointers default to locked, fine/mouse pointers default to unlocked.
 */
export function getDefaultDragLockPreference(isCoarsePointer: boolean): boolean {
  return isCoarsePointer;
}

/**
 * Resolves the Drag Lock state to apply: the stored preference if one
 * exists, otherwise the pointer-capability default.
 */
export function resolveDragLockPreference(
  storage: DragLockStorage,
  isCoarsePointer: boolean,
): boolean {
  const stored = getStoredDragLockPreference(storage);
  if (stored !== null) return stored;
  return getDefaultDragLockPreference(isCoarsePointer);
}
