/**
 * Token budgets and retry limits for the multi-agent build-tracker flow.
 */

import { DEEPSEEK_CHAT_MAX_OUTPUT } from "@/lib/ai/config";

/** Default manager plan budget */
export const MANAGER_MAX_TOKENS = 4096;

/** When the user message + conversation context is very long, allow a larger manager output */
export const MANAGER_MAX_TOKENS_LARGE_CONTEXT = DEEPSEEK_CHAT_MAX_OUTPUT;

/**
 * Builder structured output must stay within the DeepSeek Chat API max_tokens cap [1, 8192].
 */
export const BUILDER_MAX_TOKENS = DEEPSEEK_CHAT_MAX_OUTPUT;

/** Max generateObject fallback attempts if builder streaming fails */
export const MAX_FALLBACK_ATTEMPTS = 4;

/** After postprocess throws, re-run the builder with repair instructions (0 = no repair passes) */
export const MAX_POSTPROCESS_REPAIR_ATTEMPTS = 2;

/** Use skeleton + patch phased builder when the plan is this large or the query is very long */
export const PHASED_BUILDER_MIN_TODO_ITEMS = 10;

export const PHASED_BUILDER_MIN_QUERY_CHARS = 2400;

/** Max characters of draft tracker JSON injected into repair prompts (approximate token control). */
export const REPAIR_TRACKER_EXCERPT_MAX_CHARS = 14_000;

/**
 * Clamps builder `maxOutputTokens` to the configured provider cap (DeepSeek Chat: [1, 8192]).
 */
export function clampBuilderMaxOutputTokens(requested?: number): number {
  const cap = BUILDER_MAX_TOKENS;
  const raw = requested ?? cap;
  const n = Number.isFinite(raw) ? Math.floor(raw as number) : cap;
  return Math.min(cap, Math.max(1, n));
}
