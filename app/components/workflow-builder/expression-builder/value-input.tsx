"use client";

import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";

interface ValueInputProps {
  value: unknown;
  onChange: (value: unknown) => void;
}

export function ValueInput({ value, onChange }: ValueInputProps) {
  const [textValue, setTextValue] = useState(
    value !== undefined ? String(value) : ""
  );

  useEffect(() => {
    setTextValue(value !== undefined ? String(value) : "");
  }, [value]);

  const handleChange = (newText: string) => {
    setTextValue(newText);

    // Try to parse as number or boolean
    if (newText === "true") {
      onChange(true);
    } else if (newText === "false") {
      onChange(false);
    } else if (!isNaN(Number(newText)) && newText !== "") {
      onChange(Number(newText));
    } else {
      onChange(newText);
    }
  };

  return (
    <Input
      type="text"
      value={textValue}
      onChange={(e) => handleChange(e.target.value)}
      placeholder="Enter value"
      className="w-[200px]"
    />
  );
}
