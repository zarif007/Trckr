# System Overview

Trckr is a Next.js App Router application for AI-assisted tracker generation and runtime tracker editing.

## Top-Level Runtime Areas

- `app/`: routes, API handlers, and feature UI.
- `app/components/tracker-display`: tracker renderer/editor (tabs, sections, grids, field settings).
- `app/tracker`: tracker route orchestration and chat/generation flow.
- `lib/`: domain services and reusable runtime logic (bindings, depends-on, validation, calculations, dynamic options, teams, tracker data).
- `prisma/`: database schema and migrations.

## Primary User Flows

1. User signs in and lands on `/dashboard`.
2. User opens or creates a tracker.
3. `/tracker/[id]` loads schema + conversation + latest data snapshot.
4. User edits schema/data in tracker display and can save tracker schema and snapshot data.
5. AI generation endpoints update schema through chat workflow.

## Constraints

- Route paths and API contracts must remain stable unless explicitly versioned.
- Feature code should be organized by ownership boundaries first, shared domain logic second.
- Generated artifacts are not hand-edited.
