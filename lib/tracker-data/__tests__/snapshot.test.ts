import { describe, expect, it } from "vitest";
import { backfillRowIds } from "../backfill";
import {
  allocateRowIdBetween,
  appendRowId,
  assignOrderKeyAfterRowMove,
  isNumericRowId,
  maxNumericRowId,
  renormalizeGridRowIds,
} from "../row-order-key";
import { validateGridDataSnapshot } from "../validate";

describe("validateGridDataSnapshot", () => {
  it("rejects null, arrays, and primitives", () => {
    expect(validateGridDataSnapshot(null)).toBe(false);
    expect(validateGridDataSnapshot([])).toBe(false);
    expect(validateGridDataSnapshot("x")).toBe(false);
  });

  it("accepts empty object", () => {
    expect(validateGridDataSnapshot({})).toBe(true);
  });

  it("rejects non-array grid values", () => {
    expect(validateGridDataSnapshot({ g1: {} as unknown })).toBe(false);
    expect(validateGridDataSnapshot({ g1: "rows" as unknown })).toBe(false);
  });

  it("rejects rows that are not plain objects", () => {
    expect(validateGridDataSnapshot({ g1: [null] })).toBe(false);
    expect(validateGridDataSnapshot({ g1: [[]] })).toBe(false);
    expect(validateGridDataSnapshot({ g1: ["x"] })).toBe(false);
  });

  it("accepts arrays of plain records", () => {
    expect(validateGridDataSnapshot({ g1: [{ a: 1 }, { b: 2 }] })).toBe(true);
  });
});

describe("backfillRowIds", () => {
  it("assigns numeric row_id for rows missing or string row_id", () => {
    const out = backfillRowIds({
      g1: [{ row_id: "uuid-1" }, { foo: 1 }, { row_id: 99 }],
    });
    expect((out.g1[0] as { row_id: unknown }).row_id).toBe(1);
    expect((out.g1[1] as { row_id: unknown }).row_id).toBe(2);
    expect((out.g1[2] as { row_id: unknown }).row_id).toBe(99);
  });

  it("leaves rows with _rowId unchanged", () => {
    const row = { _rowId: "srv", row_id: "legacy" };
    const out = backfillRowIds({ g1: [row] });
    expect(out.g1[0]).toBe(row);
  });
});

describe("row-order-key helpers", () => {
  it("maxNumericRowId and appendRowId", () => {
    const rows = [{ row_id: 3 }, { row_id: "x" }, { row_id: 10 }];
    expect(maxNumericRowId(rows)).toBe(10);
    expect(appendRowId(rows)).toBe(11);
  });

  it("allocateRowIdBetween midpoint", () => {
    expect(allocateRowIdBetween(0, 10)).toMatchObject({
      key: 5,
      collapsed: false,
    });
  });

  it("renormalizeGridRowIds assigns contiguous ids", () => {
    const out = renormalizeGridRowIds([{ a: 1 }, { b: 2 }]);
    expect(out.map((r) => r.row_id)).toEqual([1, 2]);
  });

  it("assignOrderKeyAfterRowMove keeps row count and sets numeric row_id on moved row", () => {
    const rows = [
      { row_id: 2, id: "second" },
      { row_id: 1, id: "first" },
    ];
    const moved = assignOrderKeyAfterRowMove(rows, 1);
    expect(moved).toHaveLength(2);
    expect(isNumericRowId((moved[1] as { row_id: unknown }).row_id)).toBe(true);
  });
});
