"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { NodeTriggerType } from "@/lib/field-rules";

interface NodeTriggerOption {
  value: NodeTriggerType;
  label: string;
  description: string;
}

const TRIGGERS: NodeTriggerOption[] = [
  {
    value: "onMount",
    label: "On Load",
    description: "Every time the tracker loads",
  },
  {
    value: "onRowCreate",
    label: "On New Row",
    description: "When a new row is created",
  },
  {
    value: "onRowCopy",
    label: "On Copy",
    description: "When a row is duplicated",
  },
  {
    value: "onRowFocus",
    label: "On Focus",
    description: "When a row is selected for editing",
  },
  {
    value: "onFieldChange",
    label: "When Field Changes",
    description: "Re-evaluates live as other fields in the row change",
  },
];

interface NodeTriggerSelectorProps {
  value: NodeTriggerType;
  onChange: (value: NodeTriggerType) => void;
  disabled?: boolean;
}

export function NodeTriggerSelector({
  value,
  onChange,
  disabled,
}: NodeTriggerSelectorProps) {
  return (
    <Select
      value={value}
      onValueChange={onChange as (v: string) => void}
      disabled={disabled}
    >
      <SelectTrigger className="h-8 text-xs">
        <SelectValue placeholder="Select trigger…" />
      </SelectTrigger>
      <SelectContent>
        {TRIGGERS.map((t) => (
          <SelectItem key={t.value} value={t.value} className="text-xs">
            <div className="flex flex-col">
              <span className="font-medium">{t.label}</span>
              <span className="text-muted-foreground text-[11px]">
                {t.description}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
