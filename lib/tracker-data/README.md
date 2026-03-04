# tracker-data

Persistence for **saved snapshots** of tracker grid data (user-entered table/grid rows). One `TrackerData` row = one snapshot: optional label + full grid data JSON. The module provides types, validation, server-side service functions, and is used by the API routes under `app/api/trackers/[id]/data/`.

## How to save (user steps)

1. **Sign in** — You must be logged in.
2. **Open an existing tracker** — From the dashboard, click a tracker to open it at `/tracker/[id]`. The "Save data" button only appears on this page (not on a new/blank tracker).
3. **Add data** — In the tracker, add at least one row in a table grid (e.g. fill a cell or use "Add row").
4. **Save** — Click **Save data** in the toolbar, optionally enter a label, then click **Save**. If it succeeds, you’ll see "Saved successfully." and the snapshot in the list below. If you see an error (e.g. "Unauthorized", "Tracker not found"), fix that first (sign in, or open the tracker from the dashboard).

## What it is

- **TrackerData** (Prisma): `id`, `trackerSchemaId`, `label?`, `data` (Json), timestamps. One TrackerSchema has many TrackerData rows.
- **data** stores the same shape as the in-memory grid data: `Record<gridId, Array<Record<string, unknown>>>` — i.e. each key is a grid id, each value is an array of row objects (plain key-value records).
- **label** is optional (e.g. "March 5", "Backup before migration") for display in a list of saves.

## Data shape

`data` = `Record<string, Array<Record<string, unknown>>>`:

- Keys: grid ids from the tracker schema.
- Values: arrays of row objects (each row is a plain object with field ids as keys and cell values as values).

This matches the shape returned by `getDataRef.current?.()` in the tracker UI (`TrackerDisplayInline`).

## How it works

- **Save:** UI calls `getDataRef.current?.()` to get current grid data, then POST to `/api/trackers/[id]/data` with optional `label`. The route validates the body and calls `createTrackerData(trackerId, userId, { label, data })`.
- **List:** GET `/api/trackers/[id]/data` returns `{ items: TrackerData[] }` (with optional `limit`/`offset` query params). Use this to show saved snapshots (labels and dates).
- **Load:** GET `/api/trackers/[id]/data/[dataId]` returns one TrackerData. Use its `data` as `initialGridData` (or equivalent) so the tracker can rehydrate from that snapshot.
- **Edit / Delete:** PATCH or DELETE `/api/trackers/[id]/data/[dataId]` to update label/data or remove a snapshot. Ownership is enforced via the tracker’s project (`project.userId === session.user.id`).

## Module API

Import from `@/lib/tracker-data`:

- **Types:** `GridDataSnapshot`, `CreateTrackerDataBody`, `UpdateTrackerDataBody`
- **Validation:** `validateGridDataSnapshot(value: unknown): value is GridDataSnapshot` — ensures a plain object with array-of-plain-objects values.
- **Service (server-only):**
  - `createTrackerData(trackerSchemaId, userId, { label, data })` → created TrackerData or null
  - `listTrackerData(trackerSchemaId, userId, { limit?, offset? })` → `{ items }` or null
  - `getTrackerData(id, userId)` → TrackerData or null
  - `updateTrackerData(id, userId, { label?, data? })` → updated TrackerData or null
  - `deleteTrackerData(id, userId)` → boolean

Route handlers live under `app/api/trackers/[id]/data/` (list + create) and `app/api/trackers/[id]/data/[dataId]/` (get one, PATCH, DELETE).

## When to use

- Saving user-entered grid data from the tracker UI (e.g. "Save" button that POSTs current `getDataRef.current?.()`).
- Loading a previously saved snapshot by fetching one TrackerData and passing its `data` as `initialGridData`.
- Managing saved data: list, rename (PATCH label), delete (DELETE).

All operations require the user to own the tracker (via project); the service layer enforces this.
