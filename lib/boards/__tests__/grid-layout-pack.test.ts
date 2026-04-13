import { describe, expect, it } from "vitest";
import type { BoardElement } from "../board-definition";
import { BOARD_GRID_MAX_COLS, packRowColumnPositions } from "../grid-layout-utils";

function stat(id: string, col: number, colSpan: number): BoardElement {
  return {
    id,
    type: "stat",
    placeId: 0,
    row: 0,
    col,
    colSpan,
    rowSpan: 1,
    title: undefined,
    source: {
      trackerSchemaId: "t1",
      gridId: "g1",
      fieldIds: [],
    },
    aggregate: "count",
  };
}

describe("packRowColumnPositions", () => {
  it("packs columns left-to-right in array order", () => {
    const rows: BoardElement[][] = [
      [stat("a", 99, 6), stat("b", 0, 6)],
    ];
    const packed = packRowColumnPositions(rows);
    expect(packed[0]![0]!.col).toBe(0);
    expect(packed[0]![0]!.colSpan).toBe(6);
    expect(packed[0]![1]!.col).toBe(6);
    expect(packed[0]![1]!.colSpan).toBe(6);
  });

  it("clamps span when row would exceed max columns", () => {
    const rows: BoardElement[][] = [
      [stat("a", 0, 8), stat("b", 0, 8)],
    ];
    const packed = packRowColumnPositions(rows);
    expect(packed[0]![0]!.col).toBe(0);
    expect(packed[0]![0]!.colSpan).toBe(8);
    expect(packed[0]![1]!.col).toBe(8);
    expect(packed[0]![1]!.colSpan).toBe(BOARD_GRID_MAX_COLS - 8);
  });
});
