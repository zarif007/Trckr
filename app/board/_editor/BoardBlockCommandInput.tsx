"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { TrendingUp, Table2, BarChart3, Type, Plus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Command,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface CommandItem {
  id: string;
  label: string;
  description: string;
  keywords: string[];
  icon: LucideIcon;
  onSelect: () => void;
}

export interface BoardBlockCommandInputProps {
  onAddStat?: () => void;
  onAddTable?: () => void;
  onAddChart?: () => void;
  onAddText: () => void;
  placeholder?: string;
}

export function BoardBlockCommandInput({
  onAddStat,
  onAddTable,
  onAddChart,
  onAddText,
  placeholder = "Add block...",
}: BoardBlockCommandInputProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const triggerRef = useRef<HTMLDivElement>(null);

  const commands = useMemo(() => {
    const items: CommandItem[] = [];

    if (onAddStat) {
      items.push({
        id: "stat",
        label: "Stat Card",
        description: "Single metric (count/sum/avg)",
        keywords: ["stat", "metric", "kpi", "count", "sum", "average"],
        icon: TrendingUp,
        onSelect: onAddStat,
      });
    }

    if (onAddTable) {
      items.push({
        id: "table",
        label: "Table",
        description: "Data table with rows and columns",
        keywords: ["table", "data", "rows", "columns", "list"],
        icon: Table2,
        onSelect: onAddTable,
      });
    }

    if (onAddChart) {
      items.push({
        id: "chart",
        label: "Chart",
        description: "Bar or line chart visualization",
        keywords: ["chart", "bar", "line", "graph", "visualization"],
        icon: BarChart3,
        onSelect: onAddChart,
      });
    }

    items.push({
      id: "text",
      label: "Text",
      description: "Rich text block for notes",
      keywords: ["text", "note", "markdown", "description", "label"],
      icon: Type,
      onSelect: onAddText,
    });

    return items;
  }, [onAddStat, onAddTable, onAddChart, onAddText]);

  const filteredCommands = useMemo(() => {
    const s = searchValue.trim().toLowerCase();
    if (!s) return commands;
    return commands.filter((item) => {
      const text = `${item.label} ${item.description} ${item.keywords.join(" ")}`.toLowerCase();
      return text.includes(s);
    });
  }, [commands, searchValue]);

  const handleSelect = useCallback(
    (item: CommandItem) => {
      item.onSelect();
      setOpen(false);
      setSearchValue("");
    },
    [],
  );

  return (
    <div className="w-full min-h-8">
      <Popover
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) setSearchValue("");
        }}
      >
        <PopoverAnchor asChild>
          <div
            ref={triggerRef}
            className={cn(
              "flex items-center gap-2 w-full min-h-8 px-3 py-2 rounded-sm text-sm transition-colors",
              "text-muted-foreground/70 hover:text-muted-foreground hover:bg-muted/40",
              "focus-within:text-foreground focus-within:bg-muted/30",
              open && "text-foreground bg-muted/30",
            )}
            aria-expanded={open}
          >
            <Plus className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
            <input
              value={searchValue}
              onFocus={() => setOpen(true)}
              onChange={(e) => {
                setOpen(true);
                setSearchValue(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setOpen(false);
                  setSearchValue("");
                }
                if (e.key === "Enter") e.preventDefault();
              }}
              placeholder={open ? "Type to search..." : placeholder}
              className="min-w-0 flex-1 bg-transparent outline-none ring-0 placeholder:text-muted-foreground/60 text-[inherit] leading-inherit"
            />
          </div>
        </PopoverAnchor>
        <PopoverContent
          align="start"
          className="w-64 p-0"
          sideOffset={4}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => {
            if (triggerRef.current?.contains(e.target as Node))
              e.preventDefault();
          }}
          onInteractOutside={(e) => {
            if (triggerRef.current?.contains(e.target as Node))
              e.preventDefault();
          }}
        >
          <Command shouldFilter={false} className="rounded-sm border-0">
            <CommandList className="max-h-[240px]">
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup>
                {filteredCommands.map((item) => {
                  const Icon = item.icon;
                  return (
                    <CommandItem
                      key={item.id}
                      value={item.id}
                      onSelect={() => handleSelect(item)}
                      className="gap-2.5 px-2 py-1.5 cursor-pointer"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-muted/70 shrink-0">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex flex-col gap-0 min-w-0">
                        <span className="text-sm font-medium leading-tight">
                          {item.label}
                        </span>
                        <span className="text-[11px] text-muted-foreground leading-tight truncate">
                          {item.description}
                        </span>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

