export function getTrackerDisplayName(
  name: string | null,
  isList: boolean,
): string {
  if (!name) return isList ? "Untitled list" : "Untitled tracker";
  if (isList && name.endsWith(".list")) return name.slice(0, -5);
  return name;
}
