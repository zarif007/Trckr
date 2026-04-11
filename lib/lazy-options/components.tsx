/**
 * Shared UI components for lazy loading select fields.
 *
 * @module lib/lazy-options/components
 *
 * Provides reusable loading and error state components used by
 * SearchableSelect and MultiSelect when fetching paginated options.
 */

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LAZY_OPTIONS_CONSTANTS } from "./types";

const { SKELETON_COUNT } = LAZY_OPTIONS_CONSTANTS;

/**
 * Skeleton loader for select dropdown while first page loads.
 *
 * Shows animated placeholder items to indicate loading state.
 * Count matches the expected first page size for visual consistency.
 *
 * @example
 * ```tsx
 * {isLoading ? <SkeletonLoader /> : <OptionsList />}
 * ```
 */
export function SkeletonLoader() {
  return (
    <div className="space-y-1 p-1">
      {[...Array(SKELETON_COUNT)].map((_, i) => (
        <div
          key={i}
          className="h-8 bg-muted/50 animate-pulse rounded"
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

/**
 * Error state display with retry action.
 *
 * Shows when lazy loading fails (network error, 403, 500, etc.).
 * Provides retry button to attempt the request again.
 *
 * @param error - The error object from the failed request
 * @param onRetry - Callback to retry the failed request
 *
 * @example
 * ```tsx
 * {error ? <ErrorState error={error} onRetry={retry} /> : <OptionsList />}
 * ```
 */
export function ErrorState({
  error,
  onRetry,
}: {
  error: Error;
  onRetry: () => void;
}) {
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-start gap-3 text-destructive">
        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium">Failed to load options</p>
          <p className="text-xs text-muted-foreground">{error.message}</p>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onRetry}
        className="w-full"
      >
        Retry
      </Button>
    </div>
  );
}
