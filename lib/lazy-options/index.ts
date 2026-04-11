/**
 * Lazy loading infrastructure for select field options.
 *
 * @module lib/lazy-options
 *
 * Provides a unified system for loading options with:
 * - Preview data (eagerly loaded for instant display)
 * - Lazy pagination (50 items/page, infinite scroll)
 * - Server-side search (debounced)
 * - Skeleton loaders and error recovery
 *
 * ## Usage
 *
 * ```tsx
 * import { useUnifiedOptions, SkeletonLoader, type LazyOptionsConfig } from '@/lib/lazy-options';
 *
 * const lazyOptions: LazyOptionsConfig = {
 *   trackerId: '123',
 *   gridId: 'suppliers',
 *   labelField: 'name',
 * };
 *
 * const { options, isLoading, search, loadMore } = useUnifiedOptions({
 *   lazyOptions,
 *   previewOptions: initialData,
 *   enabled: dropdownOpen,
 * });
 * ```
 */

export * from "./types";
export * from "./useUnifiedOptions";
export * from "./components";
