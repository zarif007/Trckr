import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { debounce } from "@/lib/utils/debounce";
import type {
  ResolvedOption,
  OptionsResponse,
} from "@/app/api/trackers/[id]/options/route";

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 400;

export interface UseOptionsLoaderParams {
  trackerId: string;
  gridId: string;
  labelField: string;
  valueField?: string;
  branchName?: string;
  enabled?: boolean;
  preSelectedValues?: string[];
}

export interface UseOptionsLoaderResult {
  options: ResolvedOption[];
  isLoading: boolean;
  isLoadingMore: boolean;
  isSearching: boolean;
  hasMore: boolean;
  total: number;
  search: (query: string) => void;
  loadMore: () => void;
  reset: () => void;
  error: Error | null;
}

export function useOptionsLoader(
  params: UseOptionsLoaderParams
): UseOptionsLoaderResult {
  const [searchQuery, setSearchQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [accumulatedOptions, setAccumulatedOptions] = useState<
    ResolvedOption[]
  >([]);

  const queryKey = useMemo(
    () => [
      "options",
      params.trackerId,
      params.gridId,
      params.labelField,
      params.valueField,
      searchQuery,
      offset,
    ],
    [
      params.trackerId,
      params.gridId,
      params.labelField,
      params.valueField,
      searchQuery,
      offset,
    ]
  );

  const { data, isLoading, error, refetch } = useQuery<OptionsResponse>({
    queryKey,
    queryFn: async ({ signal }) => {
      const url = new URL(
        `/api/trackers/${params.trackerId}/options`,
        window.location.origin
      );
      url.searchParams.set("gridId", params.gridId);
      url.searchParams.set("labelField", params.labelField);
      if (params.valueField) {
        url.searchParams.set("valueField", params.valueField);
      }
      if (searchQuery.trim()) {
        url.searchParams.set("search", searchQuery.trim());
      }
      url.searchParams.set("limit", String(PAGE_SIZE));
      url.searchParams.set("offset", String(offset));
      if (params.branchName) {
        url.searchParams.set("branchName", params.branchName);
      }
      if (params.preSelectedValues && params.preSelectedValues.length > 0) {
        url.searchParams.set(
          "includeValues",
          params.preSelectedValues.join(",")
        );
      }

      const res = await fetch(url.toString(), { signal });
      if (!res.ok) {
        throw new Error(`Failed to load options: ${res.statusText}`);
      }
      return res.json() as Promise<OptionsResponse>;
    },
    enabled: params.enabled !== false,
    staleTime: 60000,
    retry: 3,
  });

  useEffect(() => {
    if (data?.items) {
      setAccumulatedOptions((prev) =>
        offset === 0 ? data.items : [...prev, ...data.items]
      );
    }
  }, [data, offset]);

  const debouncedSearch = useMemo(
    () =>
      debounce((query: string) => {
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

  const loadMore = useCallback(() => {
    if (data?.hasMore && !isLoading) {
      setOffset((prev) => prev + PAGE_SIZE);
    }
  }, [data?.hasMore, isLoading]);

  const reset = useCallback(() => {
    setSearchQuery("");
    setOffset(0);
    setAccumulatedOptions([]);
    refetch();
  }, [refetch]);

  return {
    options: accumulatedOptions,
    isLoading: isLoading && offset === 0,
    isLoadingMore: isLoading && offset > 0,
    isSearching: isLoading && searchQuery.length > 0,
    hasMore: data?.hasMore ?? false,
    total: data?.total ?? 0,
    search,
    loadMore,
    reset,
    error: error as Error | null,
  };
}
