import { describe, expect, it } from "vitest";
import { isPublicSharePath } from "./public-route";

describe("public-route helper", () => {
  it("matches /t/<token>", () => {
    expect(isPublicSharePath("/t/abc")).toBe(true);
  });

  it("does not match locale-prefixed tree routes", () => {
    expect(isPublicSharePath("/en/trees/t1")).toBe(false);
  });

  it("does not match api routes", () => {
    expect(isPublicSharePath("/api/public-tree/abc")).toBe(false);
  });
});
