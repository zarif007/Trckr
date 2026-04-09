import { describe, expect, it } from "vitest";
import { rowIdFromRow, rowPayloadForPatch } from "../row-utils";

describe("rowIdFromRow", () => {
  it("prefers _rowId", () => {
    expect(rowIdFromRow({ _rowId: "a", row_id: "b" })).toBe("a");
  });

  it("falls back to row_id", () => {
    expect(rowIdFromRow({ row_id: "x" })).toBe("x");
  });

  it("returns undefined when missing", () => {
    expect(rowIdFromRow({})).toBeUndefined();
  });
});

describe("rowPayloadForPatch", () => {
  it("drops underscore-prefixed keys", () => {
    expect(
      rowPayloadForPatch({
        _rowId: "1",
        _sortOrder: 0,
        name: "Hi",
      }),
    ).toEqual({ name: "Hi" });
  });
});
