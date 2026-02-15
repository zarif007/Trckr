# Tracker Editor

Reusable pieces for **creating and updating** trackers: empty schema, editable state, and page layout. This folder keeps editor entry points (from-scratch, edit pages) consistent and modular.

## What lives here

| Export | Purpose |
|--------|--------|
| **`createEmptyTrackerSchema()`** / **`INITIAL_TRACKER_SCHEMA`** | Canonical “empty tracker” (one tab, no sections/grids/fields). Use for “create from scratch” or any flow that starts with a blank canvas. |
| **`useEditableTrackerSchema(initial)`** | Hook that holds `schema` and `onSchemaChange` for use with `TrackerDisplay` when `editMode` is on. |
| **`TrackerEditorPageLayout`** | Full-page shell: sticky header (title + optional slot) + constrained main. Use for from-scratch and any full-page editor route. |

## How it fits with edit-mode and pages

```
┌─────────────────────────────────────────────────────────────────┐
│  Pages / routes                                                  │
│  • from-scratch/page.tsx  → uses tracker-editor (schema + layout) │
│  • TrackerDialog          → uses TrackerDisplay + editMode        │
│  • (future edit page)     → can use same tracker-editor pieces   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  tracker-display/tracker-editor/                                 │
│  • Empty schema, useEditableTrackerSchema, TrackerEditorPageLayout│
│  • No UI for blocks — that’s in edit-mode                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  TrackerDisplay (TrackerDisplayInline)                           │
│  • When editMode=true: wraps content in EditModeProvider,        │
│    passes schema + onSchemaChange, renders BlockEditor per tab   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  tracker-display/edit-mode/                                      │
│  • BlockEditor, BlockCommandInput, ensureContainer, hooks, etc.  │
│  • Implements the actual block-level edit UI (sections, grids,  │
│    fields, add/remove/reorder)                                   │
└─────────────────────────────────────────────────────────────────┘
```

- **edit-mode**: *how* layout is edited (blocks, commands, dialogs). Used by `TrackerDisplay` when `editMode` is true; shared by from-scratch and TrackerDialog.
- **tracker-editor**: *entry-point* helpers for create/update flows — empty schema, state hook, page shell. Used by from-scratch (and any new editor page) so they don’t duplicate layout or initial state.

## How it works

1. **Empty schema**  
   `createEmptyTrackerSchema()` (or `INITIAL_TRACKER_SCHEMA`) gives a valid `TrackerDisplayProps` with one tab and empty sections/grids/fields. Use it as the initial state for “from scratch” flows.

2. **Editable state**  
   `useEditableTrackerSchema(initialSchema)` returns `{ schema, onSchemaChange }`. Pass `schema` and `onSchemaChange` into `TrackerDisplay` along with `editMode={true}`. The display will pass them into `EditModeProvider` and `BlockEditor`; all add/remove/reorder actions update schema through `onSchemaChange`.

3. **Page layout**  
   `TrackerEditorPageLayout` renders a sticky header and a main area with optional `headerSlot` and configurable `maxWidth`. Use it to wrap the `TrackerDisplay` on full-page editor routes so layout is consistent and easy to change in one place.

## Adding a new editor page

1. Import from `@/app/components/tracker-display/tracker-editor`:
   - `createEmptyTrackerSchema` or `INITIAL_TRACKER_SCHEMA` if starting from empty.
   - `useEditableTrackerSchema` for local schema state.
   - `TrackerEditorPageLayout` if it’s a full page (not a dialog).
2. Render `TrackerDisplay` with `editMode`, `schema`, and `onSchemaChange` from the hook.
3. No need to reimplement empty schema or page shell; edit-mode block UI is provided by `TrackerDisplay` when `editMode` is true.

## File layout

```
tracker-editor/
  index.ts                      # Public exports
  constants.ts                  # createEmptyTrackerSchema, INITIAL_TRACKER_SCHEMA
  useEditableTrackerSchema.ts   # Hook for schema + onSchemaChange
  TrackerEditorPageLayout.tsx   # Full-page editor shell
  README.md                     # This file
```
