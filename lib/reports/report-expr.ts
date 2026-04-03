import type { ExprNode } from "@/lib/functions/types";
import { evaluateExpr } from "@/lib/functions/evaluator";

/**
 * Map a flattened report row to `FunctionContext.rowValues` for {@link evaluateExpr}.
 * Duplicates each cell as `gridId.fieldId` when `__gridId` is present so expressions
 * from {@link generateExpr} (which use `inventory_grid.quantity`) resolve correctly.
 */
export function buildRowValuesForReportRow(
  row: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...row };
  const gridId =
    typeof row.__gridId === "string" && row.__gridId.trim()
      ? row.__gridId.trim()
      : null;
  if (gridId) {
    for (const [k, v] of Object.entries(row)) {
      if (k.startsWith("__")) continue;
      const composite = `${gridId}.${k}`;
      if (!(composite in out)) {
        out[composite] = v;
      }
    }
  }
  return out;
}

/** Evaluate a tracker ExprNode against one flattened report row. */
export function evaluateReportExprOnRow(
  expr: ExprNode,
  row: Record<string, unknown>,
): unknown {
  return evaluateExpr(expr, {
    rowValues: buildRowValuesForReportRow(row),
    fieldId: "report",
  });
}
