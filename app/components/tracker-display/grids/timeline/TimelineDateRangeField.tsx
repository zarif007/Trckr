"use client";

import { useState, useCallback, useMemo } from "react";
import { format, parseISO, isValid } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { theme } from "@/lib/theme";

function toIsoDay(d: Date): string {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().split("T")[0] ?? "";
}

function parseDay(v: unknown): Date | undefined {
  if (v == null || v === "") return undefined;
  if (typeof v === "string") {
    const p = parseISO(v);
    return isValid(p) ? p : undefined;
  }
  if (v instanceof Date) return isValid(v) ? v : undefined;
  return undefined;
}

export interface TimelineDateRangeFieldProps {
  startValue: unknown;
  endValue: unknown;
  onRangeChange: (next: { start: string; end: string }) => void;
  disabled?: boolean;
  label: string;
  className?: string;
}

/**
 * Single control for timeline start/end date fields (two underlying `date` columns).
 */
export function TimelineDateRangeField({
  startValue,
  endValue,
  onRangeChange,
  disabled,
  label,
  className,
}: TimelineDateRangeFieldProps) {
  const [open, setOpen] = useState(false);

  const selectedRange = useMemo((): DateRange | undefined => {
    const from = parseDay(startValue);
    const to = parseDay(endValue);
    if (!from && !to) return undefined;
    return { from: from ?? to, to: to ?? from };
  }, [startValue, endValue]);

  const summary = useMemo(() => {
    const from = parseDay(startValue);
    const to = parseDay(endValue);
    if (!from && !to) return "Pick a date range";
    if (from && to && format(from, "yyyy-MM-dd") === format(to, "yyyy-MM-dd")) {
      return format(from, "PPP");
    }
    if (from && to) return `${format(from, "MMM d")} – ${format(to, "MMM d, y")}`;
    if (from) return `${format(from, "PPP")} – …`;
    return "Pick a date range";
  }, [startValue, endValue]);

  const handleSelect = useCallback(
    (selected: Date | DateRange | Date[] | undefined) => {
      if (disabled) return;
      if (selected && typeof selected === "object" && "from" in selected) {
        const r = selected as DateRange;
        if (r.from && r.to) {
          onRangeChange({
            start: toIsoDay(r.from),
            end: toIsoDay(r.to),
          });
          setOpen(false);
        } else if (r.from) {
          const day = toIsoDay(r.from);
          onRangeChange({ start: day, end: day });
        }
      }
    },
    [disabled, onRangeChange],
  );

  return (
    <Popover modal open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-10 w-full min-w-0 items-center rounded-sm border bg-transparent px-3 text-left text-sm outline-none ring-0 transition-colors",
            theme.patterns.inputBase,
            theme.uiChrome.border,
            theme.uiChrome.hover,
            disabled && "opacity-50 pointer-events-none",
            className,
          )}
        >
          <span
            className={cn(
              !parseDay(startValue) && !parseDay(endValue)
                ? "text-muted-foreground"
                : "text-foreground",
            )}
          >
            {summary}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("w-auto p-0 z-[60]", theme.patterns.floatingChrome)}
        align="start"
      >
        <div className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">
          {label}
        </div>
        <Calendar
          mode="range"
          selected={selectedRange}
          onSelect={handleSelect}
          numberOfMonths={1}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
