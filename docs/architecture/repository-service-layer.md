# Repository and Service Layering

## Intent

Separate HTTP concerns from persistence logic without changing API contracts.

## Layer responsibilities

- `app/api/*`
  - request/response orchestration
  - auth guard invocation
  - input validation
- `lib/repositories/*`
  - Prisma queries
  - ownership filtering (`project.userId` checks)
  - common CRUD flows shared by multiple routes
- `lib/*` domain engines
  - business logic (bindings, field rules, validation, dynamic-options)

## Current examples

- Project routes now use `project-repository`.
- Tracker routes now use `tracker-repository` and `tracker-data-repository`.
- Conversation/message routes now use `conversation-repository` (no raw SQL ownership query).
- Login event route now uses `auth-repository`.

## Compatibility

All route contracts are preserved:

- same paths
- same primary response payloads
- same 401/404/400 behavior

