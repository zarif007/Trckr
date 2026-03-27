## Entry Way module

### What is an Entry Way?

An **Entry Way** is a named shortcut for creating a new row in a grid (table or kanban) with predefined values.

- It appears as a small **dropdown chevron** next to the main **New Entry** button.
- Clicking the main button still opens the normal **Add Entry** dialog.
- Clicking an Entry Way in the dropdown **silently creates a new row** using its configured defaults (no dialog).

Entry Ways are configured **per grid** and are fully optional. If a grid has no Entry Ways, the UI falls back to a simple New Entry button.

### Types and config shape

Core types live in `entry-way-types.ts`:

- `EntryWayConfig` – serializable config stored on the grid:
  - `id: string` – stable id within the grid.
  - `label: string` – text shown in the dropdown.
  - `description?: string` – optional helper text in the menu.
  - `defaults?: Record<string, unknown>` – field-id → value mapping for the new row.
- `EntryWayContext` – minimal runtime context:
  - `gridId: string`
  - `tabId: string`
- `EntryWayDefinition` – executable version used by the UI:
  - `id`, `label`, `description`, `config`
  - `buildRow(ctx: EntryWayContext): Record<string, unknown>`

Grid config is extended in `TrackerGridConfig` (see `types.ts`):

- `entryWays?: EntryWayConfig[]`

This field is value-only (no functions) so it can be safely stored/serialized along with the tracker schema.

### Resolving Entry Ways for a grid

`entry-way-registry.ts` provides the main helper:

- `buildEntryWaysForGrid({ grid, tabId }): EntryWayDefinition[]`
  - Reads `grid.config.entryWays`.
  - Wraps each `EntryWayConfig` into an `EntryWayDefinition`.
  - Today, `buildRow` simply returns a shallow copy of `config.defaults`:
    - `return { ...(config.defaults ?? {}) }`
  - This function is the **single place** to evolve Entry Ways behavior (computed values, timestamps, bindings, etc.).

### UI integration

`EntryWayButton.tsx` implements the split-button UI that both table and kanban use.

Props:

- `onNewEntryClick: () => void` – triggers the normal Add Entry flow (dialog).
- `entryWays: EntryWayDefinition[]` – list of shortcuts for this grid.
- `onSelectEntryWay: (way: EntryWayDefinition) => void` – called when a shortcut is chosen.
- `disabled?: boolean` – disables both segments.

Behavior:

- If `entryWays.length === 0`, it renders only the shared `AddEntryButton` (plain New Entry).
- If `entryWays.length > 0`:
  - Left segment: `AddEntryButton` (New Entry).
  - Right segment: a chevron button opening a popover with all Entry Ways.

Consumers:

- **Table view** (`TrackerTableGrid.tsx` → `DataTable`):
  - `TrackerTableGrid` calls `buildEntryWaysForGrid({ grid, tabId })`.
  - Passes the result into `DataTable` via `entryWays` prop.
  - `DataTable` renders `EntryWayButton` in the top-right toolbar.
  - `onSelectEntryWay` calls `onAddEntry(way.buildRow({ gridId, tabId }))` and **does not open the dialog**.
- **Kanban view** (`TrackerKanbanGrid.tsx`):
  - Also calls `buildEntryWaysForGrid({ grid, tabId })`.
  - Uses `EntryWayButton` in the kanban header actions.
  - `onSelectEntryWay` calls `onAddEntry(way.buildRow({ gridId, tabId }))`, respecting the same `addable` / `readOnly` rules as the New Entry button.

### How to add a new Entry Way

1. **Choose a target grid** (by id) in your tracker schema.
2. Add an `entryWays` array to that grid’s `config`, for example:

```ts
config: {
  // existing grid config...
  entryWays: [
    {
      id: 'quick_task',
      label: 'Quick task',
      description: 'New task in Todo with low priority',
      defaults: {
        status: 'Todo',
        priority: 'Low',
      },
    },
  ],
}
```

3. Ensure the keys in `defaults` match **field ids** for that grid.
4. After this, both table and kanban views for that grid will show a split New Entry / Entry Way button, and choosing “Quick task” will immediately create a row with the specified values.

### Future extension points

If you want more advanced behavior later, extend `EntryWayConfig` and `buildEntryWaysForGrid`:

- Support parameterized defaults (e.g. “today”, “now”, “current user”).
- Integrate with bindings/field-rules to compute additional fields when the Entry Way is used.
- Attach icons to Entry Ways (add an optional `icon` field and render it in the menu).
- Add an editor UI that lets users manage `entryWays` instead of editing schema by hand.

