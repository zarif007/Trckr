/**
 * Error state component for select field option loading failures.
 *
 * @module lib/lazy-options/components/ErrorState
 *
 * This component displays a consistent error message and retry button when
 * option data fails to load. Used across all select components to provide
 * unified error handling UX.
 *
 * ## Usage
 *
 * ```tsx
 * {error && <ErrorState error={error} onRetry={retry} />}
 * ```
 */

import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  /** Error object from failed request */
  error: Error;
  /** Callback to retry the failed request */
  onRetry: () => void;
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * Renders an error message with retry button for failed option loading.
 *
 * @param error - The error that occurred
 * @param onRetry - Function to call when user clicks retry
 * @param className - Additional CSS classes
 *
 * @example
 * ```tsx
 * <ErrorState
 *   error={new Error("Failed to load")}
 *   onRetry={() => refetch()}
 * />
 * ```
 */
export function ErrorState({ error, onRetry, className }: ErrorStateProps) {
  return (
    <div className={cn("p-3 space-y-2", className)}>
      <div className="flex items-center gap-2 text-destructive text-sm">
        <AlertCircle className="size-4 shrink-0" />
        <span>Failed to load options</span>
      </div>
      {error.message && (
        <p className="text-xs text-muted-foreground">{error.message}</p>
      )}
      <button
        onClick={onRetry}
        className="text-xs underline text-muted-foreground hover:text-foreground transition-colors"
        type="button"
      >
        Retry
      </button>
    </div>
  );
}
