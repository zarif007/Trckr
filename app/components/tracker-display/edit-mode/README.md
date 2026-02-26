# Edit mode

Layout editing for the tracker: flat block list (sections/grids), undo, field-level controls, and the field settings dialog (validations, calculations, bindings, dynamic options).

## What it is

When the tracker is in **edit mode**, the UI allows adding/removing/reordering tabs, sections, grids, and fields; editing field types and rules; and undoing schema changes. The main entry is **EditModeProvider** (wraps the tracker content) and **BlockEditor** (renders the flat list of sections and grids for a tab). Grids use **useLayoutActions** and sortable header/row components for column/field reorder and settings.

## How it works

1. The **schema owner** (e.g. tracker page) holds `schema` and `onSchemaChange`. It wraps the display in **EditModeProvider** with `editMode`, `schema`, `onSchemaChange`, and optionally `undo` / `canUndo` from **useUndoableSchemaChange**.
2. **TrackerTabContent** (when in edit mode) renders **BlockEditor** for the current tab; **BlockEditor** uses **useSectionGridActions** and **useLayoutActions** to mutate schema (add/remove/reorder blocks and fields).
3. Table and div grids render **SortableColumnHeaderEdit** / **SortableFieldRowEdit** and open **FieldSettingsDialog** for field settings. The dialog composes **ExprRuleEditor** (expr/) and **DynamicOptionsBuilder** (dynamic-options/) for validations, calculations, and dynamic options.

## Folder map

| Folder | Purpose |
|--------|---------|
| **context.tsx**, **types.ts**, **utils.ts**, **ensureContainer.ts**, **useLayoutActions.ts**, **useSectionGridActions.ts** | Core: edit mode state, shared types, layout helpers, section/grid creation. |
| **undo/** | Undo stack (**useUndoableSchemaChange**), Undo button, Ctrl+Z shortcut. See [undo/README.md](undo/README.md). |
| **block-editor/** | Flat block list: BlockEditor, BlockWrapper, BlockCommandInput, SortableBlock, AddColumnOrFieldDialog, ColumnHeaderEdit, FieldRowEdit. See [block-editor/README.md](block-editor/README.md). |
| **expr/** | Expression rules UI: ExprRuleEditor, ExprFlowBuilder, expr-graph, expr-types (validation/calculation). See [expr/README.md](expr/README.md). |
| **dynamic-options/** | Dynamic options pipeline UI: DynamicOptionsBuilder, DynamicFunctionFlowBuilder, dynamic-function-graph. See [dynamic-options/README.md](dynamic-options/README.md). |
| **field-settings/** | Field settings dialog (Basic, Validations, Calculations, Bindings, Dynamic options). See [field-settings/README.md](field-settings/README.md). |

## Public API (index.ts)

Consumers should import from `edit-mode` (or `edit-mode/utils` for DIV_GRID_MAX_COLS etc.). The barrel re-exports:

- **Context**: EditModeProvider, useEditMode, useCanEditLayout, EditModeContextValue, EditModeProviderProps
- **Undo**: useUndoableSchemaChange, EditModeUndoButton, useUndoKeyboardShortcut, UseUndoableSchemaChangeOptions, UseUndoableSchemaChangeResult, EditModeUndoButtonProps
- **Block editor**: BlockEditor, useLayoutActions, useSectionGridActions, AddColumnOrFieldDialog, BlockCommandInput, BlockWrapper, ColumnHeaderEdit, FieldRowEdit, FieldSettingsDialog, SortableColumnHeaderEdit, SortableFieldRowEdit, fieldSortableId, parseFieldId
- **Layout**: getOrCreateSectionAndGridForField, EnsureContainerResult
- **Utils**: createNewFieldId, createNewField, getNextLayoutOrder, getSimpleFieldTypes, SIMPLE_FIELD_TYPES, createNewTabId, getNextTabPlaceId, createNewSectionId, createNewGridId, getNextSectionPlaceId, getNextGridPlaceId
- **Types**: FlatBlock, BlockEditorProps, AddColumnOrFieldResult, AddColumnOrFieldDialogProps, AddTargetVariant, ColumnHeaderEditProps, FieldRowEditProps, EditModeSchema, BlockVariant, BlockWrapperProps
- **Expr**: AvailableField (for generate-expr and similar consumers)
