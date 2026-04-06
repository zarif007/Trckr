"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface OperatorSelectorProps {
  value: string;
  onChange: (value: string) => void;
  operators: string[];
}

export function OperatorSelector({
  value,
  onChange,
  operators,
}: OperatorSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[140px]">
        <SelectValue placeholder="Select operator" />
      </SelectTrigger>
      <SelectContent>
        {operators.map((op) => (
          <SelectItem key={op} value={op}>
            {op}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
