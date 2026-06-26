import { describe, expect, it } from "vitest";
import { validateDescriptionInput } from "./issue-report-form-state";

describe("issue report form state", () => {
  it("rejects empty descriptions", () => {
    expect(validateDescriptionInput("")).toBe("ERR_DESCRIPTION_REQUIRED");
  });

  it("rejects whitespace-only descriptions", () => {
    expect(validateDescriptionInput("   ")).toBe("ERR_DESCRIPTION_REQUIRED");
  });

  it("rejects descriptions over 2000 characters", () => {
    const long = "a".repeat(2001);
    expect(validateDescriptionInput(long)).toBe("ERR_DESCRIPTION_TOO_LONG");
  });

  it("accepts a valid description", () => {
    expect(validateDescriptionInput("Something is broken")).toBeNull();
  });

  it("accepts a description at exactly 2000 characters", () => {
    const exact = "a".repeat(2000);
    expect(validateDescriptionInput(exact)).toBeNull();
  });
});
