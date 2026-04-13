"use client";

import { useState } from "react";
import { TrendingUp, Table2, BarChart3, Type } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { BoardElement } from "@/lib/boards/board-definition";
import { cn } from "@/lib/utils";
import { theme } from "@/lib/theme";
import {
  InlineEditableName,
  LabelWithBlockControls,
  useBlockControls,
} from "@/app/components/tracker-display/layout";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { BoardBlockSettings } from "./BoardBlockSettings";
import type { BoardBindingsContext } from "./board-editor-bindings";

const TYPE_LABELS: Record<BoardElement["type"], string> = {
  stat: "Stat",
  table: "Table",
  chart: "Chart",
  text: "Text",
};

const TYPE_ICONS: Record<BoardElement["type"], LucideIcon> = {
  stat: TrendingUp,
  table: Table2,
  chart: BarChart3,
  text: Type,
};

function TypeBadge({ type }: { type: BoardElement["type"] }) {
  const Icon = TYPE_ICONS[type];
  const label = TYPE_LABELS[type];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium",
        "bg-muted/40 text-muted-foreground",
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

const BOARD_BAR_CLASS = cn(
  "flex w-full items-center gap-2 border-b px-2 py-1.5 text-sm",
  theme.uiChrome.border,
);

export interface BoardBlockHeaderProps {
  block: BoardElement;
  onUpdate: (updater: (el: BoardElement) => BoardElement) => void;
  /** When set, stat/table/chart blocks get data-source settings. */
  bindingContext?: BoardBindingsContext | null;
  /** View / preview: static title, no controls or settings. */
  readOnly?: boolean;
}

export function BoardBlockHeader({
  block,
  onUpdate,
  bindingContext = null,
  readOnly = false,
}: BoardBlockHeaderProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const controls = useBlockControls();
  const fallback = TYPE_LABELS[block.type];
  const displayTitle = block.title?.trim() || fallback;
  const showSettingsControl =
    block.type === "text" || Boolean(bindingContext);

  if (readOnly) {
    return (
      <div className={BOARD_BAR_CLASS}>
        <span className="min-w-0 truncate text-sm font-medium text-foreground">
          {displayTitle}
        </span>
        <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
          {fallback}
        </span>
      </div>
    );
  }

  const labelContent = (
    <span className="flex items-center gap-2">
      <TypeBadge type={block.type} />
      <InlineEditableName
        value={displayTitle}
        onChange={(name) => {
          const t = name.trim();
          onUpdate((el) => ({
            ...el,
            title: t === fallback ? undefined : t,
          }));
        }}
      />
    </span>
  );

  return (
    <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
      <PopoverAnchor asChild>
        <div className={BOARD_BAR_CLASS}>
          {controls ? (
            <LabelWithBlockControls
              isSortable={controls.isSortable}
              label={labelContent}
              onRemove={controls.onRemove}
              dragHandleProps={controls.dragHandleProps}
              onSettings={
                showSettingsControl ? () => setSettingsOpen(true) : undefined
              }
            />
          ) : (
            labelContent
          )}
        </div>
      </PopoverAnchor>

      <PopoverContent
        align="end"
        className={cn("w-96 p-0", theme.patterns.floatingChrome)}
        sideOffset={4}
      >
        <BoardBlockSettings
          block={block}
          onChange={onUpdate}
          bindings={bindingContext ?? undefined}
        />
      </PopoverContent>
    </Popover>
  );
}
