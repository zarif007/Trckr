# Engineering SOP

## 1. Scope Before Code

- Identify feature boundary first.
- Confirm whether change is route orchestration, feature UI, domain engine, or API boundary.

## 2. Preserve Contracts by Default

- Do not change route paths or API response shapes unless explicitly approved.
- Keep compatibility barrels in place while restructuring internals.

## 3. Keep Modules Focused

- Route files should orchestrate, not contain all feature internals.
- Move reusable domain logic into `lib/*` with narrow interfaces.
- Prevent new monoliths with file size checks.

## 4. Docs Are Part of Done

- Update feature docs and ownership maps with each meaningful behavior/structure change.
- Keep generated maps in sync (`npm run docs:generate`).

## 5. Mandatory Gates Before Merge

- `npm run lint`
- `npm run test:run`
- `npm run typecheck`
- `npm run docs:check`

## 6. PR Hygiene

- Include concise change summary.
- Include risk/rollback notes for non-trivial refactors.
- Include contract impact statement (`none` or explicit details).
