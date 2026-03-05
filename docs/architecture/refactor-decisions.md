# Refactor Decisions (March 2026)

## Decisions applied

1. Delivery model: phased hardening (safe incremental changes).
2. Compatibility: no route-path or response-shape breaking changes.
3. Teams: keep mock behavior, expose explicit service interface.
4. AI: provider abstraction with DeepSeek default.
5. Persistence policy: do not store manager `thinking`.
6. Quality gate: lint warnings reduced to zero.
7. Test scope: added API-validation and tracker-hook tests.

## Key tradeoffs

- Some complex tracker-display hook dependency issues were stabilized incrementally without large behavior rewrites.
- Team backend persistence remains intentionally deferred; service interface now isolates future implementation.

## Follow-up candidates

- Continue modular extraction of the largest tracker-display files into smaller hooks/components.
- Add integration tests around tracker conversation + snapshot flows.
- Add a second AI provider implementation behind `StructuredAiProvider`.

