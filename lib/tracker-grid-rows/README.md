# Tracker grid rows (server-backed pagination)

This module is the **client-side half** of paginated table and kanban data: HTTP helpers, React hooks, and row utilities. It stays independent of UI components (`TrackerTableGrid`, `TrackerKanbanGrid`) and of the database.

## Responsibilities

| Piece | Role |
|--------|------|
| `api-paths.ts` | Builds relative `/api/trackers/...` URLs (single source of truth for path shape). |
| `limits.ts` | Clamps `limit` / `offset` to match server caps (`GRID_ROWS_MAX_LIMIT`, etc.). |
| `client.ts` | `fetch`, `POST`, `PATCH`, `DELETE` for grid rows and tracker row documents. |
| `row-utils.ts` | `rowIdFromRow`, `rowPayloadForPatch` (strip `_meta` keys before PATCH). |
| `hooks/usePaginatedGridData.ts` | Table: one page of rows, page index/size, CRUD via row APIs. |
| `hooks/useKanbanPaginatedColumns.ts` | Kanban: first page per column in one batched update, then **Load more** per column. |

**Not here:** schema flags (`dataLoading.mode`), omitting snapshot grids, or repository SQL — see `lib/grid-data-loading.ts`, `app/tracker/[id]/page.tsx`, `lib/repositories/grid-row-repository.ts`, and `app/api/trackers/[id]/grids/[gridSlug]/rows/route.ts`.

## Configuration (schema)

Resolved by **`lib/grid-data-loading.ts`** (import that from features, not this module):

- **`dataLoading.mode`**: `"paginated"` enables server row loading; `"snapshot"` forces full snapshot. When `mode` is omitted, **table/kanban surfaces default to paginated**; **`*_options_grid`** stays on snapshot.
- **Page size (table)**: `dataLoading.pageSize` → `config.pageSize` → default `10`.
- **Page size (kanban)**: `dataLoading.kanbanPageSize` if set; otherwise same resolution as table via `effectiveKanbanPageSize`.

## HTTP contract

### `GET /api/trackers/[id]/grids/[gridSlug]/rows`

Query:

- `limit`, `offset` — clamped server-side (max 1000). Client uses `clampGridRowsLimit` / `clampGridRowsOffset` to stay aligned.
- `branch` — branch name (default `main`).
- **Kanban filter (optional):** `groupFieldId` + `groupValue` — JSON field filter for that column.

Response JSON: `{ rows, total, gridSlug? }` or `{ error }`.

### `POST` same path

Body: `{ data, branchName? }` — creates a row; returns `{ row }`.

### `PATCH/DELETE /api/trackers/[id]/data/[rowId]`

Row-level updates; PATCH body `{ data }`. Use **`rowPayloadForPatch`** so `_rowId` / `_sortOrder` are not sent as data keys.

## Initial tracker load (omit snapshot)

For paginated grids, the tracker page requests:

`GET /api/trackers/[id]/data?omitGridData=<comma-separated grid slugs>`

Those grids arrive with **empty arrays** in the snapshot; **`usePaginatedGridData`** / **`useKanbanPaginatedColumns`** fill them via the grid rows API.

## Hooks — usage notes

### `usePaginatedGridData`

- Pass **`enabled: true`** only when the grid is paginated-capable and you have a `trackerId`.
- **AbortController** on dependency change: in-flight fetches are aborted to avoid races when changing page quickly.
- When **`enabled` becomes false**, state is cleared and **`error` is reset** (avoids stale error banners).

### `useKanbanPaginatedColumns`

- **`groupIds`**: callers often pass `groups.map(g => g.id)` — a **new array every render**. The hook uses **`groupIds.join(KANBAN_GROUP_IDS_KEY_DELIMITER)`** in the effect dependency list and a **ref** for the latest `groupIds` so effects do not loop infinitely.
- Initial load: **one `setColumns` per wave** after all columns’ first pages resolve (fewer renders than updating per column).
- **`loadMore(groupId)`**: appends the next page for that column; uses the same `fetchGridRowsList` helper.

## Imports

Preferred public entry:

```ts
import {
  usePaginatedGridData,
  useKanbanPaginatedColumns,
  rowPayloadForPatch,
} from "@/lib/tracker-grid-rows";
```

Legacy paths still work (thin re-exports):

- `@/lib/hooks/usePaginatedGridData`
- `@/lib/hooks/useKanbanPaginatedColumns`

## Tests

- `lib/tracker-grid-rows/__tests__/row-utils.test.ts`
- `lib/tracker-grid-rows/__tests__/limits.test.ts`
- `lib/__tests__/grid-data-loading.test.ts` — schema / page-size behavior

Run: `npx vitest run lib/tracker-grid-rows/__tests__`

## Extension points

- **New query params** for `GET` rows: extend `FetchGridRowsListParams` and `fetchGridRowsList`, then the route + repository.
- **Caching**: hooks are intentionally simple; add TanStack Query in a thin wrapper if you need cache policies without bloating these hooks.
