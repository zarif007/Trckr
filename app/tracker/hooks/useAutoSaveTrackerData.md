## `useAutoSave` and `useAutoSaveTrackerData`

This module provides a **generic, production-grade auto-save hook** (`useAutoSave`) and a
tracker-specific convenience wrapper (`useAutoSaveTrackerData`).

Both hooks implement:

- **Debounced writes** (coalesce rapid edits into a single save)
- **Idle timeout** (optional “must be idle for N ms before saving”)
- **No overlapping saves** (queue semantics)
- **Stable callbacks** (no feedback loops from changing function identities)
- **Deep equality check** (skip writing when data has not changed since the last successful save)

---

### Generic hook: `useAutoSave<TData>`

**Signature**

```ts
type AutoSaveState = "idle" | "saving" | "error";

interface UseAutoSaveOptions<TData> {
  enabled: boolean;
  getData: () => TData;
  save: (data: TData) => Promise<void>;
  debounceMs?: number; // default 800
  idleMs?: number; // default 0 (disabled)
  onStateChange?: (state: AutoSaveState, error?: Error) => void;
}

function useAutoSave<TData>(options: UseAutoSaveOptions<TData>): {
  scheduleSave: () => void;
};
```

**Usage example (generic form data)**

```tsx
const [form, setForm] = useState<{ name: string; email: string }>({
  name: "",
  email: "",
});

const { scheduleSave } = useAutoSave({
  enabled: true,
  getData: () => form,
  save: async (data) => {
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },
  debounceMs: 1500,
  idleMs: 2000,
  onStateChange: (state, error) => {
    // Integrate with a “saving…” / “saved” indicator if desired
  },
});

// Call this whenever the user changes a field
const handleChange = (next: Partial<typeof form>) => {
  setForm((prev) => ({ ...prev, ...next }));
  scheduleSave();
};
```

**Behaviour details**

- `scheduleSave()`:
  - Marks a save as pending.
  - Starts/restarts a debounce timer using `debounceMs`.
- When the timer fires, `flush` runs:
  - Optionally enforces a minimum idle period (`idleMs`) since the last change.
  - Reads the latest data from `getData()`.
  - Serialises with `JSON.stringify` and compares to the last successfully-saved snapshot.
  - If unchanged, it **skips** the write.
  - Otherwise, it calls `save(data)` with queue semantics (no overlapping saves).
- `onStateChange`:
  - `'saving'` just before the async `save` starts.
  - `'idle'` after a successful save.
  - `'error'` with an `Error` instance if the save throws.

All user-supplied callbacks (`getData`, `save`, `onStateChange`) and timing options are kept in refs, so the hook
is **stable across renders** and safe to use in effects.

---

### Tracker-specific wrapper: `useAutoSaveTrackerData`

For tracker pages, you normally work with a `GridDataSnapshot`. The wrapper keeps that type and
the existing call sites, while delegating to the generic hook.

**Signature**

```ts
import type { GridDataSnapshot } from "@/lib/tracker-data";

interface UseAutoSaveTrackerDataOptions {
  enabled: boolean;
  getData: () => GridDataSnapshot;
  save: (data: GridDataSnapshot) => Promise<void>;
  debounceMs?: number;
  idleMs?: number;
  onStateChange?: (state: AutoSaveState, error?: Error) => void;
}

function useAutoSaveTrackerData(options: UseAutoSaveTrackerDataOptions): {
  scheduleSave: () => void;
};
```

**Usage example (tracker data auto-save)**

```tsx
const { scheduleSave } = useAutoSaveTrackerData({
  enabled: allowAutoSave,
  getData: () => trackerDataRef.current?.() ?? {},
  save: async (data) => {
    await saveTrackerData({ data });
  },
  debounceMs: 2000,
  idleMs: 2000,
  onStateChange: (state, error) => {
    // Hook into nav bar “Saving…” / “Saved” / “Error” indicators
  },
});

// In your grid-change handler:
const handleGridDataChange = () => {
  if (!allowAutoSave) return;
  scheduleSave();
};
```

This keeps the tracker-specific usage ergonomic while making the auto-save mechanism itself
fully reusable across the app via `useAutoSave`.
