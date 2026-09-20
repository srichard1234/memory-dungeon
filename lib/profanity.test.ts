import { describe, expect, it } from "vitest";
import { isProfane } from "./profanity";

describe("isProfane", () => {
  it("flags a known slur", () => {
    expect(isProfane("FUCK")).toBe(true);
  });

  it("allows an ordinary name", () => {
    expect(isProfane("ABC")).toBe(false);
    expect(isProfane("MARIO")).toBe(false);
  });
});
