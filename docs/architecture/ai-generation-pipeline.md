# AI Generation Pipeline

## Scope

Applies to:

- `/api/generate-tracker`
- `/api/agent/generate-expr`
- `/api/agent/generate-analysis`
- `/api/agent/generate-dynamic-options`
- `/api/dynamic-options/resolve` (AI extraction path)

## Architecture

- Provider abstraction: `lib/ai/provider.ts`
  - `StructuredAiProvider` interface
  - default DeepSeek provider
- Runtime helpers: `lib/ai/runtime.ts`
  - timeout helper
  - stage/error logging utilities
- Config helpers: `lib/ai/config.ts`
  - key presence checks
  - output token configuration

## Operational behavior

- AI routes attach request IDs via `createRequestLogContext`.
- Logs are stage-scoped (`request`, `stream-failure`, `fallback-success`, etc.).
- Tracker generation keeps stream-first behavior with fallback attempts.
- Dynamic option extraction uses timeout-guarded provider calls.

## Data policy

Manager `thinking` is treated as transient:

- not persisted in conversation message records,
- stripped before database write in chat persistence paths.

