import { describe, expect, it } from "vitest";

import type { ExprNode } from "@/lib/functions/types";

import {
  buildRowValuesForReportRow,
  evaluateReportExprOnRow,
} from "./report-expr";

describe("buildRowValuesForReportRow", () => {
  it("adds gridId.fieldId aliases", () => {
    const row = {
      __gridId: "inventory_grid",
      quantity: 12,
      unit_price: 3200,
    };
    const rv = buildRowValuesForReportRow(row);
    expect(rv.quantity).toBe(12);
    expect(rv["inventory_grid.quantity"]).toBe(12);
    expect(rv["inventory_grid.unit_price"]).toBe(3200);
  });
});

describe("evaluateReportExprOnRow", () => {
  it("evaluates mul with grid-qualified field ids", () => {
    const expr: ExprNode = {
      op: "mul",
      args: [
        { op: "field", fieldId: "inventory_grid.quantity" },
        { op: "field", fieldId: "inventory_grid.unit_price" },
      ],
    } as ExprNode;
    const row = {
      __gridId: "inventory_grid",
      quantity: 12,
      unit_price: 100,
    };
    expect(evaluateReportExprOnRow(expr, row)).toBe(1200);
  });
});
