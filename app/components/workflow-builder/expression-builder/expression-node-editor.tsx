"use client";

import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import type { ExprNode } from "@/lib/functions/types";
import { FieldPicker } from "./field-picker";
import { OperatorSelector } from "./operator-selector";
import { ValueInput } from "./value-input";

interface ExpressionNodeEditorProps {
  node: ExprNode;
  onChange: (node: ExprNode) => void;
  availableFields: Array<{
    fieldId: string;
    label: string;
    dataType?: string;
  }>;
  mode: "condition" | "expression";
  depth?: number;
  onRemove?: () => void;
}

export function ExpressionNodeEditor({
  node,
  onChange,
  availableFields,
  mode,
  depth = 0,
  onRemove,
}: ExpressionNodeEditorProps) {
  const operators: string[] =
    mode === "condition"
      ? ["and", "or", "not", "==", "!=", ">", "<", ">=", "<=", "eq", "neq", "gt", "gte", "lt", "lte"]
      : ["add", "sub", "mul", "div", "field", "const"];

  const handleOperatorChange = (newOp: string) => {
    // When changing operator, reset shape based on operator type
    if (newOp === "field") return onChange({ op: "field", fieldId: "" });
    if (newOp === "const") return onChange({ op: "const", value: "" });

    if (newOp === "and" || newOp === "or") {
      return onChange({ op: newOp, args: [{ op: "const", value: "" }] });
    }

    if (newOp === "not") {
      return onChange({ op: "not", arg: { op: "const", value: "" } });
    }

    if (newOp === "add" || newOp === "mul") {
      return onChange({ op: newOp, args: [{ op: "const", value: "" }, { op: "const", value: "" }] });
    }

    if (newOp === "sub" || newOp === "div") {
      return onChange({
        op: newOp,
        left: { op: "const", value: "" },
        right: { op: "const", value: "" },
      });
    }

    // Comparison operators share left/right shape
    if (
      newOp === "eq" ||
      newOp === "neq" ||
      newOp === "gt" ||
      newOp === "gte" ||
      newOp === "lt" ||
      newOp === "lte" ||
      newOp === "=" ||
      newOp === "==" ||
      newOp === "===" ||
      newOp === "!=" ||
      newOp === "!==" ||
      newOp === ">" ||
      newOp === ">=" ||
      newOp === "<" ||
      newOp === "<="
    ) {
      return onChange({
        op: newOp,
        left: { op: "const", value: "" },
        right: { op: "const", value: "" },
      } as ExprNode);
    }

    // Fallback to a safe constant if an unexpected operator appears
    onChange({ op: "const", value: "" });
  };

  const isNaryArgsOp = (n: ExprNode): n is Extract<ExprNode, { args: ExprNode[] }> =>
    "args" in n && Array.isArray((n as { args?: unknown }).args);

  const isBinaryOp = (n: ExprNode): n is Extract<ExprNode, { left: ExprNode; right: ExprNode }> =>
    "left" in n && "right" in n;

  const isUnaryArgOp = (n: ExprNode): n is Extract<ExprNode, { arg: ExprNode }> => "arg" in n;

  const handleArgsChange = (index: number, newArg: ExprNode) => {
    if (!isNaryArgsOp(node)) return;
    const newArgs = [...node.args];
    newArgs[index] = newArg;
    onChange({ ...node, args: newArgs });
  };

  const handleAddArg = () => {
    if (!isNaryArgsOp(node)) return;
    onChange({ ...node, args: [...node.args, { op: "const", value: "" }] });
  };

  const handleRemoveArg = (index: number) => {
    if (!isNaryArgsOp(node)) return;
    onChange({ ...node, args: node.args.filter((_, i) => i !== index) });
  };

  const handleBinaryChange = (side: "left" | "right", next: ExprNode) => {
    if (!isBinaryOp(node)) return;
    onChange({ ...node, [side]: next });
  };

  const handleUnaryChange = (next: ExprNode) => {
    if (!isUnaryArgOp(node)) return;
    onChange({ ...node, arg: next });
  };

  return (
    <div className="space-y-3" style={{ marginLeft: depth * 16 }}>
      <div className="flex items-center gap-2">
        <OperatorSelector
          value={node.op}
          onChange={handleOperatorChange}
          operators={operators}
        />

        {node.op === "field" && (
          <FieldPicker
            value={node.fieldId}
            onChange={(fieldId) => onChange({ ...node, fieldId })}
            fields={availableFields}
          />
        )}

        {node.op === "const" && (
          <ValueInput
            value={node.value}
            onChange={(value) => onChange({ ...node, value })}
          />
        )}

        {onRemove && (
          <Button size="sm" variant="ghost" onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isNaryArgsOp(node) && node.args.length > 0 && (
        <div className="space-y-2 border-l-2 border-muted pl-4">
          {node.args.map((arg, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <ExpressionNodeEditor
                node={arg}
                onChange={(newArg) => handleArgsChange(idx, newArg)}
                availableFields={availableFields}
                mode={mode}
                depth={depth + 1}
                onRemove={() => handleRemoveArg(idx)}
              />
            </div>
          ))}
        </div>
      )}

      {isBinaryOp(node) && (
        <div className="space-y-2 border-l-2 border-muted pl-4">
          <ExpressionNodeEditor
            node={node.left}
            onChange={(next) => handleBinaryChange("left", next)}
            availableFields={availableFields}
            mode={mode}
            depth={depth + 1}
          />
          <ExpressionNodeEditor
            node={node.right}
            onChange={(next) => handleBinaryChange("right", next)}
            availableFields={availableFields}
            mode={mode}
            depth={depth + 1}
          />
        </div>
      )}

      {isUnaryArgOp(node) && (
        <div className="space-y-2 border-l-2 border-muted pl-4">
          <ExpressionNodeEditor
            node={node.arg}
            onChange={handleUnaryChange}
            availableFields={availableFields}
            mode={mode}
            depth={depth + 1}
          />
        </div>
      )}

      {isNaryArgsOp(node) && (
        <Button size="sm" variant="outline" onClick={handleAddArg} className="ml-0">
          <Plus className="h-4 w-4 mr-2" />
          Add operand
        </Button>
      )}
    </div>
  );
}
