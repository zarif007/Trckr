# Trckr

A config-driven tracker builder: chat with AI to generate tracker schemas, then render them as interactive tabs, sections, and grids (table, kanban, form views) with bindings and conditional rules.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Workspace entry is `/dashboard` after sign-in, and tracker editing lives under `/tracker` and `/tracker/[id]`.

For the full engineering docs and onboarding flow, start at [`docs/README.md`](docs/README.md).

## Architecture

- **app/** — Next.js routes and feature components (tracker page, landing page)
- **components/** — Shared UI primitives (buttons, dialogs, selects, etc.)
- **lib/** — Core logic: binding resolution, field rules, validation, dynamic options

The tracker display (`app/components/tracker-display/`) turns a schema + data into tabs, sections, and grid views. Data flows one-way; the parent supplies `gridData` and callbacks.

For a detailed overview, see:

- [`docs/README.md`](docs/README.md)
- [`docs/architecture/system-overview.md`](docs/architecture/system-overview.md)
- [`docs/architecture/module-boundaries.md`](docs/architecture/module-boundaries.md)

## Key Documentation

- [Tracker Display](app/components/tracker-display/README.md) — tabs, sections, grids, bindings
- [lib/binding](lib/binding/README.md) — option resolution, bindings from schema
- [lib/field-rules](lib/field-rules/README.md) — conditional field rules (hide, require, disable)

## Features

### Create Tracker Dialog

When creating a new tracker from the Project or Module pages, a dialog offers three settings:

| Setting | Options | Default | Notes |
|---|---|---|---|
| **Name** | Any string | — | Auto-deduplicates: if `"budget"` exists, creates `"budget (1)"` |
| **Instance** | Single / Multi | Single | Determines the tracker mode (see below) |
| **Version Control** | Toggle | Off | Only available for Single instance trackers |

---

### Instance Types

#### Single Instance

The default mode. One shared tracker with a single dataset.

- **Without version control (default):** Direct save — data is persisted as a single `TrackerData` record, upserted in-place on every save. No version history, no branches, no snapshots. The Save Data button in the navbar writes directly to the database.
- **With version control:** Enables the full branching system (see [Version Control](#version-control-single-instance-only) below).

#### Multi Instance

Multiple independent data entries for the same tracker structure. When you create a tracker named `"xyz"` with Multi selected:
- `xyz` is created — the tracker schema definition (used to edit/view its structure)
- `xyz.list` is created automatically — a companion list view

In the sidebar, both entries appear grouped under the same tracker. The `xyz.list` entry has a `LayoutList` icon to distinguish it.

**Using the list view (`xyz.list`):**
- Shows all saved instances in a table with: index, label, data preview, author, created-at
- Click any row to open that instance in the tracker (loads its data)
- **New Instance** button opens the tracker with a blank form; save via the nav bar
- Search/filter instances by label, author, or data content
- Delete instances with confirmation dialog
- Supports pagination (50 per page)

**Saving a new instance (Multi mode):**
Navigate to `/tracker/[parentId]?instanceId=new` — the tracker opens with no pre-loaded data. Use the nav bar **Save Data** button to persist it as a new `TrackerData` entry.

**Opening an existing instance:**
Navigate to `/tracker/[parentId]?instanceId=[dataId]` — the tracker pre-loads that instance's grid data.

---

### Version Control (Single Instance only)

When **Version Control** is enabled on a Single instance tracker, the tracker toolbar gains a branch management bar:

```
[main ▼]  [Diff]  [Merge ↑]  just now
```

#### Branches

Each branch is backed by a `TrackerData` record. The `main` branch is the canonical branch, created on first save.

| Action | How |
|---|---|
| Switch branch | Click the branch selector dropdown |
| New branch | Click the dropdown → `+ New branch from <current>` → enter name → confirm |
| Save to branch | Use nav bar **Save Data** — saves to the current branch |
| View diff | Click **Diff** — opens side-by-side or unified diff comparing current branch vs `main` |
| Merge to main | Click **Merge** → confirmation dialog → copies branch data to `main`, marks branch as merged |

#### Diff View

The diff modal supports two display modes (toggle via Split/Unified buttons):

**Side-by-side (Split):**
- Left panel shows `main` (base), right panel shows the current branch
- Green rows — added in branch
- Red rows — removed from main
- Yellow cells — field-level modifications

**Unified (Inline):**
- Single table with `+`, `-`, `~` prefixes
- Modified rows show the old value struck through below the new value
- Only changed rows are displayed

Row matching uses `id`, `_id`, `rowId`, or `key` fields when available, falling back to index-based matching.

#### Branch Lifecycle

```
main ──────── save ──────── save
       │
       └─── new-branch ─── edit ─── diff ─── merge → main
                                      ↑
                                  compare with main
```

#### Branch History

Merged branches are preserved in the branch dropdown under a "Merged" section with a visual indicator. They cannot be modified but serve as an audit trail.

#### API Endpoints

| Method | URL | Description |
|---|---|---|
| `GET` | `/api/trackers/[id]/branches` | List all branches (requires VC enabled) |
| `POST` | `/api/trackers/[id]/branches` | Create branch `{ branchName, basedOnId, label? }` |
| `GET` | `/api/trackers/[id]/branches/[branchId]` | Get single branch |
| `PATCH` | `/api/trackers/[id]/branches/[branchId]` | Update branch data/label |
| `POST` | `/api/trackers/[id]/branches/[branchId]/merge` | Merge branch into main |

---

### Data Persistence Modes

| Mode | Instance | VC | Behavior |
|---|---|---|---|
| **Direct Save** | Single | Off | Upserts a single `TrackerData` record in-place |
| **Branch Save** | Single | On | Each branch is a `TrackerData` record; saves update current branch |
| **Instance Save** | Multi | Off | Each instance is a new `TrackerData` record with author/timestamp |

The `POST /api/trackers/[id]/data` endpoint automatically detects the tracker mode and routes accordingly:
- Single + No VC → upserts the single record
- Single + VC → creates a new branch/snapshot record
- Multi → creates a new instance record

---

### Name Deduplication

When creating a tracker, if a tracker with the same name already exists in the same project/module scope, a numeric suffix is appended automatically:

```
"budget"      → already exists → "budget (1)"
"budget (1)"  → already exists → "budget (2)"
```

This applies to both the main tracker and its `.list` companion (for Multi instance).

---

### Sidebar Icons

| Icon | Meaning |
|---|---|
| `FileText` | Single instance, no version control |
| `GitBranch` | Single instance, version control enabled |
| `Layers` | Multi instance |
| `LayoutList` | List companion (`.list` schema for Multi) |

---

## Database Schema

### TrackerSchema

| Field | Type | Description |
|---|---|---|
| `instance` | `SINGLE \| MULTI` | Instance mode |
| `versionControl` | `Boolean` | Whether branching is enabled (only for SINGLE) |
| `listForSchemaId` | `String?` | Links `.list` companion to parent schema |

### TrackerData

| Field | Type | Description |
|---|---|---|
| `data` | `Json` | Grid data snapshot (`GridDataSnapshot`) |
| `branchName` | `String` | Branch identifier (default: `"main"`) |
| `authorId` | `String?` | User who created/owns this record |
| `basedOnId` | `String?` | Parent branch (for VC branching) |
| `isMerged` | `Boolean` | Whether this branch has been merged into main |

---

## Scripts

| Command  | Description        |
|----------|--------------------|
| `npm run dev`   | Start development server |
| `npm run build` | Production build          |
| `npm run start` | Run production server     |
| `npm run lint`  | Run ESLint                |
| `npm run typecheck` | Run TypeScript check  |
| `npm run docs:generate` | Generate docs maps |
| `npm run docs:check` | Validate docs coverage and sync |
| `npm run size:check` | Enforce file-size guardrails |
| `npm run quality:check` | Run all blocking quality gates |
