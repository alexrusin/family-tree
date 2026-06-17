import { describe, expect, it } from "vitest";
import {
  type CollapseStorage,
  addCollapsedAnchor,
  collapseStorageKey,
  getCollapsedAnchors,
  removeCollapsedAnchor,
  setCollapsedAnchors,
} from "./collapse-preference";

function createMemoryStorage(): CollapseStorage {
  const store = new Map<string, string>();
  return {
    getItem: (key) => (store.has(key) ? store.get(key)! : null),
    setItem: (key, value) => store.set(key, value),
  };
}

describe("collapse-preference", () => {
  describe("getCollapsedAnchors", () => {
    it("returns an empty array when nothing is stored", () => {
      const storage = createMemoryStorage();
      expect(getCollapsedAnchors(storage, "tree-1")).toEqual([]);
    });

    it("returns an empty array when stored data is invalid JSON", () => {
      const storage = createMemoryStorage();
      storage.setItem(collapseStorageKey("tree-1"), "not-json");
      expect(getCollapsedAnchors(storage, "tree-1")).toEqual([]);
    });

    it("returns an empty array when stored data is not an array", () => {
      const storage = createMemoryStorage();
      storage.setItem(collapseStorageKey("tree-1"), JSON.stringify({ a: 1 }));
      expect(getCollapsedAnchors(storage, "tree-1")).toEqual([]);
    });

    it("filters out non-string entries", () => {
      const storage = createMemoryStorage();
      storage.setItem(
        collapseStorageKey("tree-1"),
        JSON.stringify(["a", 42, null, "b"]),
      );
      expect(getCollapsedAnchors(storage, "tree-1")).toEqual(["a", "b"]);
    });
  });

  describe("setCollapsedAnchors / round-trip", () => {
    it("round-trips a set of anchor ids", () => {
      const storage = createMemoryStorage();
      setCollapsedAnchors(storage, "tree-1", ["anchor-a", "anchor-b"]);
      expect(getCollapsedAnchors(storage, "tree-1")).toEqual([
        "anchor-a",
        "anchor-b",
      ]);
    });

    it("round-trips an empty array", () => {
      const storage = createMemoryStorage();
      setCollapsedAnchors(storage, "tree-1", []);
      expect(getCollapsedAnchors(storage, "tree-1")).toEqual([]);
    });
  });

  describe("per-tree key isolation", () => {
    it("stores separate values per tree", () => {
      const storage = createMemoryStorage();
      setCollapsedAnchors(storage, "tree-1", ["anchor-a"]);
      setCollapsedAnchors(storage, "tree-2", ["anchor-b", "anchor-c"]);

      expect(getCollapsedAnchors(storage, "tree-1")).toEqual(["anchor-a"]);
      expect(getCollapsedAnchors(storage, "tree-2")).toEqual([
        "anchor-b",
        "anchor-c",
      ]);
    });

    it("uses the correct storage key format", () => {
      const storage = createMemoryStorage();
      setCollapsedAnchors(storage, "tree-42", ["x"]);
      expect(
        storage.getItem("family-tree:collapsed-branches:tree-42"),
      ).toBe(JSON.stringify(["x"]));
    });
  });

  describe("addCollapsedAnchor", () => {
    it("adds an anchor to an empty store", () => {
      const storage = createMemoryStorage();
      addCollapsedAnchor(storage, "tree-1", "anchor-a");
      expect(getCollapsedAnchors(storage, "tree-1")).toEqual(["anchor-a"]);
    });

    it("appends to existing anchors", () => {
      const storage = createMemoryStorage();
      setCollapsedAnchors(storage, "tree-1", ["anchor-a"]);
      addCollapsedAnchor(storage, "tree-1", "anchor-b");
      expect(getCollapsedAnchors(storage, "tree-1")).toEqual([
        "anchor-a",
        "anchor-b",
      ]);
    });

    it("is idempotent — adding an existing anchor is a no-op", () => {
      const storage = createMemoryStorage();
      setCollapsedAnchors(storage, "tree-1", ["anchor-a", "anchor-b"]);
      addCollapsedAnchor(storage, "tree-1", "anchor-a");
      expect(getCollapsedAnchors(storage, "tree-1")).toEqual([
        "anchor-a",
        "anchor-b",
      ]);
    });
  });

  describe("removeCollapsedAnchor", () => {
    it("removes an existing anchor", () => {
      const storage = createMemoryStorage();
      setCollapsedAnchors(storage, "tree-1", ["anchor-a", "anchor-b"]);
      removeCollapsedAnchor(storage, "tree-1", "anchor-a");
      expect(getCollapsedAnchors(storage, "tree-1")).toEqual(["anchor-b"]);
    });

    it("is a no-op when removing a missing id", () => {
      const storage = createMemoryStorage();
      setCollapsedAnchors(storage, "tree-1", ["anchor-a"]);
      removeCollapsedAnchor(storage, "tree-1", "anchor-z");
      expect(getCollapsedAnchors(storage, "tree-1")).toEqual(["anchor-a"]);
    });

    it("is a no-op on an empty store", () => {
      const storage = createMemoryStorage();
      removeCollapsedAnchor(storage, "tree-1", "anchor-a");
      expect(getCollapsedAnchors(storage, "tree-1")).toEqual([]);
    });
  });
});
