import { describe, it, expect } from "vitest";
import { createOptimisticTempRowId } from "../optimistic-temp-row-id";

describe("createOptimisticTempRowId", () => {
  it("returns unique ids with stable prefix", () => {
    const a = createOptimisticTempRowId();
    const b = createOptimisticTempRowId();
    expect(a).not.toBe(b);
    expect(a.startsWith("__optimistic_")).toBe(true);
    expect(b.startsWith("__optimistic_")).toBe(true);
  });
});
