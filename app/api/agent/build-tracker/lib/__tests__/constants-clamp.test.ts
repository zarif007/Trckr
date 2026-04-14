import { describe, expect, it } from "vitest";

import {
  BUILDER_MAX_TOKENS,
  clampBuilderMaxOutputTokens,
} from "../constants";

describe("clampBuilderMaxOutputTokens", () => {
  it("defaults to cap", () => {
    expect(clampBuilderMaxOutputTokens()).toBe(BUILDER_MAX_TOKENS);
  });

  it("clamps above cap", () => {
    expect(clampBuilderMaxOutputTokens(50_000)).toBe(BUILDER_MAX_TOKENS);
  });

  it("clamps below 1 to 1", () => {
    expect(clampBuilderMaxOutputTokens(0)).toBe(1);
    expect(clampBuilderMaxOutputTokens(-5)).toBe(1);
  });

  it("floors non-integers", () => {
    expect(clampBuilderMaxOutputTokens(4096.9)).toBe(4096);
  });
});
