/**
 * Skeleton loader component for select field options.
 *
 * @module lib/lazy-options/components/SkeletonLoader
 *
 * This component displays animated placeholder items while option data is loading.
 * Used across all select components (SearchableSelect, MultiSelect) to provide
 * consistent loading feedback.
 *
 * ## Usage
 *
 * ```tsx
 * {isLoading && <SkeletonLoader count={5} />}
 * ```
 */

import { cn } from "@/lib/utils";
import { theme } from "@/lib/theme";
import { LAZY_OPTIONS_CONSTANTS } from "../types";

interface SkeletonLoaderProps {
  /** Number of skeleton items to display. Defaults to 5. */
  count?: number;
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * Renders animated skeleton placeholders for loading select options.
 *
 * @param count - Number of skeleton items (default: 5)
 * @param className - Additional CSS classes
 *
 * @example
 * ```tsx
 * // Default 5 items
 * <SkeletonLoader />
 *
 * // Custom count
 * <SkeletonLoader count={3} />
 *
 * // With custom spacing
 * <SkeletonLoader className="space-y-2" />
 * ```
 */
export function SkeletonLoader({
  count = LAZY_OPTIONS_CONSTANTS.SKELETON_COUNT,
  className,
}: SkeletonLoaderProps) {
  return (
    <div className={cn("space-y-1 p-1", className)}>
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className={cn("h-8 animate-pulse rounded", theme.surface.mutedSubtle)}
          aria-label="Loading option"
        />
      ))}
    </div>
  );
}
