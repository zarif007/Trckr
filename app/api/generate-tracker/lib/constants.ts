/**
 * Constants for the generate-tracker API.
 * Tune token limits and retry behavior here.
 */
import { DEEPSEEK_CHAT_MAX_OUTPUT, getConfiguredMaxOutputTokens } from '@/lib/ai'

/** DeepSeek Chat max output; requesting more can cause truncation and invalid JSON */
export const DEFAULT_MAX_OUTPUT_TOKENS = DEEPSEEK_CHAT_MAX_OUTPUT

/** Resolved max output tokens (env override clamped to model limit) */
export function getMaxOutputTokens(): number {
  return getConfiguredMaxOutputTokens()
}

export const MAX_FALLBACK_ATTEMPTS = 3

/** How many recent user/assistant message pairs to include in context */
export const MAX_CONTEXT_MESSAGES_PER_ROLE = 2
