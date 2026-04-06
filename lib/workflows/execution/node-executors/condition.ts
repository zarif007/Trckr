/**
 * Condition node executor.
 * Evaluates the ExprNode condition against the current context.
 * Returns "true" or "false" branch label for graph traversal.
 */

import { evaluateExpr } from "@/lib/functions/evaluator";
import type { FunctionContext } from "@/lib/functions/types";
import type {
  ConditionNode,
  WorkflowExecutionContext,
} from "@/lib/workflows/types";

export async function executeConditionNode(
  node: ConditionNode,
  context: WorkflowExecutionContext,
): Promise<"true" | "false"> {
  const rowValues = {
    ...context.triggerData.rowData,
    ...context.mappedData,
    _trigger: context.triggerData,
  };

  const fnCtx: FunctionContext = {
    rowValues,
    fieldId: "workflow_condition",
  };

  const result = evaluateExpr(node.config.condition, fnCtx);
  return result ? "true" : "false";
}
