# Block editor

Flat Notion-like block editor for a single tracker tab. Renders sections and grids as a vertical list of blocks with drag-and-drop reorder, inline rename, and an "add block" command (section, table, kanban, form, field).

## What it is

- **BlockEditor**: Top-level component that renders the flat list of sections and grids for one tab. Uses `useSectionGridActions` and `useLayoutActions` to mutate schema (add/remove/reorder). Uses `@dnd-kit` for sortable sections and grids.
- **BlockCommandInput**: Slash-style "Add block..." input; shows Section, Table, Kanban, Form, Field. Used at the bottom of the list and inline when the user clicks + on a block.
- **AddColumnOrFieldDialog**: Dialog to add a new column (table) or field (div): create new or pick existing field. Opened from BlockEditor when user chooses "Field" from the command input.
- **BlockWrapper**: Wraps a section/grid/field block and provides `BlockControlsContext` so layout components (SectionBar, GridBlockHeader, field labels) can show inline controls (drag, add, delete).
- **ColumnHeaderEdit / FieldRowEdit**: Edit controls for a table column header or div grid field row (drag, settings, remove). Used inside grids when in edit mode.
- **SortableBlock**: `SortableColumnHeaderEdit` and `SortableFieldRowEdit` wrap the above with `@dnd-kit/sortable` for reordering columns/fields within a grid. Also exports `fieldSortableId` and `parseFieldId` for DnD IDs.

## How it works

1. **TrackerTabContent** (when in edit mode) renders `BlockEditor` with the current tab’s sections, grids, fields, and layout. `BlockEditor` gets `schema` and `onSchemaChange` from `useEditMode()`.
2. Sections and grids are built into a flat list `FlatBlock[]`; each block is wrapped in a sortable item that uses `BlockWrapper` and triggers `onSchemaChange` on drag end or remove.
3. "Add block" is either the always-visible row at the bottom or an inline row that appears when the user clicks + on a section/grid. Both use `BlockCommandInput` with callbacks that create sections/grids (creating a section when needed) or open `AddColumnOrFieldDialog` for adding a field.
4. Table and div grids use `SortableColumnHeaderEdit` and `SortableFieldRowEdit` from this module (exported via edit-mode barrel) so TrackerTableGrid and TrackerDivGrid can render sortable headers/rows without depending on block-editor internals.

## Files

| File | Role |
|------|------|
| BlockEditor.tsx | Main component: flat block list, DnD, command input, add-field dialog |
| BlockWrapper.tsx | Block shell + BlockControlsContext for inline controls |
| BlockCommandInput.tsx | "Add block" popover with Section/Table/Kanban/Form/Field |
| SortableBlock.tsx | SortableColumnHeaderEdit, SortableFieldRowEdit, fieldSortableId, parseFieldId |
| ColumnHeaderEdit.tsx | Table column header edit UI (drag, settings, remove) |
| FieldRowEdit.tsx | Div grid field row edit UI (drag, settings, remove) |
| AddColumnOrFieldDialog.tsx | Dialog to add column/field (new or existing) |
| index.ts | Barrel exports |

## Usage

- **BlockEditor** is used by `TrackerTabContent` when `useCanEditLayout()` is true.
- **SortableColumnHeaderEdit**, **SortableFieldRowEdit**, **fieldSortableId**, **parseFieldId**, **AddColumnOrFieldDialog**, **ColumnHeaderEdit**, **FieldRowEdit**, **BlockWrapper** are used by `TrackerTableGrid` and `TrackerDivGrid`; consumed via the parent edit-mode barrel (`../edit-mode`).
