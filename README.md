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
- **lib/** — Core logic: binding resolution, depends-on rules, validation, dynamic options

The tracker display (`app/components/tracker-display/`) turns a schema + data into tabs, sections, and grid views. Data flows one-way; the parent supplies `gridData` and callbacks.

For a detailed overview, see:

- [`docs/README.md`](docs/README.md)
- [`docs/architecture/system-overview.md`](docs/architecture/system-overview.md)
- [`docs/architecture/module-boundaries.md`](docs/architecture/module-boundaries.md)

## Key Documentation

- [Tracker Display](app/components/tracker-display/README.md) — tabs, sections, grids, bindings
- [lib/binding](lib/binding/README.md) — option resolution, bindings from schema
- [lib/depends-on](lib/depends-on/README.md) — conditional field rules (hide, require, disable)

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
