/**
 * Constants for the generate-tracker API.
 * Tune token limits and retry behavior here.
 */

/** DeepSeek Chat max output; requesting more can cause truncation and invalid JSON */
export const DEEPSEEK_CHAT_MAX_OUTPUT = 8192

export const DEFAULT_MAX_OUTPUT_TOKENS = DEEPSEEK_CHAT_MAX_OUTPUT

/** Resolved max output tokens (env override clamped to model limit) */
export function getMaxOutputTokens(): number {
  const env = process.env.DEEPSEEK_MAX_OUTPUT_TOKENS
  if (!env) return DEFAULT_MAX_OUTPUT_TOKENS
  const parsed = parseInt(env, 10) || DEFAULT_MAX_OUTPUT_TOKENS
  return Math.min(DEEPSEEK_CHAT_MAX_OUTPUT, Math.max(1024, parsed))
}

export const MAX_FALLBACK_ATTEMPTS = 3

/** How many recent user/assistant message pairs to include in context */
export const MAX_CONTEXT_MESSAGES_PER_ROLE = 2
