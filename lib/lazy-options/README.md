# Lazy Options Loading System

A complete solution for efficient handling of large option datasets in select fields through paginated server-side loading, debounced search, and intelligent caching.

## Overview

This module solves performance and UX issues with select fields that have large datasets (1000+ options):

**Problems Solved:**
- ❌ Empty dropdowns on initial load (foreign binding data fetched after mount)
- ❌ All data loaded upfront (1000+ rows fetched unnecessarily)
- ❌ Full options rendered in DOM (no virtualization)
- ❌ Client-side only filtering (search doesn't query server)
- ❌ Poor loading feedback (no skeleton loaders)

**Solutions Provided:**
- ✅ Preview data (first 7 rows) loaded with tracker for instant display
- ✅ Lazy loading with pagination (50 items/page)
- ✅ Server-side search with debouncing (400ms)
- ✅ Infinite scroll for additional pages
- ✅ Skeleton loaders during loading states
- ✅ Intelligent caching (1-minute stale time)
- ✅ Request deduplication and cancellation
- ✅ Error recovery with retry

## Quick Start

### Basic Usage

```tsx
import { useUnifiedOptions, SkeletonLoader, ErrorState } from '@/lib/lazy-options';

function MySelect({ trackerId, gridId, labelField }) {
  const [open, setOpen] = useState(false);

  const {
    options,
    isLoading,
    error,
    search,
    loadMore,
    hasMore,
    retry,
  } = useUnifiedOptions({
    lazyOptions: { trackerId, gridId, labelField },
    enabled: open,
  });

  if (isLoading) return <SkeletonLoader />;
  if (error) return <ErrorState error={error} onRetry={retry} />;

  return (
    <select>
      {options.map(opt => (
        <option key={opt.id} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
```

### With Preview Data

```tsx
const {
  options,
  isLoading,
} = useUnifiedOptions({
  lazyOptions: { trackerId, gridId, labelField },
  previewOptions: [
    { id: '1', label: 'Option 1', value: '1' },
    { id: '2', label: 'Option 2', value: '2' },
  ], // Shows immediately, replaced when lazy data loads
  enabled: open,
});
```

### With Search

```tsx
const { options, search } = useUnifiedOptions({
  lazyOptions: { trackerId, gridId, labelField },
  enabled: open,
});

// Debounced server-side search
<input onChange={(e) => search(e.target.value)} />
```

### With Infinite Scroll

```tsx
const { options, hasMore, isLoadingMore, loadMore } = useUnifiedOptions({
  lazyOptions: { trackerId, gridId, labelField },
  enabled: open,
});

const handleScroll = (e) => {
  const { scrollTop, scrollHeight, clientHeight } = e.target;
  if (scrollHeight - scrollTop - clientHeight < 100) {
    if (hasMore && !isLoadingMore) {
      loadMore();
    }
  }
};

<div onScroll={handleScroll}>
  {options.map(renderOption)}
  {isLoadingMore && <span>Loading more...</span>}
</div>
```

## Architecture

```
┌─────────────────────────────────────────┐
│ Component (SearchableSelect/MultiSelect)│
│ - User interactions (open, search, etc) │
│ - Rendering options                      │
└───────────────┬─────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────┐
│ useUnifiedOptions Hook                    │
│ - Merges preview + lazy data              │
│ - Manages pagination state                │
│ - Debounces search queries                │
│ - Exposes unified state + actions         │
└───────────────┬───────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────┐
│ React Query (@tanstack/react-query)       │
│ - Deduplication of identical requests     │
│ - Request cancellation on unmount         │
│ - 1-minute stale time caching             │
│ - Auto-retry with exponential backoff     │
└───────────────┬───────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────┐
│ API: /api/trackers/:id/options            │
│ - Paginated queries (limit + offset)      │
│ - Server-side search (JSONB path filter)  │
│ - Pre-selected values inclusion           │
│ - Authorization checks                    │
└───────────────────────────────────────────┘
```

## Data Flow

### Initial Load

1. Component renders with `previewOptions` → Shows 7 items immediately
2. Dropdown opens (`enabled = true`) → Triggers lazy loading
3. API fetches first page (50 items) → Shows skeleton during load
4. Lazy data arrives → Replaces preview with full first page

### Search

1. User types in search box → Debounced 400ms
2. After debounce → API call with search param
3. Server filters JSONB data → Returns matching items
4. Results replace current options

### Infinite Scroll

1. User scrolls near bottom (100px threshold)
2. `loadMore()` called → Increments offset
3. API fetches next page → Shows "Loading more..."
4. New items appended to existing options

## API Reference

### `useUnifiedOptions`

Main hook for managing select field options.

```typescript
function useUnifiedOptions(params: UseUnifiedOptionsParams): UnifiedOptionsResult
```

**Parameters:**

```typescript
interface UseUnifiedOptionsParams {
  /** Lazy loading configuration (if undefined, uses static options only) */
  lazyOptions?: {
    trackerId: string;
    gridId: string;
    labelField: string;
    valueField?: string;
    branchName?: string;
  };

  /** Static/preview options (used as fallback before lazy data loads) */
  previewOptions?: ResolvedOption[];

  /** Pre-selected values that should always be included in results */
  preSelectedValues?: string[];

  /** Whether loading is enabled (typically tied to dropdown open state) */
  enabled?: boolean;

  /** Whether preview data is currently loading (for foreign bindings) */
  isLoadingPreview?: boolean;
}
```

**Returns:**

```typescript
interface UnifiedOptionsResult {
  // State
  options: ResolvedOption[];      // Merged preview + lazy data (deduplicated)
  isLoading: boolean;              // True during initial load (first page, no preview)
  isLoadingMore: boolean;          // True while fetching additional pages
  isSearching: boolean;            // True while executing search query
  isLoadingPreview: boolean;       // True while foreign binding sources loading
  hasMore: boolean;                // Whether more pages are available
  total: number;                   // Total count across all pages
  error: Error | null;             // Error from last failed request

  // Actions
  search: (query: string) => void; // Trigger server-side search (debounced)
  loadMore: () => void;            // Load next page of options
  reset: () => void;               // Clear search, return to first page
  retry: () => void;               // Retry last failed request
}
```

**ResolvedOption:**

```typescript
interface ResolvedOption {
  /** Unique identifier for the option (used as React key) */
  id: string;

  /** Display text shown to user */
  label: string;

  /** Actual value stored when selected (can be any type) */
  value: unknown;

  /** Flag indicating this option was deleted from source (optional) */
  _deleted?: boolean;
}
```

### Components

#### `<SkeletonLoader />`

Animated placeholder for loading states.

```tsx
<SkeletonLoader count={5} />
```

**Props:**
- `count?: number` - Number of skeleton items (default: 5)
- `className?: string` - Additional CSS classes

#### `<ErrorState />`

Error message with retry button.

```tsx
<ErrorState
  error={new Error("Failed to load")}
  onRetry={() => refetch()}
/>
```

**Props:**
- `error: Error` - Error object from failed request
- `onRetry: () => void` - Callback when user clicks retry
- `className?: string` - Additional CSS classes

## Constants

```typescript
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
};
```

## Edge Cases Handled

### 1. Deleted Options

When a previously selected option no longer exists in the source data:

```typescript
// API returns pre-selected values separately
const url = `/api/trackers/${trackerId}/options`;
url.searchParams.set('includeValues', preSelectedValues.join(','));

// If value not found, mark as deleted
{
  id: 'missing-id',
  label: 'Deleted Option',
  value: 'missing-id',
  _deleted: true,
}
```

**UI Treatment:**
- Show with strikethrough or warning icon
- Allow deselection but prevent re-selection
- Display "(deleted)" suffix on label

### 2. Permission Changes

When user loses access to foreign tracker:

```typescript
// API returns 403
if (!res.ok && res.status === 403) {
  // Show error: "Access denied"
  // Fallback to showing only currently selected values
  // Retry button to check permissions again
}
```

### 3. Rapid Open/Close

When dropdown is opened and closed quickly:

- React Query deduplicates identical requests
- `enabled` prop prevents fetch when dropdown closed
- AbortController cancels in-flight requests
- No memory leaks or stale updates

### 4. Multi-Select with Many Pre-Selected Values

When multi-select has 50+ selected values:

```typescript
// Pass current selection as pre-selected values
<MultiSelect
  value={[...50 selected values]}
  lazyOptions={config}
  preSelectedValues={value} // Fetched separately
/>

// API fetches them separately
const preSelectedRows = await prisma.gridRow.findMany({
  where: {
    id: { in: includeValues },
    ...baseWhere,
  },
  take: MAX_PRESELECTED_VALUES, // Hard cap at 100
});
```

**UI Treatment:**
- Show selected values at top of dropdown
- Visual separator between "Selected" and "Available"
- Selected values always visible (not paginated)

### 5. Network Failures

When API request fails:

- React Query auto-retry (3 attempts)
- Exponential backoff (1s, 2s, 4s...)
- Manual retry button in error state
- Toast notification for persistent failures
- Graceful fallback to preview data

### 6. Stale Preview Data

When preview data becomes outdated:

```typescript
const finalOptions = useMemo(() => {
  if (!shouldUseLazyLoading) {
    return previewOptions; // No lazy loading
  }

  if (accumulatedOptions.length > 0) {
    // Lazy data loaded - REPLACE preview (not merge)
    return deduplicateOptions(accumulatedOptions, previewOptions);
  }

  // Still loading - show preview as fallback
  return previewOptions;
}, [shouldUseLazyLoading, accumulatedOptions, previewOptions]);
```

## Performance Optimizations

### Caching Strategy

```typescript
// React Query configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
});
```

**Benefits:**
- Identical requests within 1 minute use cached data
- No redundant API calls when reopening dropdown
- Automatic cache invalidation after stale time

### Debouncing

```typescript
// Search debounced to 400ms
const debouncedSearch = useMemo(
  () => debounce((query: string) => {
    setSearchQuery(query);
    setOffset(0); // Reset pagination
    setAccumulatedOptions([]); // Clear accumulated pages
  }, 400),
  []
);
```

**Benefits:**
- Prevents API spam during typing
- Reduces server load
- Improves UX (fewer loading flickers)

### Pagination

```typescript
// Load 50 items per page
const DEFAULT_PAGE_SIZE = 50;

// Trigger load when 100px from bottom
const SCROLL_TRIGGER_DISTANCE_PX = 100;
```

**Benefits:**
- Fast initial load (50 items vs 1000+)
- Memory efficient (only loaded items in DOM)
- Smooth infinite scroll UX

### Database Optimization

```sql
-- Existing indexes used
CREATE INDEX idx_grid_row_tracker_grid_branch
  ON grid_row(tracker_id, grid_id, branch_name);

-- Future optimization: GIN index for JSONB search
CREATE INDEX idx_grid_row_data_gin
  ON grid_row USING GIN (data jsonb_path_ops);
```

## Testing

### Unit Tests

```bash
# Test the hook
vitest run lib/lazy-options/__tests__/useUnifiedOptions.test.ts

# Test pagination logic
# Test search debouncing
# Test option deduplication
# Test error handling
```

### Integration Tests

```bash
# Full dropdown flow
# - Open dropdown → skeleton visible
# - First page loads → options render
# - Search → filtered results
# - Scroll → next page loads
# - Select value → persists across searches
```

### Performance Tests

**Metrics to monitor:**
- API response time: <500ms for first page
- Search response: <300ms after debounce
- Smooth scrolling: 60fps with 1000+ options loaded
- Memory usage: <5MB per open dropdown

## Migration Guide

### From Static Options

**Before:**
```tsx
<SearchableSelect
  options={['Option 1', 'Option 2', ...1000 more]}
  value={value}
  onChange={setValue}
/>
```

**After:**
```tsx
<SearchableSelect
  lazyOptions={{
    trackerId: 'tracker-id',
    gridId: 'grid-id',
    labelField: 'name',
  }}
  value={value}
  onChange={setValue}
/>
```

### From useOptionsLoader (Legacy)

**Before:**
```tsx
import { useOptionsLoader } from '@/lib/hooks/useOptionsLoader';

const optionsLoader = useOptionsLoader({
  trackerId,
  gridId,
  labelField,
  enabled: open,
});

const options = optionsLoader.options;
```

**After:**
```tsx
import { useUnifiedOptions } from '@/lib/lazy-options';

const { options } = useUnifiedOptions({
  lazyOptions: { trackerId, gridId, labelField },
  enabled: open,
});
```

**Key Differences:**
- `useUnifiedOptions` handles preview data merging automatically
- Consistent API across all select components
- Better TypeScript support
- Comprehensive error handling

## Troubleshooting

### Empty Dropdown

**Symptom:** Dropdown shows "No data" even though data exists.

**Possible Causes:**
1. `lazyOptions` not provided or invalid
2. `enabled` is false (dropdown not open)
3. API endpoint returning empty array
4. Authorization failure (403)

**Solution:**
```tsx
// Check lazyOptions config
console.log('lazyOptions:', lazyOptions);

// Check enabled state
console.log('enabled:', enabled, 'open:', open);

// Check API response
const { error } = useUnifiedOptions({ ... });
console.log('error:', error);
```

### Infinite Loading

**Symptom:** Skeleton loader shows indefinitely.

**Possible Causes:**
1. API request hanging
2. React Query not configured correctly
3. Network timeout

**Solution:**
```tsx
// Add timeout to React Query
useQuery({
  queryKey,
  queryFn,
  staleTime: 60000,
  retry: 3,
  retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
  // Add timeout
  networkMode: 'always',
});
```

### Search Not Working

**Symptom:** Typing in search box doesn't filter options.

**Possible Causes:**
1. Using client-side filter instead of `search()` function
2. Debounce not triggering
3. API not implementing search param

**Solution:**
```tsx
// Use the search function from hook
const { search } = useUnifiedOptions({ ... });

// Call it on input change
<input onChange={(e) => search(e.target.value)} />

// NOT this (client-side only):
const filtered = options.filter(opt =>
  opt.label.includes(searchQuery)
);
```

## Related Files

- `/app/api/trackers/[id]/options/route.ts` - API endpoint
- `/components/ui/select.tsx` - SearchableSelect implementation
- `/components/ui/multi-select.tsx` - MultiSelect implementation
- `/lib/hooks/useOptionsLoader.ts` - Legacy hook (deprecated)

## License

Internal Trckr project code.
