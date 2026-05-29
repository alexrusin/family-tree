import { describe, expect, it } from "vitest";
import PublicLinkDisabled from "./PublicLinkDisabled";

describe("PublicLinkDisabled", () => {
  it("renders disabled title text", () => {
    const element = PublicLinkDisabled({
      t: {
        title: "Link disabled",
        body: "The owner disabled this link.",
        cta: "Create your own tree",
      },
    });

    expect(element).toBeTruthy();
  });
});
