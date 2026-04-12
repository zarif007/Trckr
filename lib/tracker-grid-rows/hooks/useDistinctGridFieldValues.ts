"use client";

import { useEffect, useState } from "react";
import { fetchGridDistinctFieldValues } from "../client";

/**
 * Parameters for {@link useDistinctGridFieldValues}.
 *
 * Generic over **any** grid row JSON key — Kanban uses `groupBy` field ids today;
 * other surfaces could reuse the same endpoint for analytics pickers, etc.
 */
export interface UseDistinctGridFieldValuesParams {
  enabled: boolean;
  trackerId: string | null | undefined;
  gridSlug: string;
  branchName: string;
  /** JSON object key on `GridRow.data` (must satisfy `assertSafeJsonPathKey`). */
  fieldKey: string | null;
  /** When true, no HTTP request is made (e.g. columns already come from resolved options). */
  skip: boolean;
}

/**
 * Fetches distinct non-empty string values for one `row.data[fieldKey]` column via
 * `GET .../distinct-field-values`. Abort-safe and resets state when `enabled` / `fieldKey` / `skip` change.
 *
 * @see `lib/tracker-grid-rows/kanban-column-discovery/README.md`
 */
export function useDistinctGridFieldValues({
  enabled,
  trackerId,
  gridSlug,
  branchName,
  fieldKey,
  skip,
}: UseDistinctGridFieldValuesParams): {
  values: string[];
  loading: boolean;
  error: string | null;
} {
  const [values, setValues] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !trackerId || !fieldKey || skip) {
      setValues([]);
      setLoading(false);
      setError(null);
      return;
    }

    const ac = new AbortController();
    setLoading(true);
    setError(null);

    void fetchGridDistinctFieldValues(
      {
        trackerId,
        gridSlug,
        branchName,
        fieldKey,
      },
      { signal: ac.signal },
    )
      .then((res) => {
        if (ac.signal.aborted) return;
        if (!res.ok) {
          setError(res.errorMessage ?? "Failed to load distinct values");
          setValues([]);
          return;
        }
        setValues(res.values);
      })
      .catch((e: unknown) => {
        if (ac.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Failed to load distinct values");
        setValues([]);
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });

    return () => ac.abort();
  }, [enabled, trackerId, gridSlug, branchName, fieldKey, skip]);

  return { values, loading, error };
}
