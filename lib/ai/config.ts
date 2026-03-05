export const DEEPSEEK_CHAT_MAX_OUTPUT = 8192
export const DEEPSEEK_MIN_OUTPUT = 1024
export const DEEPSEEK_DEFAULT_OUTPUT = DEEPSEEK_CHAT_MAX_OUTPUT

export function getDeepSeekApiKey(): string | null {
  return process.env.DEEPSEEK_API_KEY ?? null
}

export function hasDeepSeekApiKey(): boolean {
  return !!getDeepSeekApiKey()
}

export function getConfiguredMaxOutputTokens(): number {
  const raw = process.env.DEEPSEEK_MAX_OUTPUT_TOKENS
  if (!raw) return DEEPSEEK_DEFAULT_OUTPUT
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed)) return DEEPSEEK_DEFAULT_OUTPUT
  return Math.min(DEEPSEEK_CHAT_MAX_OUTPUT, Math.max(DEEPSEEK_MIN_OUTPUT, parsed))
}

