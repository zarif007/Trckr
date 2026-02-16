# Tracker Display

A **modular, reusable** React UI for rendering **tracker** definitions: config-driven tabs, sections, and grids with multiple view types (table, kanban, form), bindings, conditional rules (depends-on), and optional styling.

---

## What It Is

- **Tracker**: A schema + data model. It has **tabs** → **sections** → **grids** → **views**. Each grid holds rows of data; each view is a way to display that data (e.g. Table, Kanban, Form).
- **Tracker Display**: The component tree that turns that schema + `gridData` (and optional `bindings`, `dependsOn`, `styles`) into the actual UI.

Data flow is one-way: the parent supplies `gridData` and callbacks (`onUpdate`, `onAddEntry`, `onDeleteEntries`). The display never owns persistence; it just renders and invokes those callbacks.

---

## Module Structure (Reusable & Scalable)

The codebase is split into **reusable folders** so you can import layout, blocks, or sections independently and extend without touching unrelated code.

```
tracker-display/
├── README.md                    # This file (tech doc)
├── index.tsx                    # Public API: TrackerDisplay, DependsOnTable, types
├── types.ts                     # Shared types (TrackerTab, TrackerGrid, etc.)
├── constants.ts                 # View labels
├── view-utils.ts                # normalizeGridViews
├── tracker-options-context.tsx  # Context for grids/fields/layoutNodes/sections
│
├── layout/                      # Layout primitives (reusable)
│   ├── index.ts
│   ├── layout-tokens.ts         # Spacing & section bar class (single source of truth)
│   ├── SectionBar.tsx           # Section header bar (edit + view)
│   ├── ViewBlockWrapper.tsx     # Block shell for view mode (aligns with edit)
│   └── InlineEditableName.tsx   # Click-to-edit name (section/grid)
│
├── blocks/                      # Block-level UI (reusable)
│   ├── index.ts
│   ├── GridBlockHeader.tsx      # Grid type badge + name (editable or static)
│   └── GridBlockContent.tsx     # Single grid: views resolution + GridViewContent
│
├── sections/                    # Section & tab composition
│   ├── index.ts
│   ├── TrackerSection.tsx       # One section: bar + list of grids (collapsible)
│   └── TrackerTabContent.tsx    # One tab: edit vs view, section list
│
├── TrackerDisplayInline.tsx     # Top-level: tabs + state + TrackerTabContent
├── GridViewContent.tsx          # view.type → TrackerTableGrid | Kanban | Div
├── TrackerTableGrid.tsx
├── TrackerKanbanGrid.tsx
├── TrackerCell.tsx
├── DependsOnTable.tsx
│
├── edit-mode/                   # Edit layout (drag, rename, add block)
│   ├── index.ts
│   ├── BlockEditor.tsx          # Flat block list (sections + grids)
│   ├── BlockWrapper.tsx         # Gutter + drag/delete (edit only)
│   ├── context.tsx             # EditModeProvider, useCanEditLayout
│   └── ...
│
├── tracker-editor/              # Page layout & schema (from-scratch)
│   ├── TrackerEditorPageLayout.tsx
│   ├── useEditableTrackerSchema.ts
│   └── ...
│
├── grids/                       # Grid implementations
│   ├── data-table/
│   ├── kanban/
│   └── div/                     # Form grid (TrackerDivGrid)
│
└── hooks/
    └── useGridDependsOn.ts
```

---

## How It Works

### 1. Layout (`layout/`)

**Purpose:** Single source of truth for spacing and section/grid chrome so **edit** and **view** mode look the same.

- **layout-tokens.ts**  
  Exports Tailwind class strings: `SECTION_STACK_GAP`, `SECTION_TO_GRIDS_GAP`, `GRIDS_CONTAINER`, `SECTION_GROUP_ROOT`, `GRID_BLOCK_INNER`, `TAB_CONTENT_ROOT`, `TAB_CONTENT_INNER`, `SECTION_BAR_CLASS`. Use these in both BlockEditor and TrackerSection so vertical gap and bar style stay identical.

- **SectionBar**  
  Renders the section header bar (icon + name, optional collapse). Edit mode passes `children` (e.g. `InlineEditableName`); view mode passes `name` + `onCollapseToggle`.

- **ViewBlockWrapper**  
  Wraps section bar or grid block in view mode with the same structure as edit `BlockWrapper` (gutter spacer + content area) so alignment is pixel-identical. No drag/delete UI.

- **InlineEditableName**  
  Click to edit, Enter/blur to save. Used for section and grid names in edit mode.

**Reuse:** Import from `@/app/components/tracker-display/layout` when building custom section/grid UIs that should match tracker spacing and bar style.

---

### 2. Blocks (`blocks/`)

**Purpose:** Grid-level header and content shared by **sections** (view) and **BlockEditor** (edit).

- **GridBlockHeader**  
  Shows grid type badge (Table/Kanban/Form) + name. Supports `editable` + `onNameChange` for edit mode.

- **GridBlockContent**  
  Takes one `TrackerGrid`, resolves views via `normalizeGridViews`, and renders either a single `GridViewContent` or a tab list of views. Handles `hideLabel` when the name is already shown by `GridBlockHeader`.

**Reuse:** Use `GridBlockHeader` + `GridBlockContent` whenever you render a “grid block” (same look in view and edit). Add new view types in `GridViewContent` (root); blocks stay unchanged.

---

### 3. Sections (`sections/`)

**Purpose:** Compose layout + blocks into **one section** and **one tab’s content**.

- **TrackerSection**  
  Renders one section: `ViewBlockWrapper` + `SectionBar` (with collapse), then a `GRIDS_CONTAINER` div of grid blocks. Each grid is `ViewBlockWrapper` + `GridBlockHeader` + `GridBlockContent` (hideLabel). Uses layout tokens so vertical gap matches edit.

- **TrackerTabContent**  
  For one tab: if edit layout, renders `BlockEditor`; otherwise renders a wrapper with `TAB_CONTENT_INNER` (space-y-6) and a list of section groups. Each group is a div with `SECTION_GROUP_ROOT` containing `TrackerSection`. Uses `TAB_CONTENT_ROOT` for the `TabsContent` class.

**Reuse:** Use `TrackerTabContent` when you have tabs and want per-tab section list + edit mode. Use `TrackerSection` when you need a single section (e.g. embedded in another flow).

---

### 4. Data Flow

- **gridData**: `Record<gridId, Array<Record<fieldId, value>>>`. Each grid’s rows are an array of row objects.
- **onUpdate(gridId, rowIndex, columnId, value)**: Update one cell.
- **onAddEntry(gridId, newRow)**: Append a row.
- **onDeleteEntries(gridId, rowIndices)**: Remove rows.

Bindings and depends-on are passed from the top; grid components resolve options and overrides using `gridData` and `trackerContext` where needed.

---

## Architecture (Component Tree)

```
TrackerDisplayInline (entry: tabs + state + callbacks)
  └── TrackerOptionsProvider (context: grids, fields, layoutNodes, sections)
  └── EditModeProvider (when editMode: schema + onSchemaChange)
  └── Tabs (per tab)
        └── TrackerTabContent (sections/)
              ├── Edit: BlockEditor (edit-mode/) → SectionBar, GridBlockHeader, GridBlockContent (layout/, blocks/)
              └── View: section list (SECTION_GROUP_ROOT) → TrackerSection (sections/)
                    └── ViewBlockWrapper + SectionBar (layout/)
                    └── GRIDS_CONTAINER → ViewBlockWrapper + GridBlockHeader + GridBlockContent (layout/, blocks/)
                          └── GridViewContent → TrackerTableGrid | TrackerKanbanGrid | TrackerDivGrid (from grids/div)
```

---

## How to Extend

1. **New view type (e.g. calendar)**  
   - Add the type to `GridType` in `types.ts`.  
   - Add a label in `constants.ts` (`VIEW_LABEL`).  
   - In `GridViewContent.tsx`, add a branch that renders your grid component.  
   - Implement the grid component (e.g. `TrackerCalendarGrid`) with the same props pattern: `grid`, `layoutNodes`, `fields`, `gridData`, `onUpdate`, etc.

2. **New field type in TrackerCell**  
   - Extend `TrackerFieldType` in `types.ts`.  
   - In `TrackerCell.tsx`, add a case and render the appropriate UI.

3. **Custom section or tab layout**  
   - Import from `layout/` (tokens, SectionBar, ViewBlockWrapper) and `blocks/` (GridBlockHeader, GridBlockContent).  
   - Compose your own section/tab component using the same tokens so spacing stays consistent.

4. **Change vertical gap globally**  
   - Edit `layout/layout-tokens.ts` only (e.g. `SECTION_STACK_GAP`, `GRIDS_CONTAINER`). Edit and view both consume these, so they stay in sync.

---

## Public API

From `@/app/components/tracker-display` (root `index.tsx`):

- **TrackerDisplay** (TrackerDisplayInline): main component; pass `TrackerDisplayProps`.
- **DependsOnTable**: standalone table for depends-on rules.
- **Types**: `TrackerDisplayProps`, `TrackerTab`, `TrackerSection`, `TrackerGrid`, `TrackerField`, `TrackerLayoutNode`, `TrackerBindings`, `StyleOverrides`, `DependsOnRules`.

For layout/blocks/sections reuse, import from:

- `@/app/components/tracker-display/layout`
- `@/app/components/tracker-display/blocks`
- `@/app/components/tracker-display/sections`

---

## Dependencies

- **@dnd-kit** (core, sortable, utilities): used by TrackerKanbanGrid and edit-mode drag-and-drop.
- **@tanstack/react-table** + **DataTable** from `grids/data-table`: used by TrackerTableGrid and shared by kanban/div.
- **lib/binding**, **lib/resolve-bindings**, **lib/depends-on**, **lib/depends-on-options**, **lib/style-utils**: option resolution, bindings, conditional rules, style overrides.
