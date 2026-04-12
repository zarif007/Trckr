"use client";

import { cn } from "@/lib/utils";
import { theme } from "@/lib/theme";

function PulseBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-sm bg-muted/60", className)}
      aria-hidden
    />
  );
}

/** Kanban-style columns while board / column pages load. */
export function KanbanBoardSkeleton({
  columnCount = 4,
  className,
}: {
  columnCount?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("flex gap-4 overflow-x-auto pb-2", className)}
      role="status"
      aria-busy="true"
      aria-label="Loading board"
    >
      {Array.from({ length: columnCount }, (_, i) => (
        <div key={i} className="shrink-0 w-[320px] space-y-3">
          <div
            className={cn(
              "border px-4 py-3 space-y-2",
              theme.radius.md,
              theme.uiChrome.border,
              "bg-muted/20",
            )}
          >
            <PulseBlock className="h-4 w-2/3 max-w-[180px]" />
            <PulseBlock className="h-3 w-8" />
          </div>
          <div className="space-y-3 min-h-[120px]">
            <PulseBlock className="h-[72px] w-full" />
            <PulseBlock className="h-[72px] w-full" />
            <PulseBlock className="h-[56px] w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Placeholder cards inside a single kanban column. */
export function KanbanColumnCardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3 px-0.5" role="status" aria-busy="true" aria-label="Loading cards">
      {Array.from({ length: count }, (_, i) => (
        <PulseBlock key={i} className="h-[72px] w-full" />
      ))}
    </div>
  );
}

/** Month-style grid while calendar rows load. */
export function CalendarGridSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("p-3 md:p-4 space-y-3", className)}
      role="status"
      aria-busy="true"
      aria-label="Loading calendar"
    >
      <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2">
        {Array.from({ length: 7 }, (_, i) => (
          <PulseBlock key={i} className="h-6 w-full" />
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 md:gap-2 auto-rows-fr">
        {Array.from({ length: 35 }, (_, i) => (
          <div
            key={i}
            className={cn(
              "min-h-[64px] md:min-h-[72px] border p-1.5 space-y-1.5",
              theme.radius.md,
              theme.uiChrome.border,
              "bg-muted/10",
            )}
          >
            <PulseBlock className="h-3 w-5" />
            <PulseBlock className="h-3 w-full max-w-[80%]" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Timeline / swimlane strip while rows load. */
export function TimelineGridSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("w-full min-h-[280px] md:min-h-[360px] p-3 space-y-3", className)}
      role="status"
      aria-busy="true"
      aria-label="Loading timeline"
    >
      <PulseBlock className="h-8 w-full max-w-md" />
      <div className="space-y-2 pt-2">
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            className={cn(
              "flex items-center gap-3 border px-3 py-2.5",
              theme.radius.md,
              theme.uiChrome.border,
              "bg-muted/10",
            )}
          >
            <PulseBlock className="h-4 w-24 shrink-0" />
            <PulseBlock className="h-6 flex-1 max-w-[70%]" />
          </div>
        ))}
      </div>
    </div>
  );
}
