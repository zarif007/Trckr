# Quickstart (60 Minutes)

## 0-10 min: Run the project

1. `npm install`
2. `npm run dev`
3. Open `/dashboard`.

## 10-20 min: Learn architecture

1. Read [System Overview](../architecture/system-overview.md).
2. Read [Module Boundaries](../architecture/module-boundaries.md).
3. Read [Feature Catalog](../features/feature-catalog.md).

## 20-35 min: Learn key feature internals

1. Tracker orchestration: `app/tracker`.
2. Tracker renderer/editor: `app/components/tracker-display`.
3. Runtime engines: `lib/binding`, `lib/resolve-bindings`, `lib/depends-on`, `lib/dynamic-options`.

## 35-50 min: Exercise one safe change

1. Pick a UI-only change in `app/components/tracker-page` or `app/components/landing-page`.
2. Update or add docs where behavior changed.
3. Run quality gates:
   - `npm run lint`
   - `npm run test:run`
   - `npm run typecheck`
   - `npm run docs:check`

## 50-60 min: Open PR

Use [First PR Checklist](./first-pr-checklist.md) before requesting review.
