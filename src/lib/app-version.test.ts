import { afterEach, describe, expect, it, vi } from "vitest";
import { getAppVersion } from "./app-version";

describe("getAppVersion", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns the APP_VERSION env value when set", () => {
    vi.stubEnv("APP_VERSION", "1.2.3");
    expect(getAppVersion()).toBe("1.2.3");
  });

  it('returns "unknown" when APP_VERSION is not set', () => {
    vi.stubEnv("APP_VERSION", "");
    expect(getAppVersion()).toBe("unknown");
  });
});
