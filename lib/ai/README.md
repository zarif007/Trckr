# lib/ai

Shared AI runtime layer for provider access, config, and logging.

## Goals

- Keep model/provider wiring in one place.
- Reuse timeout and structured logging behavior across AI routes.
- Standardize environment/config handling.

## Modules

- `config.ts`
  - DeepSeek key checks and max token configuration (`DEEPSEEK_MAX_OUTPUT_TOKENS`).
- `provider.ts`
  - `StructuredAiProvider` interface.
  - default DeepSeek implementation (`getDefaultAiProvider()`).
- `runtime.ts`
  - `runWithTimeout`.
  - `logAiStage` / `logAiError` with request context.

## Current policy

- Default provider: DeepSeek (`deepseek-chat`).
- Provider abstraction is in place so additional providers can be added without route-level rewrites.

