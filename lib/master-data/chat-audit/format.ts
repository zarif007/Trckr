import type { MasterDataBindingAction } from "./schema";

/**
 * Human-readable line for one binding action in the **Functions** expandable
 * (mirrors how tool rows show field path + intent).
 */
export function formatBindingActionSummary(
  action: MasterDataBindingAction,
): string {
  const keyPart = action.key ? `key: ${action.key}` : `name: ${action.name}`;
  if (action.type === "reuse") {
    return `${keyPart} → reused "${action.name}"`;
  }
  return `${keyPart} → created new tracker`;
}
