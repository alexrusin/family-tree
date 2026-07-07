import { describe, expect, it } from "vitest";
import { resolveCurrentVersion } from "./current-version";

describe("resolveCurrentVersion", () => {
  it("returns null when there are no versions", () => {
    expect(resolveCurrentVersion([], null)).toBeNull();
  });

  it("defaults to the highest-numbered version when no pointer is set", () => {
    const versions = [{ versionNumber: 1 }, { versionNumber: 3 }, { versionNumber: 2 }];
    expect(resolveCurrentVersion(versions, null)).toEqual({ versionNumber: 3 });
  });

  it("returns the version matching the current pointer, even if it isn't the latest", () => {
    const versions = [{ versionNumber: 1 }, { versionNumber: 2 }, { versionNumber: 3 }];
    expect(resolveCurrentVersion(versions, 2)).toEqual({ versionNumber: 2 });
  });

  it("falls back to the latest version when the pointer no longer matches any version", () => {
    const versions = [{ versionNumber: 1 }, { versionNumber: 2 }];
    expect(resolveCurrentVersion(versions, 99)).toEqual({ versionNumber: 2 });
  });
});
