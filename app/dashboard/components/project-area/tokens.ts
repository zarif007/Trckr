/** Shared layout + tile styling for /project/* and matching dashboard routes. */

export const projectAreaTileIconShell =
  "w-14 h-14 rounded-sm bg-muted/45 border border-border/40 flex items-center justify-center shrink-0 transition-all duration-200 group-hover:border-primary/35 group-hover:bg-primary/8 group-hover:";

export const projectAreaTileIcon =
  "h-7 w-7 text-foreground/75 transition-colors group-hover:text-primary";

export const projectAreaTileIconShellList = "border-primary/35 bg-primary/8";

export const projectAreaTileIconList = "text-primary/80";

export const projectAreaTileMotionButtonClass =
  "group flex w-full flex-col items-center gap-3 rounded-sm border border-border/40 bg-background/60 p-4 transition-[border-color,box-shadow,background-color] duration-150 hover:border-primary/35 hover:bg-primary/[0.06] hover:focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export const projectAreaTileCardClass =
  "relative flex min-w-0 w-full flex-col items-center gap-3 group/card";

export const projectAreaTileOverflowButtonClass =
  "absolute top-1 right-1 z-20 inline-flex h-6 w-6 items-center justify-center rounded-sm text-muted-foreground opacity-0 transition-all hover:bg-muted/80 hover:text-foreground group-hover/card:opacity-100";

export const projectAreaTileButtonMotion = {
  whileTap: { scale: 0.98 },
  transition: { type: "spring" as const, stiffness: 500, damping: 35 },
};

export const projectAreaMainClass =
  "flex min-h-0 min-w-0 flex-1 flex-col bg-background";

export const projectAreaToolbarClass =
  "flex h-10 shrink-0 items-center justify-between gap-3 border-b border-border/50 bg-background/80 px-3 backdrop-blur-sm";

export const projectAreaToolbarBreadcrumbSlotClass =
  "mr-2 flex min-w-0 flex-1 items-center gap-2";

export const projectAreaBreadcrumbNavClass =
  "flex min-w-0 flex-wrap items-center gap-1.5 rounded-sm border border-border/40 bg-muted/15 px-2 py-1 text-[11px] text-muted-foreground ";

export const projectAreaBreadcrumbLinkClass =
  "shrink-0 font-medium text-foreground/85 transition-colors hover:text-foreground";

/** In-nav links that inherit `text-muted-foreground` from the breadcrumb bar. */
export const projectAreaBreadcrumbTrailLinkClass =
  "shrink-0 transition-colors hover:text-foreground";

export const projectAreaBreadcrumbChevronClass = "h-3 w-3 shrink-0 opacity-45";

export const projectAreaBreadcrumbInputClass =
  "h-6 w-40 max-w-[min(50vw,12rem)] rounded-sm border-border/50 text-[11px] font-medium";

export const projectAreaBreadcrumbCrumbClass =
  "min-w-0 flex-1 cursor-default select-none truncate rounded-sm px-1 py-0.5 font-medium text-foreground hover:bg-muted/40";

export const projectAreaScrollClass = "flex-1 overflow-auto px-3 py-6 sm:px-4";

export const projectAreaItemGridClass =
  "grid w-full grid-cols-[repeat(auto-fill,minmax(5rem,1fr))] gap-4 content-start sm:gap-6";

export const projectAreaFooterClass =
  "flex h-6 shrink-0 items-center justify-between border-t border-border/50 bg-muted/20 px-3 text-[10px] text-muted-foreground";

export const projectAreaErrorToastClass =
  "fixed bottom-10 right-6 z-50 flex items-center gap-2 rounded-sm border border-destructive/20 bg-destructive/10 px-4 py-2.5 text-xs font-medium text-destructive ";

export const projectAreaErrorDismissClass =
  "rounded-sm p-0.5 hover:bg-destructive/20";

/** Simple config / shortcut tiles (project & module Configs pages). */
export const projectAreaConfigTileButtonClass =
  projectAreaTileMotionButtonClass;
