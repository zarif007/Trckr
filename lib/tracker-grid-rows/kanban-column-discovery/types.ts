/**
 * Types for deriving Kanban **column headers** (lane ids + labels) from multiple
 * sources: resolved field options, local row snapshots, and server distinct values.
 *
 * @see README.md in this folder for the data-flow contract.
 */

/** One Kanban column: `id` matches `row.data[fieldId]` text and row-API `groupValue`. */
export type KanbanGroupColumnDescriptor = {
  id: string;
  label: string;
};

/** Minimal option shape from `resolveFieldOptionsV2` (id/value/label). */
export type ResolvedOptionLike = {
  id?: string;
  value?: unknown;
  label?: string;
};
