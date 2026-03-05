# lib/api

Shared HTTP boundary utilities for App Router route handlers.

## Purpose

- Keep route handlers thin and consistent.
- Standardize JSON success/error responses.
- Centralize request context metadata (`requestId`, route log prefix).
- Reuse safe helpers for params/body parsing.

## Main exports

- `jsonOk`, `jsonError`, `badRequest`, `notFound`, `unauthorized`
- `parseJsonBody`, `zodToBadRequest`
- `readParams`, `requireParam`
- `createRequestLogContext`, `withLogPrefix`

## Usage pattern

1. Authenticate (`requireAuthenticatedUser` from `lib/auth/server`).
2. Parse params/body through `lib/api` helpers.
3. Delegate data access to `lib/repositories`.
4. Return `jsonOk`/`jsonError` with stable payloads.

