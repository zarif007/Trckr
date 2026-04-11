# Data Table (shared UI)

Generic **table component** with columns, sorting, pagination, row selection, inline editing, add/delete, and optional layout controls. Used by **tracker-display** for the “table” view and by add-entry/entry-form dialogs.

## What it is

- **Primitive**: Presentation + table behavior (TanStack Table). No knowledge of “tracker” or “grid”.
- **Consumers**: `TrackerTableGrid`, `TrackerKanbanGrid`, and `TrackerDivGrid` (via `EntryFormDialog` and shared `FieldMetadata` / `OptionsGridFieldDef` from `utils.ts`).

## Why it lives next to other tracker grids

- **data-table** = reusable building block (TanStack table + shared entry dialog inputs).
- **kanban** and other views live under `app/components/tracker-display/grids/` (e.g. `grids/kanban/`). The same row model can be shown as table, kanban, calendar, or timeline; view code stays in this feature tree.

## Files

| File                    | Role                                                                   |
| ----------------------- | ---------------------------------------------------------------------- |
| `data-table.tsx`        | Main table UI, column visibility, add/delete, dialogs                  |
| `data-table-cell.tsx`   | Cell renderer + inline edit by field type                              |
| `data-table-input.tsx`  | Inputs for form/cell (string, number, date, select, multiselect, etc.) |
| `entry-form-dialog.tsx` | “Add entry” dialog (used by table and kanban)                          |
| `form-dialog.tsx`       | Generic form dialog wrapper                                            |
| `utils.ts`              | `FieldMetadata`, `OptionsGridFieldDef`, validation, field icons        |
| `index.ts`              | Re-exports                                                             |

## Dependencies

- `@tanstack/react-table`
- `@/components/ui` (table, dialog, button, checkbox, input, select, etc.)
- `StyleOverrides` from tracker-display types (optional styling); consider moving to a shared types file if we want data-table to be fully app-agnostic.
