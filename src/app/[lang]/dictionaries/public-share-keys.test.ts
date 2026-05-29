import { describe, expect, it } from "vitest";
import en from "./en.json";
import es from "./es.json";
import ru from "./ru.json";

describe("public share dictionary keys", () => {
  it("contains publicShare keys in English", () => {
    expect(en.tree.publicShare.sidebarAction).toBeTruthy();
    expect(en.tree.publicShare.disabledTitle).toBeTruthy();
  });

  it("contains publicShare keys in Russian", () => {
    expect(ru.tree.publicShare.sidebarAction).toBeTruthy();
    expect(ru.tree.publicShare.disabledTitle).toBeTruthy();
  });

  it("contains publicShare keys in Spanish", () => {
    expect(es.tree.publicShare.sidebarAction).toBeTruthy();
    expect(es.tree.publicShare.disabledTitle).toBeTruthy();
  });
});
