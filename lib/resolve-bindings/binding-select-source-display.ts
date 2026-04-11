/**
 * Select binding source display state (loading + label for empty UI).
 *
 * Pure helpers used by tracker grids so bound select/multiselect fields show a
 * dropdown loading skeleton until option rows are available—whether the source
 * is another tracker (foreign snapshot) or another grid on the same tracker
 * (local snapshot slice).
 *
 * @module resolve-bindings/binding-select-source-display
 */

import { isSelfBinding } from "@/lib/binding/self-bindings";
import type { GridData } from "./grid-data";

/** Minimal foreign schema slice needed to resolve options grid display name. */
export type ForeignBindingSchemaSliceForDisplay = {
  grids: ReadonlyArray<{ id: string; name?: string }>;
};

/**
 * Inputs for {@link resolveBindingSelectSourceDisplay}.
 * Callers supply schema lookups as functions so this module stays free of
 * `Map` vs array shapes from the app layer.
 */
export type BindingSelectSourceDisplayInput = {
  /** `binding.optionsSourceSchemaId` (trimmed by caller or here). */
  optionsSourceSchemaId?: string | null;
  /** Normalized options grid id (e.g. from `normalizeOptionsGridId`). */
  optionsGridId: string | null | undefined;
  /** Current tracker schema id; required for self-binding vs foreign detection. */
  currentTrackerSchemaId?: string | null;
  /**
   * Merged grid snapshot for the **current** tracker (same shape as `resolveOptionsFromBinding`).
   * A grid id that exists in schema but is missing as an own key here is treated as “not hydrated yet”.
   */
  localGridData: GridData;
  /** Whether `optionsGridId` exists on the current tracker’s grid list. */
  isGridInLocalSchema: (gridId: string) => boolean;
  /** Human-readable grid name from local schema; `undefined` if unknown. */
  getLocalOptionsGridDisplayName: (gridId: string) => string | undefined;
  /** Per foreign schema id → grid id → rows (from `useForeignBindingSources`). */
  foreignGridDataBySchemaId?: Record<string, GridData> | null;
  /** Per foreign schema id → schema slice including `grids` (for display names). */
  foreignSchemaBySchemaId?:
    | Record<string, ForeignBindingSchemaSliceForDisplay>
    | null;
};

/**
 * Resolved UI state for one bound select’s options source.
 */
export type BindingSelectSourceDisplay = {
  /**
   * When true, options are read from `foreignGridDataBySchemaId[sourceId]`
   * (not from `localGridData` alone). Mirrors `getOptionsGridRowsForBinding`.
   */
  usesForeignBindingSnapshot: boolean;
  /**
   * True while the select should show the **dropdown-only** loading skeleton:
   * foreign snapshot not yet present, or local snapshot missing the options grid key.
   */
  isLoadingOptions: boolean;
  /**
   * Label for “from table …” empty copy. `undefined` while {@link isLoadingOptions}
   * so the UI does not flash raw grid ids.
   */
  optionsGridDisplayName: string | undefined;
};

/**
 * True if `gridData` has an own-property entry for this grid id (hydrated slice),
 * including an empty row array.
 */
export function localGridSnapshotHasGridSlice(
  gridData: GridData,
  gridId: string,
): boolean {
  return Object.prototype.hasOwnProperty.call(gridData, gridId);
}

/**
 * Whether option rows for this binding come from another tracker’s in-memory snapshot.
 *
 * @see collectOptionsSourceSchemaIds — same self vs foreign distinction.
 */
export function usesForeignBindingOptionsSnapshot(
  optionsSourceSchemaId: string | undefined | null,
  currentTrackerSchemaId: string | null | undefined,
): boolean {
  const sid = optionsSourceSchemaId?.trim();
  return Boolean(sid && !isSelfBinding(sid, currentTrackerSchemaId ?? null));
}

/**
 * Resolves loading flag and display name for a single field’s binding-driven options source.
 * O(1); safe to call inside per-field loops / `useMemo`.
 */
export function resolveBindingSelectSourceDisplay(
  input: BindingSelectSourceDisplayInput,
): BindingSelectSourceDisplay {
  const optionsGridId = input.optionsGridId?.trim() || null;
  if (!optionsGridId) {
    return {
      usesForeignBindingSnapshot: false,
      isLoadingOptions: false,
      optionsGridDisplayName: undefined,
    };
  }

  const currentTrackerId = input.currentTrackerSchemaId ?? null;
  const sourceId = input.optionsSourceSchemaId?.trim() || "";
  const usesForeignBindingSnapshot = usesForeignBindingOptionsSnapshot(
    sourceId || undefined,
    currentTrackerId,
  );

  const isForeignBindingSourceLoading =
    usesForeignBindingSnapshot &&
    !Boolean(input.foreignGridDataBySchemaId?.[sourceId]);

  const gridKnown = input.isGridInLocalSchema(optionsGridId);
  const isLocalOptionsGridSliceMissing =
    !usesForeignBindingSnapshot &&
    gridKnown &&
    !localGridSnapshotHasGridSlice(input.localGridData, optionsGridId);

  const isLoadingOptions =
    isForeignBindingSourceLoading || isLocalOptionsGridSliceMissing;

  if (isLoadingOptions) {
    return {
      usesForeignBindingSnapshot,
      isLoadingOptions: true,
      optionsGridDisplayName: undefined,
    };
  }

  if (usesForeignBindingSnapshot) {
    const slice = input.foreignSchemaBySchemaId?.[sourceId];
    const g = slice?.grids.find((gr) => gr.id === optionsGridId);
    return {
      usesForeignBindingSnapshot,
      isLoadingOptions: false,
      optionsGridDisplayName: g?.name ?? optionsGridId,
    };
  }

  const localName = input.getLocalOptionsGridDisplayName(optionsGridId);
  return {
    usesForeignBindingSnapshot,
    isLoadingOptions: false,
    optionsGridDisplayName: localName ?? optionsGridId,
  };
}
