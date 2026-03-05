# Module Boundaries

## Feature-First Hybrid Rule

- Keep feature orchestration near route features (`app/tracker`, `app/dashboard`, `app/components/*feature*`).
- Keep cross-feature domain logic in `lib/*` modules.
- Avoid mixing route concerns into shared modules.

## Ownership Boundaries

- `app/tracker/*`: tracker page orchestration and state flow.
- `app/components/tracker-page/*`: tracker chat and page-level presentation.
- `app/components/tracker-display/*`: schema runtime renderer/editor.
- `app/api/*`: HTTP boundary, auth check, request/response validation, service calls.
- `lib/tracker-data`, `lib/teams`, `lib/dynamic-options`, `lib/binding`, `lib/depends-on`, `lib/validate-tracker`: domain logic and data operations.

## Dependency Direction

- UI (`app/components`) can depend on `lib/*`.
- API handlers can depend on `lib/*` and DB layer.
- `lib/*` modules should not depend on route components.

## Barrel Compatibility

When internals move, keep stable re-export boundaries (feature barrels/index files) so callers do not require broad import rewrites.
