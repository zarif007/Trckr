/**
 * Type definitions for lazy-loaded select field options.
 *
 * @module lib/lazy-options/types
 *
 * This module defines the core types used throughout the lazy options loading system.
 * Lazy loading enables efficient handling of large option datasets (1000+ items) by:
 * - Loading data in pages (default 50 items)
 * - Server-side search filtering
 * - Infinite scroll pagination
 * - Intelligent preview data fallback
 */

/**
 * Normalized option format used across all select components.
 * This is the canonical representation of a selectable option.
 */
export interface ResolvedOption {
  /** Unique identifier for the option (used as React key) */
  id: string;
  /** Display text shown to user */
  label: string;
  /** Actual value stored when selected (can be any type) */
  value: unknown;
  /** Flag indicating this option was deleted from source (optional) */
  _deleted?: boolean;
}

/**
 * Configuration for lazy-loading options from a tracker grid.
 * When present, triggers lazy loading behavior instead of static options.
 */
export interface LazyOptionsConfig {
  /** ID of the tracker containing the options data */
  trackerId: string;
  /** ID of the grid within the tracker */
  gridId: string;
  /** Field ID to use for option labels */
  labelField: string;
  /** Field ID to use for option values (defaults to row ID if not specified) */
  valueField?: string;
  /** Data branch name (defaults to "main") */
  branchName?: string;
}

/**
 * Response from the options API endpoint.
 * Used by useOptionsLoader to fetch paginated data.
 */
export interface OptionsApiResponse {
  /** Array of resolved options for this page */
  items: ResolvedOption[];
  /** Total count of all available options (across all pages) */
  total: number;
  /** Whether more pages are available */
  hasMore: boolean;
  /** Current offset in the result set */
  offset: number;
  /** Page size used for this request */
  limit: number;
}

/**
 * Loading state indicators for option data.
 * Helps UI components show appropriate loading indicators.
 */
export interface OptionsLoadingState {
  /** True during initial data fetch (first page, no preview) */
  isLoading: boolean;
  /** True while fetching additional pages (infinite scroll) */
  isLoadingMore: boolean;
  /** True while executing a search query */
  isSearching: boolean;
  /** True while foreign binding sources are loading (tracker-level) */
  isLoadingPreview: boolean;
}

/**
 * Complete state returned by the unified options hook.
 * Combines preview data, lazy-loaded data, and loading states.
 */
export interface OptionsState extends OptionsLoadingState {
  /** Combined options array (preview + lazy loaded, deduplicated) */
  options: ResolvedOption[];
  /** Whether more pages are available to load */
  hasMore: boolean;
  /** Total count across all pages */
  total: number;
  /** Error from last failed request (null if none) */
  error: Error | null;
}

/**
 * Actions to control option loading behavior.
 */
export interface OptionsActions {
  /** Trigger a server-side search (debounced) */
  search: (query: string) => void;
  /** Load the next page of options */
  loadMore: () => void;
  /** Reset state (clear search, return to first page) */
  reset: () => void;
  /** Retry last failed request */
  retry: () => void;
}

/**
 * Complete result from the unified options hook.
 * Combines state and actions.
 */
export type UnifiedOptionsResult = OptionsState & OptionsActions;

/**
 * Parameters for the unified options loader hook.
 */
export interface UseUnifiedOptionsParams {
  /** Lazy loading configuration (if undefined, uses static options only) */
  lazyOptions?: LazyOptionsConfig;
  /** Static/preview options (used as fallback before lazy data loads) */
  previewOptions?: ResolvedOption[];
  /** Pre-selected values that should always be included */
  preSelectedValues?: string[];
  /** Whether loading is enabled (typically tied to dropdown open state) */
  enabled?: boolean;
  /** Whether preview data is currently loading (for foreign bindings) */
  isLoadingPreview?: boolean;
}

/**
 * Constants used throughout the lazy options system.
 */
export const LAZY_OPTIONS_CONSTANTS = {
  /** Default page size for option requests */
  DEFAULT_PAGE_SIZE: 50,
  /** Debounce delay for search queries (ms) */
  SEARCH_DEBOUNCE_MS: 400,
  /** React Query cache time (ms) */
  CACHE_STALE_TIME_MS: 60000, // 1 minute
  /** Number of skeleton items to show while loading */
  SKELETON_COUNT: 5,
  /** Distance from bottom to trigger infinite scroll (px) */
  SCROLL_TRIGGER_DISTANCE_PX: 100,
  /** Maximum number of pre-selected values to fetch */
  MAX_PRESELECTED_VALUES: 100,
} as const;
