# Tracker grids

Both **main grid implementations** for the tracker display live here: **table** and **kanban**. They share the same data model (tracker schema + gridData) and are selected by view type in `GridViewContent`.

## Layout

| Folder | Role |
|--------|------|
| **data-table/** | Table grid: columns, rows, sorting, pagination, inline edit, add/delete. Used by `TrackerTableGrid`. Exposes `DataTable`, `EntryFormDialog`, and shared types/utils (`FieldMetadata`, `OptionsGridFieldDef`) used by table, kanban, and div grids. |
| **kanban/** | Kanban grid: group-by columns, drag-and-drop cards. Used by `TrackerKanbanGrid`. Uses `useKanbanGroups` and shared field metadata from data-table. |

## Why they’re together

- They are the two primary grid **views** for tracker data (table and kanban).
- They share concepts (field metadata, entry form dialog, types) and are only used by tracker-display, so keeping them in one place keeps the feature clear and modular.

## Imports

- **TrackerTableGrid** → `./grids/data-table`, `./grids/data-table/utils`
- **TrackerKanbanGrid** → `./grids/data-table/entry-form-dialog`, `./grids/kanban`
- **TrackerDivGrid** → `./grids/data-table/utils`, `./grids/data-table/entry-form-dialog`
