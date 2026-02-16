# Tracker grids

All **grid implementations** for the tracker display live here: **table**, **kanban**, and **div** (form). They share the same data model (tracker schema + gridData) and are selected by view type in `GridViewContent`.

## Layout

| Folder | Role |
|--------|------|
| **data-table/** | Table grid: columns, rows, sorting, pagination, inline edit, add/delete. Used by `TrackerTableGrid`. Exposes `DataTable`, `EntryFormDialog`, and shared types/utils (`FieldMetadata`, `OptionsGridFieldDef`) used by table, kanban, and div grids. |
| **kanban/** | Kanban grid: group-by columns, drag-and-drop cards. Used by `TrackerKanbanGrid`. Uses `useKanbanGroups` and shared field metadata from data-table. |
| **div/** | Form (div) grid: single-row form layout, one field per row. Used by `TrackerDivGrid`. Uses `@/components/ui` (Input, Textarea, Checkbox, Calendar, Popover, SearchableSelect, MultiSelect) and `./data-table/entry-form-dialog` for Add option. |

## Why they're together

- Table, kanban, and form are the primary grid **views** for tracker data.
- They share concepts (field metadata, entry form dialog, types) and are only used by tracker-display, so keeping them in one place keeps the feature clear and modular.

## Imports

- **TrackerTableGrid** → `./grids/data-table`, `./grids/data-table/utils`
- **TrackerKanbanGrid** → `./grids/data-table/entry-form-dialog`, `./grids/kanban`
- **TrackerDivGrid** → `./grids/div` (lives here); uses `./grids/data-table/utils`, `./grids/data-table/entry-form-dialog`
