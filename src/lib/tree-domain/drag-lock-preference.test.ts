import { describe, expect, it } from "vitest";
import {
  DRAG_LOCK_STORAGE_KEY,
  type DragLockStorage,
  getDefaultDragLockPreference,
  getStoredDragLockPreference,
  resolveDragLockPreference,
  setStoredDragLockPreference,
} from "./drag-lock-preference";

function createMemoryStorage(): DragLockStorage {
  const store = new Map<string, string>();
  return {
    getItem: (key) => (store.has(key) ? store.get(key)! : null),
    setItem: (key, value) => store.set(key, value),
  };
}

describe("drag-lock-preference", () => {
  describe("getDefaultDragLockPreference", () => {
    it("defaults to locked for a coarse/touch pointer", () => {
      expect(getDefaultDragLockPreference(true)).toBe(true);
    });

    it("defaults to unlocked for a fine/mouse pointer", () => {
      expect(getDefaultDragLockPreference(false)).toBe(false);
    });
  });

  describe("getStoredDragLockPreference", () => {
    it("reports an absent value as unset", () => {
      const storage = createMemoryStorage();
      expect(getStoredDragLockPreference(storage)).toBeNull();
    });

    it("round-trips a stored locked value", () => {
      const storage = createMemoryStorage();
      setStoredDragLockPreference(storage, true);
      expect(getStoredDragLockPreference(storage)).toBe(true);
    });

    it("round-trips a stored unlocked value", () => {
      const storage = createMemoryStorage();
      setStoredDragLockPreference(storage, false);
      expect(getStoredDragLockPreference(storage)).toBe(false);
    });

    it("uses a dedicated storage key", () => {
      const storage = createMemoryStorage();
      setStoredDragLockPreference(storage, true);
      expect(storage.getItem(DRAG_LOCK_STORAGE_KEY)).toBe("true");
    });
  });

  describe("resolveDragLockPreference", () => {
    it("falls back to the touch default (locked) when nothing is stored", () => {
      const storage = createMemoryStorage();
      expect(resolveDragLockPreference(storage, true)).toBe(true);
    });

    it("falls back to the mouse default (unlocked) when nothing is stored", () => {
      const storage = createMemoryStorage();
      expect(resolveDragLockPreference(storage, false)).toBe(false);
    });

    it("a stored unlocked value overrides a touch (locked) default", () => {
      const storage = createMemoryStorage();
      setStoredDragLockPreference(storage, false);
      expect(resolveDragLockPreference(storage, true)).toBe(false);
    });

    it("a stored locked value overrides a mouse (unlocked) default", () => {
      const storage = createMemoryStorage();
      setStoredDragLockPreference(storage, true);
      expect(resolveDragLockPreference(storage, false)).toBe(true);
    });
  });
});
