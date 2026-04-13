import { describe, expect, it } from "vitest";
import type { AssembledSchema } from "../assembled-tracker-schema";
import type { BoardElement } from "../board-definition";
import { snapBoardElementToSchema } from "../snap-board-element-to-schema";

const schema: AssembledSchema = {
  grids: [
    { id: "g1", name: "Main" },
    { id: "g2", name: "Other" },
  ],
  fields: [
    { id: "f1", ui: { label: "A" } },
    { id: "f2", ui: { label: "B" } },
  ],
  layoutNodes: [
    { gridId: "g1", fieldId: "f1" },
    { gridId: "g1", fieldId: "f2" },
    { gridId: "g2", fieldId: "f1" },
  ],
};

describe("snapBoardElementToSchema", () => {
  it("moves stat to first grid and aligns fields when grid id invalid", () => {
    const el: BoardElement = {
      id: "w1",
      type: "stat",
      placeId: 0,
      row: 0,
      col: 0,
      colSpan: 6,
      rowSpan: 1,
      aggregate: "sum",
      source: {
        trackerSchemaId: "t",
        gridId: "missing",
        fieldIds: ["f1"],
      },
    };
    const next = snapBoardElementToSchema(el, schema);
    expect(next.type).toBe("stat");
    if (next.type !== "stat") return;
    expect(next.source.gridId).toBe("g1");
    expect(next.source.fieldIds).toEqual(["f1"]);
    expect(next.aggregate).toBe("sum");
  });

  it("preserves chart group-by when still valid for new grid", () => {
    const el: BoardElement = {
      id: "c1",
      type: "chart",
      placeId: 0,
      row: 0,
      col: 0,
      colSpan: 6,
      rowSpan: 1,
      chartKind: "bar",
      source: {
        trackerSchemaId: "t",
        gridId: "g1",
        fieldIds: [],
        groupByFieldId: "f1",
        metricFieldId: "f2",
      },
    };
    const next = snapBoardElementToSchema(el, schema);
    expect(next.type).toBe("chart");
    if (next.type !== "chart") return;
    expect(next.source.gridId).toBe("g1");
    expect(next.source.groupByFieldId).toBe("f1");
    expect(next.source.metricFieldId).toBe("f2");
  });
});
