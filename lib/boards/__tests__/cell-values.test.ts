import { describe, expect, it } from "vitest";

import { numberFromCell, stringKeyForCell } from "../cell-values";

describe("numberFromCell", () => {
  it("parses numbers and numeric strings", () => {
    expect(numberFromCell(3)).toBe(3);
    expect(numberFromCell("12.5")).toBe(12.5);
    expect(numberFromCell("")).toBe(null);
    expect(numberFromCell("x")).toBe(null);
    expect(numberFromCell(null)).toBe(null);
    expect(numberFromCell({})).toBe(null);
  });
});

describe("stringKeyForCell", () => {
  it("normalizes primitives and empty", () => {
    expect(stringKeyForCell(null)).toBe("");
    expect(stringKeyForCell(undefined)).toBe("");
    expect(stringKeyForCell("a")).toBe("a");
    expect(stringKeyForCell({ b: 1 })).toBe(JSON.stringify({ b: 1 }));
  });
});
