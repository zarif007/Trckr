# Auth + API Boundary Pattern

This document defines the standard handler pattern for authenticated API routes.

## Handler shape

1. Resolve auth once with `requireAuthenticatedUser()` (`lib/auth/server`).
2. Parse params/body with `lib/api` helpers (`readParams`, `requireParam`, Zod parsing).
3. Call repository/service layer (`lib/repositories`, `lib/tracker-data`, etc.).
4. Return `jsonOk` / `jsonError` from `lib/api/http`.

## Guarantees

- Unauthorized responses are consistent (`401`, `{ error: "Unauthorized" }`).
- Validation failures are consistently `400`.
- Route files remain orchestration-focused.
- Public route paths and response shapes remain unchanged.

## Request context and logs

AI routes and other sensitive handlers can attach request context via:

- `createRequestLogContext(request, routeName)`
- `withLogPrefix(...)`

This keeps logs traceable with per-request IDs.

