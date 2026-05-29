import { describe, expect, it } from "vitest";
import en from "./en.json";
import es from "./es.json";
import ru from "./ru.json";

describe("tree menu dictionary keys", () => {
  it("contains tree menu strings in English", () => {
    expect(en.tree.treeMenu.trigger).toBeTruthy();
    expect(en.tree.treeMenu.close).toBeTruthy();
  });

  it("contains tree menu strings in Russian", () => {
    expect(ru.tree.treeMenu.trigger).toBeTruthy();
    expect(ru.tree.treeMenu.close).toBeTruthy();
  });

  it("contains tree menu strings in Spanish", () => {
    expect(es.tree.treeMenu.trigger).toBeTruthy();
    expect(es.tree.treeMenu.close).toBeTruthy();
  });
});
