# lib/repositories

Repository layer for server-side persistence and ownership checks.

## Why

API handlers should orchestrate request/response, not embed all Prisma logic. Repositories provide:

- reusable data access,
- centralized user-ownership checks,
- fewer unsafe casts in route files.

## Current repositories

- `project-repository.ts`
- `tracker-repository.ts`
- `tracker-data-repository.ts`
- `conversation-repository.ts`
- `auth-repository.ts`

## Design rules

1. Keep public route contracts stable.
2. Enforce ownership checks close to data access.
3. Return domain objects; route handlers map to existing response shapes when needed.
4. Avoid route/UI imports inside repository modules.

