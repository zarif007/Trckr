import { describe, expect, it } from "vitest";
import type { FieldCalculationRule } from "@/lib/functions/types";
import {
  applyCalculationsForRow,
  applyCompiledCalculationsForRow,
  buildAccumulateDepsBySourceGrid,
  compileCalculationsForGrid,
  getCalculationCacheStats,
  resetCalculationCacheStats,
} from "../index";

describe("applyCalculationsForRow", () => {
  it("computes mul from row fields", () => {
    const calculations: Record<string, FieldCalculationRule> = {
      "g1.line_total": {
        expr: {
          op: "mul",
          args: [
            { op: "field", fieldId: "price" },
            { op: "field", fieldId: "qty" },
          ],
        },
      },
    };
    const r = applyCalculationsForRow({
      gridId: "g1",
      row: { price: 10, qty: 3, line_total: 0 },
      calculations,
    });
    expect(r.row.line_total).toBe(30);
    expect(r.updatedFieldIds).toContain("line_total");
  });

  it("only recomputes targets reachable from changedFieldIds", () => {
    const calculations: Record<string, FieldCalculationRule> = {
      "g1.line_total": {
        expr: {
          op: "mul",
          args: [
            { op: "field", fieldId: "price" },
            { op: "field", fieldId: "qty" },
          ],
        },
      },
    };
    const r = applyCalculationsForRow({
      gridId: "g1",
      row: { price: 5, qty: 4, line_total: 999 },
      calculations,
      changedFieldIds: ["price"],
    });
    expect(r.row.line_total).toBe(20);
    expect(r.updatedFieldIds).toEqual(["line_total"]);
  });

  it("reports cyclic targets and avoids infinite updates", () => {
    const calculations: Record<string, FieldCalculationRule> = {
      "g1.a": { expr: { op: "field", fieldId: "b" } },
      "g1.b": { expr: { op: "field", fieldId: "a" } },
    };
    const r = applyCalculationsForRow({
      gridId: "g1",
      row: { a: 1, b: 2 },
      calculations,
    });
    expect(r.skippedCyclicTargets.sort()).toEqual(["a", "b"]);
  });
});

describe("compileCalculationsForGrid + applyCompiledCalculationsForRow", () => {
  it("reuses compiled plan for incremental pass", () => {
    const calculations: Record<string, FieldCalculationRule> = {
      "g1.t": {
        expr: {
          op: "add",
          args: [
            { op: "field", fieldId: "x" },
            { op: "const", value: 1 },
          ],
        },
      },
    };
    const plan = compileCalculationsForGrid("g1", calculations);
    const first = applyCompiledCalculationsForRow({
      plan,
      row: { x: 5, t: 0 },
      changedFieldIds: ["x"],
    });
    expect(first.row.t).toBe(6);
    const second = applyCompiledCalculationsForRow({
      plan,
      row: { ...first.row, x: 10 },
      changedFieldIds: ["x"],
    });
    expect(second.row.t).toBe(11);
  });
});

describe("buildAccumulateDepsBySourceGrid", () => {
  it("maps source grid ids to targets that accumulate them", () => {
    const calculations: Record<string, FieldCalculationRule> = {
      "main.sum": {
        expr: {
          op: "accumulate",
          sourceFieldId: "lines.amount",
          action: "add",
        },
      },
    };
    const m = buildAccumulateDepsBySourceGrid(calculations);
    expect(m.get("lines")).toContain("main");
  });
});

describe("calculation plan cache stats", () => {
  it("increments hits when reusing same calculations object", () => {
    resetCalculationCacheStats();
    const calculations: Record<string, FieldCalculationRule> = {
      "g9.k": { expr: { op: "const", value: 1 } },
    };
    applyCalculationsForRow({
      gridId: "g9",
      row: {},
      calculations,
    });
    applyCalculationsForRow({
      gridId: "g9",
      row: {},
      calculations,
    });
    const stats = getCalculationCacheStats();
    expect(stats.misses).toBeGreaterThanOrEqual(1);
    expect(stats.hits).toBeGreaterThanOrEqual(1);
  });
});
