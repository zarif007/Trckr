# Tracker Display

A modular React UI for rendering **tracker** definitions: config-driven tabs, sections, and grids with multiple view types (table, kanban, form), bindings, conditional rules (depends-on), and optional styling.

## What It Is

- **Tracker**: A schema + data model. It has **tabs** → **sections** → **grids** → **views**. Each grid holds rows of data; each view is a way to display that data (e.g. Table, Kanban, Form).
- **Tracker Display**: The component tree that turns that schema + `gridData` (and optional `bindings`, `dependsOn`, `styles`) into the actual UI.

Data flow is one-way: the parent supplies `gridData` and callbacks (`onUpdate`, `onAddEntry`, `onDeleteEntries`). The display never owns persistence; it just renders and invokes those callbacks.

## Architecture

```
TrackerDisplayInline (entry: tabs + state + callbacks)
  └── TrackerOptionsProvider (context: grids, fields, layoutNodes, sections)
  └── Tabs (per tab)
        └── TrackerTabContent (per tab content)
              └── TrackerSection (per section, collapsible)
                    └── GridViewContent (per grid view: table | kanban | div | …)
                          └── TrackerTableGrid | TrackerKanbanGrid | TrackerDivGrid | placeholder
```

- **TrackerDisplayInline**  
  Top-level component. Accepts `TrackerDisplayProps`: `tabs`, `sections`, `grids`, `fields`, `layoutNodes`, `bindings`, `styles`, `dependsOn`, `initialGridData`, `getDataRef`. Manages `localGridData` and merges with `initialGridData` / depends-on seed data. Renders tabs and delegates each tab’s content to `TrackerTabContent`.

- **TrackerOptionsProvider**  
  React context that provides `grids`, `fields`, `layoutNodes`, `sections` for option resolution (e.g. dynamic_select / all_field_paths). Grid components can use `useTrackerOptionsContext()` when a parent doesn’t pass `trackerContext` explicitly.

- **TrackerTabContent**  
  For one tab: filters sections by `tabId`, sorts by `placeId`, and renders a `TrackerSection` per section with that tab’s `gridData` and callbacks.

- **TrackerSection**  
  Collapsible section header and body. For each grid in the section it:
  - Gets layout nodes for that grid and normalizes **views** via `normalizeGridViews(grid)` (from `view-utils`).
  - If a single view: renders `GridViewContent` once.
  - If multiple views: renders a tab list (Table / Kanban / etc.) and one `GridViewContent` per view.

- **GridViewContent**  
  Single place that maps `view.type` to the right grid component:
  - `table` → `TrackerTableGrid`
  - `kanban` → `TrackerKanbanGrid`
  - `div` → `TrackerDivGrid`
  - `calendar` / `timeline` → placeholder (not implemented)

  So adding a new view type = add a branch here and implement the corresponding grid component.

- **Grid components**  
  - **TrackerTableGrid**: Uses `grids/data-table` (DataTable) with columns from layout + fields; inline add/edit/delete; bindings and depends-on.
  - **TrackerKanbanGrid**: DnD kanban columns; uses `grids/kanban` and `grids/data-table/entry-form-dialog`; `useKanbanGroups` for groups/cards/field metadata.
  - **TrackerDivGrid**: Form-style single-row layout; uses `grids/data-table` types and EntryFormDialog.

  Both main grids (table and kanban) live under **`grids/`** (data-table + kanban) so they stay colocated and modular.

Shared building blocks:

- **DependsOnTable**  
  Optional, standalone component for rendering depends-on rules in a table. Import from `@/app/components/tracker-display` when you need to display rules outside the main TrackerDisplay (e.g. in an admin or rules-editor view).

- **TrackerCell**  
  Renders a single value by type (text, number, date, options, multiselect, boolean, link, currency, percentage, etc.), with optional `options` for labels.

- **types**  
  Central types: `TrackerTab`, `TrackerSection`, `TrackerGrid`, `TrackerField`, `TrackerLayoutNode`, `GridType`, `TrackerBindings`, `StyleOverrides`, `DependsOnRules`, etc.

- **constants**  
  `VIEW_LABEL` / `getViewLabel` for default view names.

- **view-utils**  
  `normalizeGridViews(grid)` to turn `grid.views` or legacy `grid.type` into a list of `{ id, type, name, config }`.

- **grids/**  
  - **data-table/**: DataTable, EntryFormDialog, form-dialog, data-table-cell, data-table-input, utils (FieldMetadata, OptionsGridFieldDef). Used by table view and shared by kanban/div for add-entry and field metadata.
  - **kanban/**: `KanbanCard` / `SortableKanbanCard`, `DroppableEmptyColumn` / `ColumnDropZone`, `useKanbanGroups`. Kanban view implementation.

## Data and Callbacks

- **gridData**: `Record<gridId, Array<Record<fieldId, value>>>`. Each grid’s rows are an array of row objects.
- **onUpdate(gridId, rowIndex, columnId, value)**: Update one cell. Used for table/kanban/div; kanban also uses it when moving a card to another column (update of the group-by field).
- **onAddEntry(gridId, newRow)**: Append a row. Table and Kanban “Add Entry” dialogs call this.
- **onDeleteEntries(gridId, rowIndices)**: Remove rows. Table bulk delete uses this.

Bindings and depends-on are passed through from the top; grid components resolve options and overrides (e.g. `resolveFieldOptionsV2`, `resolveDependsOnOverrides`) using `gridData` and `trackerContext` where needed.

## How to Extend

1. **New view type (e.g. calendar)**  
   - Add the type to `GridType` in `types.ts`.  
   - Add a label in `constants.ts` (`VIEW_LABEL`).  
   - In `GridViewContent.tsx`, add a `case 'calendar':` that renders your new grid component (or a placeholder).  
   - Implement the grid component (e.g. `TrackerCalendarGrid`) that consumes the same props pattern: `grid`, `layoutNodes`, `fields`, `gridData`, `onUpdate`, etc.

2. **New field type in TrackerCell**  
   - Extend `TrackerFieldType` in `types.ts`.  
   - In `TrackerCell.tsx`, add a `case 'yourType':` and render the appropriate UI.

3. **New shared UI for a view**  
   - Add a module under `tracker-display/` (or a subfolder like `kanban/`).  
   - Export from that module and use it from the corresponding grid component (and from `index.tsx` if it should be part of the public API).

## File Layout

```
tracker-display/
  index.tsx                 # Public export: TrackerDisplay (TrackerDisplayInline)
  types.ts                  # Shared types
  constants.ts              # View labels
  view-utils.ts             # normalizeGridViews
  tracker-options-context.tsx
  TrackerDisplayInline.tsx   # Top-level tabs + state
  TrackerTabContent.tsx     # Per-tab sections
  TrackerSection.tsx        # Collapsible section + grid list
  GridViewContent.tsx       # view type → grid component
  TrackerTableGrid.tsx
  TrackerKanbanGrid.tsx
  TrackerDivGrid.tsx
  TrackerCell.tsx
  DependsOnTable.tsx        # Optional table for depends-on rules
  hooks/
    useGridDependsOn.ts     # Shared depends-on index/rules for grid components
  grids/
    README.md
    data-table/             # Table grid + shared utils/EntryFormDialog
    kanban/                 # Kanban grid
  README.md                 # This file
```

## Where the main grids live

Table and kanban are the two main grid views. They live together under **`grids/`** (data-table + kanban) so both implementations are in one place and share types/dialogs (e.g. `FieldMetadata`, `EntryFormDialog`). See `grids/README.md`.

## Dependencies

- **@dnd-kit** (core, sortable, utilities): used by `TrackerKanbanGrid` for drag-and-drop.
- **@tanstack/react-table** + **DataTable** (and entry-form-dialog) from `./grids/data-table`: used by `TrackerTableGrid` and shared by kanban/div.
- **lib/binding**, **lib/resolve-bindings**, **lib/depends-on**, **lib/depends-on-options**, **lib/style-utils**: option resolution, bindings, conditional rules, and style overrides.
