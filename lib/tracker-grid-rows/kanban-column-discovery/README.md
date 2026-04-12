# Kanban column discovery

**Problem:** On **paginated** grids, `gridData[gridId]` is often empty. Kanban columns for a string-like **group-by** field cannot be inferred by scanning local rows, so the UI would collapse to a single **Uncategorized** lane.

**Solution:** Combine up to three sources, in order:

1. **Resolved options** — `resolveFieldOptionsV2` (status, options, multiselect, bindings, inline `config.options`, …). When this list is non-empty, columns **start** with that ordered list; any distinct row/server values not in that id set are appended afterward.
2. **Local row values** — distinct trimmed strings from `row.data[groupByFieldId]` for snapshot or hybrid loads.
3. **Server distinct values** — `GET .../distinct-field-values?fieldKey=...` runs `SELECT DISTINCT (data->>'fieldKey')` in the repository, using the same `->>` text semantics as `GET .../rows?groupFieldId=&groupValue=` filters.

## Module layout

| File | Role |
|------|------|
| `types.ts` | Shared descriptors (`KanbanGroupColumnDescriptor`, option-like shape). |
| `merge-group-columns.ts` | **Pure** `buildKanbanGroupColumnDescriptors` — merges sources, dedupes, appends Uncategorized. |
| `resolved-select-options.ts` | `fieldHasNonEmptyResolvedOptions` — thin, testable wrapper around `resolveFieldOptionsV2`. |
| `index.ts` | Public exports for `@/lib/tracker-grid-rows/kanban-column-discovery` (also re-exported from `lib/tracker-grid-rows`). |

## HTTP (outside this folder)

- **Route:** `app/api/trackers/[id]/grids/[gridSlug]/distinct-field-values/route.ts`
- **Repository:** `listDistinctDataValuesForGridField` in `lib/repositories/grid-row-repository.ts`
- **Client:** `fetchGridDistinctFieldValues` in `lib/tracker-grid-rows/client.ts`
- **Hook:** `useDistinctGridFieldValues` in `lib/tracker-grid-rows/hooks/useDistinctGridFieldValues.ts`

## React integration

- **`useKanbanGroups`** (`app/.../grids/kanban/useKanbanGroups.ts`) calls `buildKanbanGroupColumnDescriptors` so column math stays **pure** and UI-agnostic.
- **`usePaginatedKanbanColumnSources`** (`app/.../grids/kanban/usePaginatedKanbanColumnSources.ts`) wires layout + `fieldHasNonEmptyResolvedOptions` + `useDistinctGridFieldValues` for **`TrackerKanbanGrid`** only — keeps the page component declarative.

## Extension points

- **New column sources** (e.g. “pinned” lanes): extend `BuildKanbanGroupColumnDescriptorsInput` and merge inside `buildKanbanGroupColumnDescriptors`; keep the function pure.
- **Caching / SWR:** wrap `fetchGridDistinctFieldValues` or the hook; do not embed cache policy in the repository.
- **Non-string group values:** today equality is string/text only (matches row API). Multiselect arrays would need a dedicated branch in both the repository filter and this merger.

## Tests

- `lib/tracker-grid-rows/__tests__/kanban-column-discovery.test.ts` — pure builder + option vs distinct precedence.
