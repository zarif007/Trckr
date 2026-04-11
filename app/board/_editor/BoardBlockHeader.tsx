"use client";

import { useState } from "react";
import { LayoutList, TrendingUp, Table2, BarChart3, Type } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { BoardElement } from "@/lib/boards/board-definition";
import { cn } from "@/lib/utils";
import { theme } from "@/lib/theme";
import { SECTION_BAR_CLASS } from "@/app/components/tracker-display/layout";
import {
  InlineEditableName,
  LabelWithBlockControls,
} from "@/app/components/tracker-display/layout";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { BoardBlockSettings } from "./BoardBlockSettings";

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
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium",
        "bg-muted/60 text-muted-foreground",
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

export interface BoardBlockHeaderProps {
  block: BoardElement;
  onUpdate: (updater: (el: BoardElement) => BoardElement) => void;
  onRemove: () => void;
}

export function BoardBlockHeader({
  block,
  onUpdate,
  onRemove,
}: BoardBlockHeaderProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const fallback = TYPE_LABELS[block.type];
  const displayTitle = block.title?.trim() || fallback;

  return (
    <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
      <PopoverAnchor asChild>
        <div className={SECTION_BAR_CLASS}>
          <LayoutList
            className="h-4 w-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <LabelWithBlockControls
            isSortable={true}
            label={
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
            }
            onRemove={onRemove}
            onSettings={() => setSettingsOpen(true)}
          />
        </div>
      </PopoverAnchor>

      <PopoverContent
        align="end"
        className={cn("w-96", theme.patterns.floatingChrome)}
        sideOffset={4}
      >
        <BoardBlockSettings
          block={block}
          onChange={onUpdate}
          onClose={() => setSettingsOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}
