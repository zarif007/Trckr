"use client";

import { Plus, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { theme } from "@/lib/theme";
import { FieldRuleV2Card } from "./FieldRuleV2Card";
import type { AvailableField } from "../expr/expr-types";
import type { TrackerDisplayProps } from "../../types";
import type { FieldRule } from "@/lib/field-rules";
import { deriveEngineType } from "@/lib/field-rules";

function createDefaultRule(): FieldRule {
  return {
    id: crypto.randomUUID(),
    enabled: true,
    trigger: "onMount",
    property: "visibility",
    outcome: { op: "const", value: true } as never,
    engineType: deriveEngineType("visibility"),
  };
}

interface FieldRulesV2TabProps {
  gridId: string;
  fieldId: string;
  fieldRulesV2: FieldRule[];
  setFieldRulesV2: (rules: FieldRule[]) => void;
  availableFields: AvailableField[];
  currentTracker?: TrackerDisplayProps;
  trackerSchemaId?: string | null;
}

export function FieldRulesV2Tab({
  gridId,
  fieldId,
  fieldRulesV2,
  setFieldRulesV2,
  availableFields,
  currentTracker,
  trackerSchemaId,
}: FieldRulesV2TabProps) {
  function handleChange(index: number, updated: FieldRule) {
    const next = [...fieldRulesV2];
    next[index] = updated;
    setFieldRulesV2(next);
  }

  function handleRemove(index: number) {
    setFieldRulesV2(fieldRulesV2.filter((_, i) => i !== index));
  }

  function handleAdd() {
    setFieldRulesV2([...fieldRulesV2, createDefaultRule()]);
  }

  if (fieldRulesV2.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 px-4">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full",
            theme.surface.muted,
          )}
        >
          <Zap className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium">No rules yet</p>
          <p className="text-xs text-muted-foreground">
            Rules control field behavior — visibility, labels, required state,
            and more.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={handleAdd}
        >
          <Plus className="h-3.5 w-3.5" />
          Add first rule
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {fieldRulesV2.map((rule, index) => (
        <FieldRuleV2Card
          key={rule.id}
          rule={rule}
          gridId={gridId}
          fieldId={fieldId}
          availableFields={availableFields}
          currentTracker={currentTracker}
          trackerSchemaId={trackerSchemaId}
          onChange={(updated) => handleChange(index, updated)}
          onRemove={() => handleRemove(index)}
        />
      ))}
      <Button
        variant="outline"
        size="sm"
        className="w-full h-8 gap-1.5 text-xs border-dashed"
        onClick={handleAdd}
      >
        <Plus className="h-3.5 w-3.5" />
        Add another rule
      </Button>
    </div>
  );
}
