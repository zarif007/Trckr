# Data Flow

## Tracker Schema Flow

1. Tracker schema is loaded from `/api/trackers/:id`.
2. `app/tracker/[id]/page.tsx` passes schema into `TrackerAIView`.
3. `TrackerAIView` and `useTrackerChat` coordinate AI generation and schema updates.
4. `TrackerDisplay` renders schema and emits update callbacks.
5. Save action persists schema via `/api/trackers/:id` (PATCH).

## Tracker Data Snapshot Flow

1. Latest snapshot is fetched from `/api/trackers/:id/data?limit=1`.
2. Snapshot rows are passed into `TrackerDisplay` as initial grid data.
3. User edits data in grid views.
4. Save data action persists snapshot via `/api/trackers/:id/data`.

## Conversation Flow

1. Tracker conversation loads from `/api/trackers/:id/conversation`.
2. User and assistant messages are persisted through `/api/conversations/:id/messages`.
3. Generation endpoints produce full tracker or patch responses.

## Runtime Engines Used by Grid Rendering

- `lib/binding`: field option resolution and mapping.
- `lib/resolve-bindings`: path parsing and option row application.
- `lib/depends-on`: visibility/required/disabled overrides.
- `lib/field-validation` + `lib/field-calculation`: field-level runtime checks and recalculation.
- `lib/dynamic-options`: built-in and user-defined dynamic option providers.

## API Handler Flow (Refactor Pattern)

1. Route handler calls `requireAuthenticatedUser()` from `lib/auth/server` when protected.
2. Params/body validation happens via `lib/api` helpers + Zod schemas.
3. Persistence reads/writes go through `lib/repositories`.
4. Response formatting uses `lib/api/http` helpers.
