/**
 * Map Fields node executor.
 * Resolves field mappings (field refs or expressions) from the context into mapped data.
 */

import { evaluateExpr } from "@/lib/functions/evaluator";
import type { FunctionContext } from "@/lib/functions/types";
import type {
  MapFieldsNode,
  WorkflowExecutionContext,
} from "@/lib/workflows/types";

export async function executeMapFieldsNode(
  node: MapFieldsNode,
  context: WorkflowExecutionContext,
): Promise<Record<string, unknown>> {
  const result: Record<string, unknown> = {};

  for (const mapping of node.config.mappings) {
    const rowValues = {
      ...context.triggerData.rowData,
      ...context.mappedData,
    };

    const fnCtx: FunctionContext = {
      rowValues,
      fieldId: `map_${mapping.id}`,
    };

    let value: unknown;
    if (mapping.source.type === "field" && mapping.source.path) {
      // Resolve field reference from rowValues
      value = resolveFieldPath(rowValues, mapping.source.path);
    } else if (mapping.source.type === "expression" && mapping.source.expr) {
      value = evaluateExpr(mapping.source.expr, fnCtx);
    } else {
      continue;
    }

    // Row JSON uses flat field slugs; grid scoping is resolved at action time.
    result[mapping.target.fieldId] = value;
  }

  // Merge into context for downstream nodes
  context.mappedData = { ...context.mappedData, ...result };

  return result;
}

function resolveFieldPath(
  rowValues: Record<string, unknown>,
  path: string,
): unknown {
  if (rowValues[path] !== undefined) {
    return rowValues[path];
  }
  // Support dot-separated paths (gridId.fieldId)
  const parts = path.split(".");
  if (parts.length === 2) {
    if (rowValues[path] !== undefined) {
      return rowValues[path];
    }
    // Fallback: try the last part as a bare fieldId
    return rowValues[parts[1]];
  }
  return undefined;
}
