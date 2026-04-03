/**
 * Shared layout tokens for tracker display (edit and view mode).
 * Single source of truth for vertical gap and structure — use these everywhere
 * so edit and view stay pixel-identical.
 */

import { theme } from "@/lib/theme";

/** Gap between section groups (and before bottom row in edit). */
export const SECTION_STACK_GAP = "space-y-5";

/** Gap between section bar and the grids container. */
export const SECTION_TO_GRIDS_GAP = "mt-2";

/** Gap between grid blocks inside a section. */
export const GRID_STACK_GAP = "space-y-4";

/** Section group root: one section bar + its grids. Same in edit and view. */
export const SECTION_GROUP_ROOT = "w-full min-w-0 pt-5";

/** Grids container: gap from section bar + gap between grids. Flex wrap so multiple grids wrap. */
export const GRIDS_CONTAINER = "flex flex-wrap gap-3 mt-2 w-full min-w-0";

/** Wrapper for each grid block (edit SortableBlockItem content, view ViewBlockWrapper content). */
export const GRID_ITEM_WRAPPER = "w-full min-w-0";

/** Inner content of a grid block: header + GridBlockContent. */
export const GRID_BLOCK_INNER = "w-full min-w-0 space-y-1.5";

/** Tab content root: top margin only. Vertical stack lives on the inner wrapper. */
export const TAB_CONTENT_ROOT = "mt-4 w-full";

/** Inner wrapper that holds section list — vertical separation between sections. */
export const TAB_CONTENT_INNER = "space-y-4 w-full min-w-0";

/** Section bar: same class as edit mode BlockEditor section heading. */
export const SECTION_BAR_CLASS = `w-full flex items-center gap-2 pl-2.5 pr-3 py-2 rounded-sm border-l-[3px] border-l-info/60 bg-muted/25 border border-border/20 text-foreground text-sm font-semibold tracking-tight`;
