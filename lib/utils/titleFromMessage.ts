/**
 * First n words of text for use as conversation title.
 * Returns 'New chat' if empty or no words.
 */
export function firstWords(text: string, n = 5): string {
  const trimmed = text.trim()
  if (!trimmed) return 'New chat'
  const words = trimmed.split(/\s+/).filter(Boolean).slice(0, n)
  if (words.length === 0) return 'New chat'
  return words.join(' ')
}

/** Whether the stored title is legacy (null or "Chat N") and we should derive from first message. */
export function isLegacyConversationTitle(title: string | null): boolean {
  if (title == null || title === '') return true
  return /^Chat \d+$/.test(title)
}
