import { describe, expect, it } from "vitest";
import {
  GRID_ROWS_MAX_LIMIT,
  clampGridRowsLimit,
  clampGridRowsOffset,
} from "../limits";

describe("clampGridRowsLimit", () => {
  it("clamps to API bounds", () => {
    expect(clampGridRowsLimit(0)).toBe(1);
    expect(clampGridRowsLimit(2000)).toBe(GRID_ROWS_MAX_LIMIT);
    expect(clampGridRowsLimit(25)).toBe(25);
  });

  it("handles non-finite", () => {
    expect(clampGridRowsLimit(Number.NaN)).toBe(50);
  });
});

describe("clampGridRowsOffset", () => {
  it("rejects negative", () => {
    expect(clampGridRowsOffset(-1)).toBe(0);
  });
});
