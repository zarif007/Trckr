# Placeholder Policy

Trckr does not keep empty placeholder directories in the main source tree.

## Rule

- Remove dead/empty directories during refactors.
- If a future feature area is planned but not implemented, document it in this file or an issue instead of creating empty paths.

## Current Reserved Placeholders

None.

## When to Add a Placeholder Entry

Add an entry only when all of the following are true:

1. The directory boundary is part of an approved architecture decision.
2. The work is scheduled in the near term.
3. There is an owner and tracking issue/PR.

Use this format:

- `path`: owner, purpose, target milestone, tracking issue.
