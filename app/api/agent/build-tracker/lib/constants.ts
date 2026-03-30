/**
 * Token budgets and retry limits for the multi-agent build-tracker flow.
 */

/** Manager produces a plan only — small budget is sufficient */
export const MANAGER_MAX_TOKENS = 2048

/** Builder generates the full tracker schema — needs the full budget */
export const BUILDER_MAX_TOKENS = 8192

/** Max generateObject fallback attempts if builder streaming fails */
export const MAX_FALLBACK_ATTEMPTS = 3
