# Binding select source display

This document describes **`binding-select-source-display.ts`**: how the UI decides when a bound **select / multiselect** is still loading option rows, and which **human-readable grid name** to show when the list is empty.

It complements [`options.ts`](./options.ts) (`resolveOptionsFromBinding`), which builds the actual option list from rows. Display-state logic lives here so **table**, **div**, and future grids can share one implementation.

---

## Why it exists

- **Foreign bindings:** Options come from `foreignGridDataBySchemaId[sourceSchemaId]` after async loads. Until that snapshot exists, the dropdown should show a loading skeleton—not `"No data. From table: supplier_grid"`.
- **Local bindings:** Options come from `localGridData[optionsGridId]`. The grid engine may not have merged a slice for that grid yet (key absent) even though the grid exists in the schema. That is treated like “still loading” so behavior matches foreign bindings.
- **Self bindings:** `optionsSourceSchemaId` may equal the current tracker id or use `ThisTracker` / `__self__`. Those must **not** be treated as foreign snapshots (same rule as [`collectOptionsSourceSchemaIds`](./binding-sources.ts)).

---

## Public API

| Export | Role |
|--------|------|
| `resolveBindingSelectSourceDisplay(input)` | Single pure function: returns `usesForeignBindingSnapshot`, `isLoadingOptions`, `optionsGridDisplayName`. |
| `usesForeignBindingOptionsSnapshot(sourceId, currentTrackerId)` | Small predicate aligned with `getOptionsGridRowsForBinding` / `collectOptionsSourceSchemaIds`. |
| `localGridSnapshotHasGridSlice(gridData, gridId)` | `Object.prototype.hasOwnProperty.call`—documents the “hydrated slice” rule. |
| `BindingSelectSourceDisplayInput` | Typed input bag (callbacks for schema lookups keep the lib UI-agnostic). |
| `BindingSelectSourceDisplay` | Output type for selects (`isLoadingOptions` → dropdown skeleton only in UI). |

---

## Loading rules (summary)

1. **Foreign snapshot** (`usesForeignBindingOptionsSnapshot` is true): loading until `foreignGridDataBySchemaId[trimmedSourceId]` is truthy.
2. **Local / self**: loading if the options grid id is **known in the current tracker schema** and **`localGridData` does not yet own that key** (even an empty `[]` slice counts as ready).

When `isLoadingOptions` is true, `optionsGridDisplayName` is **`undefined`** so shared select components do not show raw grid ids in empty states.

---

## Consumers

- [`TrackerTableGrid`](../../app/components/tracker-display/TrackerTableGrid.tsx) — per-field metadata for data table cells.
- [`TrackerDivGrid`](../../app/components/tracker-display/grids/div/TrackerDivGrid.tsx) — per-field maps for div layout.

---

## Tests

Run:

```bash
vitest run lib/resolve-bindings/__tests__/binding-select-source-display.test.ts
```

---

## Extension points

- **More signals:** If you add server-backed pagination or per-grid fetch flags, extend `BindingSelectSourceDisplayInput` with optional booleans and combine them in `resolveBindingSelectSourceDisplay`—call sites stay thin.
- **Other grids:** Import the same resolver from Kanban or form-only views; pass the same `localGridData` and schema callbacks for consistency.
