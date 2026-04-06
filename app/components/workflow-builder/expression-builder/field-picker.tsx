"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface FieldPickerProps {
  value: string;
  onChange: (value: string) => void;
  fields: Array<{ fieldId: string; label: string; dataType?: string }>;
}

export function FieldPicker({ value, onChange, fields }: FieldPickerProps) {
  const [open, setOpen] = useState(false);

  const selectedField = fields.find((f) => f.fieldId === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[300px] justify-between"
        >
          {selectedField ? selectedField.label : "Select field..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Search fields..." />
          <CommandEmpty>No field found.</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-y-auto">
            {fields.map((field) => (
              <CommandItem
                key={field.fieldId}
                value={field.fieldId}
                onSelect={(currentValue) => {
                  onChange(currentValue);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === field.fieldId ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex flex-col">
                  <span className="text-sm">{field.label}</span>
                  {field.dataType && (
                    <span className="text-xs text-muted-foreground">
                      {field.dataType}
                    </span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
