import { describe, expect, it } from "vitest";
import { buildPublicUrl, isShareSettingsAction } from "./share-link-form-state";

describe("share-link-form-state", () => {
  it("builds canonical /t url", () => {
    expect(buildPublicUrl("http://localhost:3000", "abc")).toBe(
      "http://localhost:3000/t/abc",
    );
  });

  it("recognizes valid actions", () => {
    expect(isShareSettingsAction("setEnabled")).toBe(true);
    expect(isShareSettingsAction("regenerate")).toBe(true);
    expect(isShareSettingsAction("save")).toBe(false);
  });
});
