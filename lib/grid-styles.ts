/**
 * Reusable grid styling system for all tracker grid views.
 * Provides consistent border chrome, surfaces, and spacing across
 * table, kanban, calendar, timeline, and div/form views.
 *
 * All grid chrome should match `Button variant="outline"` and
 * `theme.patterns.inputBase` visual language.
 */

import { cn } from "@/lib/utils";
import { theme } from "@/lib/theme";

/**
 * Grid container styles - floating chrome for grid shells.
 * Use for: grid wrapper, calendar container, timeline container.
 */
export const gridContainer = cn(
  "w-full min-w-0",
  theme.uiChrome.floating,
  theme.radius.md
);

/**
 * Grid header/toolbar styles.
 * Use for: grid title bar, toolbar with buttons, view switcher area.
 */
export const gridHeader = cn(
  "flex items-center justify-between px-3 py-2",
  "border-b",
  theme.uiChrome.border,
  "bg-muted/30"
);

/**
 * Grid content area styles.
 * Use for: scrollable data area, calendar body, timeline canvas.
 */
export const gridContent = cn(
  "flex-1 overflow-auto",
  "p-0"
);

/**
 * Grid cell base styles.
 * Use for: table cells, calendar day cells, kanban card containers.
 */
export const gridCell = cn(
  "p-2",
  "border-b border-r",
  theme.uiChrome.border
);

/**
 * Grid row styles.
 * Use for: table rows, calendar week rows.
 */
export const gridRow = cn(
  "flex",
  "border-b",
  theme.uiChrome.border,
  "last:border-b-0"
);

/**
 * Grid item/card styles.
 * Use for: kanban cards, calendar events, timeline bars.
 */
export const gridItem = cn(
  "rounded-sm p-2",
  "bg-background",
  "border",
  theme.uiChrome.border,
  "hover:border-ring",
  "transition-colors"
);

/**
 * Grid toolbar button styles.
 * Use for: view switchers, add buttons, settings in grid headers.
 */
export const gridToolbarButton = cn(
  "h-8 px-2 text-sm",
  "inline-flex items-center gap-1.5",
  "rounded-sm border",
  theme.uiChrome.border,
  "bg-background hover:bg-muted/50",
  "focus:outline-none focus:ring-1 focus:ring-ring"
);

/**
 * Grid empty state styles.
 * Use for: no data messages, empty columns.
 */
export const gridEmptyState = cn(
  "flex flex-col items-center justify-center",
  "p-8 text-center",
  "text-muted-foreground"
);

/**
 * Grid loading state styles.
 */
export const gridLoadingState = cn(
  "flex items-center justify-center",
  "p-8",
  "text-muted-foreground"
);

/**
 * Grid input/cell editor base styles.
 * Use for: inline cell editing, quick add forms.
 */
export const gridInputBase = cn(
  theme.patterns.inputBase,
  "w-full min-w-0"
);

/**
 * Grid column header styles.
 * Use for: table column headers, kanban column headers, calendar day headers.
 */
export const gridColumnHeader = cn(
  "px-3 py-2 text-sm font-medium",
  "bg-muted/50",
  "border-b border-r",
  theme.uiChrome.border,
  "text-foreground"
);

/**
 * Grid column header with actions (sort, menu).
 */
export const gridColumnHeaderInteractive = cn(
  gridColumnHeader,
  "flex items-center justify-between gap-2",
  "cursor-pointer hover:bg-muted/70",
  "select-none"
);

/**
 * View switcher tab styles.
 * Use for: view type tabs in grid headers (Table | Kanban | Calendar).
 */
export const viewSwitcherTab = cn(
  "px-3 py-1.5 text-sm",
  "rounded-sm",
  "border border-transparent",
  "text-muted-foreground hover:text-foreground hover:bg-muted/50",
  "data-[active=true]:bg-background data-[active=true]:text-foreground",
  "data-[active=true]:border",
  theme.uiChrome.tabActive
);

/**
 * Grid chrome patterns - for floating panels, popovers, menus within grids.
 */
export const gridFloatingPanel = cn(
  "rounded-sm border",
  theme.uiChrome.floating,
  "bg-background shadow-none",
  "p-3"
);

/**
 * Grid badge/pill styles.
 * Use for: view type badges, status pills, count badges.
 */
export const gridBadge = (variant: "default" | "info" | "warning" | "success" = "default") => {
  const variantClasses = {
    default: "bg-muted/50 text-muted-foreground border-muted",
    info: "bg-info/10 text-info border-info/20",
    warning: "bg-warning/10 text-warning border-warning/20",
    success: "bg-success/10 text-success border-success/20",
  };
  return cn(
    "inline-flex items-center gap-1",
    "text-[11px] font-medium",
    "px-1.5 py-0.5 rounded-sm",
    "border",
    variantClasses[variant]
  );
};

/**
 * Grid spacing tokens.
 */
export const gridSpacing = {
  gap: "gap-2",
  gapLarge: "gap-4",
  padding: "p-3",
  paddingLarge: "p-4",
} as const;
