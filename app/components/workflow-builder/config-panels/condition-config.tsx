"use client";

import type { ConditionNode } from "@/lib/workflows/types";
import type { AvailableField } from "@/app/components/tracker-display/edit-mode/expr/expr-types";
import { ExprRuleEditor } from "@/app/components/tracker-display/edit-mode/expr/ExprRuleEditor";

interface ConditionConfigProps {
  node: ConditionNode;
  availableFields: AvailableField[];
  onChange: (node: ConditionNode) => void;
}

export function ConditionConfig({
  node,
  availableFields,
  onChange,
}: ConditionConfigProps) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-foreground/70">
          Condition (IF)
        </label>
        <p className="mt-0.5 text-xs text-muted-foreground mb-3">
          Use the same visual expression editor as validations. Connect the True
          or False handle to downstream nodes.
        </p>
        <ExprRuleEditor
          expr={node.config.condition}
          gridId="workflow"
          fieldId={`condition_${node.id}`}
          availableFields={availableFields}
          mode="validation"
          onChange={(condition) =>
            onChange({
              ...node,
              config: { ...node.config, condition },
            })
          }
        />
      </div>
    </div>
  );
}
