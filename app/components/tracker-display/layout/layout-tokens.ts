/**
 * Shared layout tokens for tracker display (edit and view mode).
 * Single source of truth for vertical gap and structure — use these everywhere
 * so edit and view stay pixel-identical.
 */

/** Gap between section groups (and before bottom row in edit). */
export const SECTION_STACK_GAP = 'space-y-6'

/** Gap between section bar and the grids container. */
export const SECTION_TO_GRIDS_GAP = 'mt-3'

/** Gap between grid blocks inside a section. */
export const GRID_STACK_GAP = 'space-y-6'

/** Section group root: one section bar + its grids. Same in edit and view. */
export const SECTION_GROUP_ROOT = 'w-full min-w-0'

/** Grids container: gap from section bar (mt-3) + gap between grids (space-y-6). Reuse everywhere. */
export const GRIDS_CONTAINER =
  'space-y-6 mt-3 w-full min-w-0'

/** Wrapper for each grid block (edit SortableBlockItem content, view ViewBlockWrapper content). */
export const GRID_ITEM_WRAPPER = 'w-full min-w-0'

/** Inner content of a grid block: header + GridBlockContent. */
export const GRID_BLOCK_INNER = 'w-full min-w-0 space-y-2.5'

/** Tab content root: top margin only. Vertical stack (space-y-6) lives on the inner wrapper. */
export const TAB_CONTENT_ROOT = 'mt-5 w-full'

/** Inner wrapper that holds section list — applies space-y-6 so vertical gap is identical in edit and view. */
export const TAB_CONTENT_INNER = 'space-y-6 w-full min-w-0'

/** Section bar: same class as edit mode BlockEditor section heading. */
export const SECTION_BAR_CLASS =
  'w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-muted/50 border border-border/40 text-foreground text-sm font-medium'
