"use client";

import type { ConditionNode } from "@/lib/workflows/types";
import type { ExprNode } from "@/lib/functions/types";
import { ExpressionBuilder } from "../expression-builder/expression-builder";

interface ConditionConfigProps {
  node: ConditionNode;
  availableFields: { fieldId: string; label: string; dataType?: string }[];
  onChange: (node: ConditionNode) => void;
}

export function ConditionConfig({
  node,
  availableFields,
  onChange,
}: ConditionConfigProps) {
  const handleExpressionChange = (newExpr: ExprNode) => {
    onChange({
      ...node,
      config: {
        ...node.config,
        condition: newExpr,
      },
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-foreground/70">
          Condition Expression
        </label>
        <p className="mt-0.5 text-xs text-muted-foreground mb-3">
          Build a condition that evaluates to true or false. Use logical
          operators (AND, OR, NOT) and comparisons (==, !=, {">"},{"<"}, {">="},
          {"<="}).
        </p>
        <ExpressionBuilder
          value={node.config.condition}
          onChange={handleExpressionChange}
          availableFields={availableFields}
          mode="condition"
        />
      </div>
    </div>
  );
}
