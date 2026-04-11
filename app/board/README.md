# Board (dashboard) feature

Users compose **boards** from widgets bound to project trackers (stats, tables, charts). Boards live under `/board/[id]` (view) and `/board/[id]/edit` (editor).

## Layering

| Layer | Responsibility |
|--------|----------------|
| **`lib/boards/`** | Domain: Zod schemas, Prisma-backed repository, server execution (`execute-board` is `server-only`), document layout helpers, default widget builders, client schema fetch for pickers, undoable definition hook. |
| **`app/api/boards/*`** | Auth, validation, HTTP; call repositories and `executeBoardForUser`. |
| **`app/board/_editor/`** | Editor UI: document stack, blocks, settings popovers, autosave, toolbar. |
| **`app/board/_components/`** | Thin route-facing components (`BoardViewClient`, `BoardEditClient` re-export). |
| **`app/board/_hooks/`** | Nav bar wiring for board routes. |

## Imports

- **Client components** should import shared logic from `@/lib/boards` (the barrel exports only **client-safe** modules; it does **not** re-export `execute-board` or `board-repository` because they are `server-only`).
- **Route handlers** import `@/lib/boards/execute-board`, `@/lib/boards/board-repository`, etc. explicitly.
- **Types** such as `BoardElementPayload` still come from `@/lib/boards/execute-board` with `import type` where needed in the editor (types are erased at compile time; do not add value exports from `execute-board` into the client barrel).

## Editor behavior

- Definition state uses **`useUndoableBoardDefinition`**: undo snapshots are taken **outside** `setState` (refs) so React Strict Mode does not duplicate history entries.
- Tracker display schemas for binding pickers are loaded with **`fetchTrackerAssembledSchema`** (`GET /api/trackers/:id`), cached per tracker in component state, and prefetched for trackers referenced by the definition and the first scoped tracker (fast “Add widget” path).
- Autosave debounces `PATCH /api/boards/:id` with the current definition; successful saves refresh **`GET /api/boards/:id/data`** for widget payloads.

## Tests

Board domain unit tests live in `lib/boards/__tests__/`. Run:

```bash
vitest run lib/boards/__tests__/document-layout.test.ts
```

## Related docs

Repository-wide conventions: `CLAUDE.md`, `AGENTS.md`.
