# Foreign binding sources

When a select field’s binding sets `optionsSourceSchemaId`, options (and “add option”) come from **another tracker** in the same project. This folder owns that flow.

## Files

| File | Role |
|------|------|
| `types.ts` | `GridDataSnapshot`, `ForeignDataPersistMeta`, `ForeignSourceBundle` |
| `tracker-api.ts` | `fetch`, URL builders, `loadForeignBindingSource`, `persistForeignBindingSnapshot`, JSON parsing |
| `constants.ts` | Debounce interval for coalescing saves |
| `useForeignBindingSources.ts` | Hook: load effect, debounced + follow-up persist, dirty tracking, loading/saving/error flags |
| `index.ts` | Public exports |

## Data flow

1. **Load** — For each foreign schema id, parallel `GET /api/trackers/:id` and `GET /api/trackers/:id/data?limit=1`. Schema gives fields/layout for the add-option form; data gives option rows. Persist meta records `writeMode` (upsert vs patch) and snapshot id.
2. **Add option** — UI appends a row and marks the source **dirty**. A **debounced** persist (`FOREIGN_BINDING_SAVE_DEBOUNCE_MS` in `constants.ts`) merges rapid adds into one API call per source.
3. **In-flight adds** — If the user adds another option while a save is still running, a **follow-up save** runs automatically so we never stop at a stale snapshot.
4. **Persist** — `persistForeignBindingSnapshot` mirrors auto-save: POST upsert for single non-VC trackers; PATCH by snapshot id otherwise; POST to create the first row when needed.
5. **Failure** — On API error, we surface a dismissible message in the inline tracker UI and refetch that source’s data.
6. **Unmount** — Best-effort `persistForeignBindingSnapshot` for sources that are still dirty (e.g. user navigates away right after adding).

## Contributing

- Prefer extending **`tracker-api.ts`** for new endpoints or response shapes; keep the hook thin.
- If you add server fields, update the parsers in `tracker-api.ts` and extend **`types.ts`** if the shape is reused.
- Run `npx tsc --noEmit` from the repo root after changes.
