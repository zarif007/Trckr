/**
 * Unified hook for managing select field options with intelligent preview + lazy loading.
 *
 * @module lib/lazy-options/useUnifiedOptions
 *
 * This hook provides a single source of truth for option data, combining:
 * - Preview data (eagerly loaded with tracker for instant display)
 * - Lazy-loaded data (fetched on-demand with pagination + search)
 * - Loading states (skeleton indicators, error handling)
 *
 * ## Usage
 *
 * ```tsx
 * const { options, isLoading, search, loadMore } = useUnifiedOptions({
 *   lazyOptions: { trackerId, gridId, labelField },
 *   previewOptions: initialOptions, // Shows immediately
 *   enabled: dropdownOpen,
 * });
 * ```
 *
 * ## State Flow
 *
 * 1. Component renders with `previewOptions` → Shows immediately
 * 2. Dropdown opens (`enabled = true`) → Triggers lazy loading
 * 3. Lazy data arrives → Replaces preview with full first page
 * 4. User scrolls → `loadMore()` fetches next page
 * 5. User searches → `search(query)` fetches filtered results
 *
 * ## Edge Cases Handled
 *
 * - **Stale preview**: Preview is replaced once lazy data loads
 * - **Race conditions**: Uses React Query's deduplication + cancellation
 * - **Memory leaks**: Cleanup on unmount
 * - **Error recovery**: Exposes retry function
 * - **Empty states**: Differentiates "loading" vs "no results"
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { debounce } from "@/lib/utils/debounce";
import type {
  UseUnifiedOptionsParams,
  UnifiedOptionsResult,
  ResolvedOption,
  OptionsApiResponse,
} from "./types";
import { LAZY_OPTIONS_CONSTANTS } from "./types";

const { DEFAULT_PAGE_SIZE, SEARCH_DEBOUNCE_MS, CACHE_STALE_TIME_MS } =
  LAZY_OPTIONS_CONSTANTS;

/**
 * Deduplicates options by ID, preferring items from `preferred` array.
 * Used to merge preview + lazy data without duplicates.
 */
function deduplicateOptions(
  preferred: ResolvedOption[],
  fallback: ResolvedOption[]
): ResolvedOption[] {
  const seen = new Set<string>();
  const result: ResolvedOption[] = [];

  for (const opt of preferred) {
    if (!seen.has(opt.id)) {
      seen.add(opt.id);
      result.push(opt);
    }
  }

  for (const opt of fallback) {
    if (!seen.has(opt.id)) {
      seen.add(opt.id);
      result.push(opt);
    }
  }

  return result;
}

/**
 * Unified hook for select field options with preview + lazy loading.
 *
 * @param params - Configuration for options loading
 * @returns State and actions for managing options
 *
 * @example
 * ```tsx
 * const {
 *   options,           // Merged preview + lazy data
 *   isLoading,         // True during initial load
 *   isLoadingMore,     // True during pagination
 *   search,            // Search function
 *   loadMore,          // Load next page
 * } = useUnifiedOptions({
 *   lazyOptions: config,
 *   previewOptions: previewData,
 *   enabled: isOpen,
 * });
 * ```
 */
export function useUnifiedOptions(
  params: UseUnifiedOptionsParams
): UnifiedOptionsResult {
  const {
    lazyOptions,
    previewOptions = [],
    preSelectedValues = [],
    enabled = true,
    isLoadingPreview = false,
  } = params;

  // Pagination state
  const [offset, setOffset] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  // Accumulated pages (for infinite scroll)
  const [accumulatedOptions, setAccumulatedOptions] = useState<
    ResolvedOption[]
  >([]);

  // Determine if lazy loading should be active
  const shouldUseLazyLoading = Boolean(lazyOptions && enabled);

  // Build query key for React Query
  const queryKey = useMemo(
    () => [
      "unified-options",
      lazyOptions?.trackerId ?? "static",
      lazyOptions?.gridId ?? "static",
      lazyOptions?.labelField ?? "static",
      lazyOptions?.valueField ?? "auto",
      searchQuery,
      offset,
    ],
    [
      lazyOptions?.trackerId,
      lazyOptions?.gridId,
      lazyOptions?.labelField,
      lazyOptions?.valueField,
      searchQuery,
      offset,
    ]
  );

  // Fetch lazy data via React Query
  const {
    data: lazyData,
    isLoading: isLazyLoading,
    error: lazyError,
    refetch,
  } = useQuery<OptionsApiResponse>({
    queryKey,
    queryFn: async ({ signal }) => {
      if (!lazyOptions) {
        throw new Error("Lazy options config missing");
      }

      const url = new URL(
        `/api/trackers/${lazyOptions.trackerId}/options`,
        window.location.origin
      );

      url.searchParams.set("gridId", lazyOptions.gridId);
      url.searchParams.set("labelField", lazyOptions.labelField);

      if (lazyOptions.valueField) {
        url.searchParams.set("valueField", lazyOptions.valueField);
      }
      if (searchQuery.trim()) {
        url.searchParams.set("search", searchQuery.trim());
      }
      if (lazyOptions.branchName) {
        url.searchParams.set("branchName", lazyOptions.branchName);
      }
      if (preSelectedValues.length > 0) {
        url.searchParams.set("includeValues", preSelectedValues.join(","));
      }

      url.searchParams.set("limit", String(DEFAULT_PAGE_SIZE));
      url.searchParams.set("offset", String(offset));

      const res = await fetch(url.toString(), { signal });

      if (!res.ok) {
        throw new Error(`Failed to load options: ${res.statusText}`);
      }

      return res.json() as Promise<OptionsApiResponse>;
    },
    enabled: shouldUseLazyLoading,
    staleTime: CACHE_STALE_TIME_MS,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Accumulate pages when new data arrives
  useEffect(() => {
    if (lazyData?.items) {
      setAccumulatedOptions((prev) =>
        offset === 0 ? lazyData.items : [...prev, ...lazyData.items]
      );
    }
  }, [lazyData, offset]);

  // Reset accumulated data when search changes
  useEffect(() => {
    if (searchQuery) {
      setAccumulatedOptions([]);
    }
  }, [searchQuery]);

  // Debounced search function
  const debouncedSearch = useMemo(
    () =>
      debounce<(query: string) => void>((query: string) => {
        setSearchQuery(query);
        setOffset(0);
        setAccumulatedOptions([]);
      }, SEARCH_DEBOUNCE_MS),
    []
  );

  const search = useCallback(
    (query: string) => {
      debouncedSearch(query);
    },
    [debouncedSearch]
  );

  // Load more function (infinite scroll)
  const loadMore = useCallback(() => {
    if (lazyData?.hasMore && !isLazyLoading) {
      setOffset((prev) => prev + DEFAULT_PAGE_SIZE);
    }
  }, [lazyData?.hasMore, isLazyLoading]);

  // Reset function (clear search, return to first page)
  const reset = useCallback(() => {
    setSearchQuery("");
    setOffset(0);
    setAccumulatedOptions([]);
  }, []);

  // Retry last failed request
  const retry = useCallback(() => {
    refetch();
  }, [refetch]);

  // Compute final options (merge preview + lazy data)
  const finalOptions = useMemo(() => {
    if (!shouldUseLazyLoading) {
      // No lazy loading - use preview only
      return previewOptions;
    }

    if (accumulatedOptions.length > 0) {
      // Lazy data loaded - prefer it over preview
      return deduplicateOptions(accumulatedOptions, previewOptions);
    }

    if (isLazyLoading && offset === 0) {
      // First page loading - show preview as fallback
      return previewOptions;
    }

    // Lazy enabled but no data yet - show preview
    return previewOptions;
  }, [
    shouldUseLazyLoading,
    accumulatedOptions,
    previewOptions,
    isLazyLoading,
    offset,
  ]);

  // Compute loading states
  const isLoading =
    shouldUseLazyLoading && isLazyLoading && offset === 0 && finalOptions.length === 0;
  const isLoadingMore = shouldUseLazyLoading && isLazyLoading && offset > 0;
  const isSearching = shouldUseLazyLoading && isLazyLoading && searchQuery.length > 0;

  return {
    // State
    options: finalOptions,
    isLoading: isLoading || isLoadingPreview,
    isLoadingMore,
    isSearching,
    isLoadingPreview,
    hasMore: lazyData?.hasMore ?? false,
    total: lazyData?.total ?? finalOptions.length,
    error: lazyError as Error | null,

    // Actions
    search,
    loadMore,
    reset,
    retry,
  };
}
