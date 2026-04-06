"use client";

import type { ExprNode } from "@/lib/functions/types";
import { cn } from "@/lib/utils";
import { theme } from "@/lib/theme";
import { ExpressionNodeEditor } from "./expression-node-editor";

interface ExpressionBuilderProps {
  value: ExprNode;
  onChange: (value: ExprNode) => void;
  availableFields: Array<{
    fieldId: string;
    label: string;
    dataType?: string;
  }>;
  mode?: "condition" | "expression";
}

export function ExpressionBuilder({
  value,
  onChange,
  availableFields,
  mode = "condition",
}: ExpressionBuilderProps) {
  return (
    <div
      className={cn(
        theme.surface.card,
        theme.border.default,
        theme.radius.md,
        "p-4"
      )}
    >
      <div className="mb-3 text-sm font-medium">
        {mode === "condition" ? "Condition Expression" : "Expression"}
      </div>
      <ExpressionNodeEditor
        node={value}
        onChange={onChange}
        availableFields={availableFields}
        mode={mode}
      />
    </div>
  );
}
