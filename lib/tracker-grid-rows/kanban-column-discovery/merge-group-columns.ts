import type {
  KanbanGroupColumnDescriptor,
  ResolvedOptionLike,
} from "./types";

function toOptionColumnId(o: ResolvedOptionLike): string {
  return String(o.id ?? o.value ?? o.label ?? "").trim();
}

function distinctTrimmedStrings(values: Iterable<string>): string[] {
  return Array.from(
    new Set(
      Array.from(values, (s) => String(s).trim()).filter(
        (s): s is string => s.length > 0,
      ),
    ),
  );
}

function dedupeColumnIds(
  columns: KanbanGroupColumnDescriptor[],
): KanbanGroupColumnDescriptor[] {
  const seen = new Set<string>();
  return columns.filter((g) => {
    if (seen.has(g.id)) return false;
    seen.add(g.id);
    return true;
  });
}

/**
 * Input for {@link buildKanbanGroupColumnDescriptors}.
 *
 * **Ordering contract:** resolved options win when non-empty; otherwise we merge
 * values seen in the local snapshot with values returned from the distinct-values API.
 */
export type BuildKanbanGroupColumnDescriptorsInput = {
  groupByFieldId: string;
  /** From `resolveFieldOptionsV2` — when length &gt; 0, columns mirror the option list. */
  resolvedOptions: ResolvedOptionLike[] | null | undefined;
  /** Local `gridData[gridId]` slice used for snapshot / hybrid boards. */
  rows: Array<Record<string, unknown>>;
  /** Server `SELECT DISTINCT data->>fieldKey` when the snapshot is empty (paginated). */
  serverDistinctValues: readonly string[] | null | undefined;
  /**
   * True while the distinct-values request is in flight and there is no option list
   * and no local row values yet — callers should avoid rendering a single fallback lane.
   */
  distinctValuesLoading: boolean;
};

export type BuildKanbanGroupColumnDescriptorsResult = {
  /** Empty while `discoveryPending` is true; otherwise includes Uncategorized when needed. */
  columns: KanbanGroupColumnDescriptor[];
  /**
   * True only during the loading window described on {@link BuildKanbanGroupColumnDescriptorsInput.distinctValuesLoading}.
   */
  discoveryPending: boolean;
};

const UNCATEGORIZED: KanbanGroupColumnDescriptor = {
  id: "",
  label: "Uncategorized",
};

function appendUncategorizedIfMissing(
  columns: KanbanGroupColumnDescriptor[],
): KanbanGroupColumnDescriptor[] {
  if (columns.some((g) => g.id === "")) return columns;
  return [...columns, UNCATEGORIZED];
}

/**
 * Builds the ordered list of Kanban column ids/labels (plus Uncategorized when allowed).
 *
 * This is **pure** — no I/O — so it is trivially unit-tested and safe to call from
 * any React memo or non-React service that has the same inputs.
 */
export function buildKanbanGroupColumnDescriptors(
  input: BuildKanbanGroupColumnDescriptorsInput,
): BuildKanbanGroupColumnDescriptorsResult {
  const {
    groupByFieldId,
    resolvedOptions,
    rows,
    serverDistinctValues,
    distinctValuesLoading,
  } = input;

  const opts = resolvedOptions ?? [];
  if (opts.length > 0) {
    const columns = opts.map((o) => ({
      id: toOptionColumnId(o),
      label: o.label ?? "",
    }));
    return {
      columns: dedupeColumnIds(appendUncategorizedIfMissing(columns)),
      discoveryPending: false,
    };
  }

  const fromRows = distinctTrimmedStrings(
    rows.map((r) => String((r as Record<string, unknown>)[groupByFieldId] ?? "")),
  );

  const fromServer = distinctTrimmedStrings(serverDistinctValues ?? []);

  if (distinctValuesLoading && fromRows.length === 0 && fromServer.length === 0) {
    return { columns: [], discoveryPending: true };
  }

  let columns = distinctTrimmedStrings([...fromRows, ...fromServer]).map((v) => ({
    id: v,
    label: v,
  }));

  if (columns.length === 0) {
    columns = [UNCATEGORIZED];
  } else {
    columns = appendUncategorizedIfMissing(columns);
  }

  return {
    columns: dedupeColumnIds(columns),
    discoveryPending: false,
  };
}
