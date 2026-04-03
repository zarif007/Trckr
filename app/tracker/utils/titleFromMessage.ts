/**
 * First n words of text for use as conversation title.
 * Returns 'New chat' if empty or no words.
 */
export function firstWords(text: string, n = 5): string {
  const trimmed = text.trim();
  if (!trimmed) return "New chat";
  const words = trimmed.split(/\s+/).filter(Boolean).slice(0, n);
  if (words.length === 0) return "New chat";
  return words.join(" ");
}

/** For tab display: use actual title, or 'New chat' when null or legacy "Chat N". */
export function conversationDisplayTitle(title: string | null): string {
  if (title == null || title === "") return "New chat";
  if (/^Chat \d+$/.test(title)) return "New chat";
  return title;
}
