import { cn } from "@/lib/utils";
import { theme } from "@/lib/theme";

/** Applied to marquee-selected tiles */
export const MARQUEE_SELECTED =
  "ring-2 ring-primary/30 ring-offset-2 ring-offset-background border-primary/40";

export function dashboardListRowClassName(selected: boolean): string {
  return cn(
    "flex items-center gap-3 px-3 py-2.5 rounded-sm border bg-background/50 hover:bg-muted/40 hover:cursor-pointer transition-all duration-150 group",
    "border",
    theme.uiChrome.border,
    theme.uiChrome.hover,
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    selected && MARQUEE_SELECTED,
  );
}

export const DASH_LIST_ICON_SHELL = cn(
  "w-11 h-11 rounded-sm bg-muted/45 border flex items-center justify-center flex-shrink-0 transition-colors",
  "border",
  theme.uiChrome.border,
  "group-hover:border-primary/35 group-hover:bg-primary/8",
);

export const DASH_LIST_ICON =
  "h-5 w-5 text-foreground/75 transition-colors group-hover:text-primary";

export const DASH_GRID_ICON_SHELL = cn(
  "relative w-12 h-12 shrink-0 rounded-sm bg-muted/45 border flex items-center justify-center transition-all duration-200",
  "border",
  theme.uiChrome.border,
  "group-hover:border-primary/35 group-hover:bg-primary/8",
);

export const DASH_GRID_ICON =
  "h-6 w-6 text-foreground/75 transition-all duration-200 group-hover:text-primary";
