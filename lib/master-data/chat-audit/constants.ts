/**
 * Stable identifiers for “function call” rows in the builder chat UI.
 * Add new entries here when `applyMasterDataBindings` gains additional logical steps
 * that should surface under **Functions** (parallel to expression-agent tool names).
 */
export const MASTER_DATA_AUDIT_FUNCTIONS = {
  /** Compatibility lookup against existing trackers in the scoped Master Data module. */
  LOOKUP_REUSABLE: 'lookupReusableMasterData',
} as const

export type MasterDataAuditFunctionId =
  (typeof MASTER_DATA_AUDIT_FUNCTIONS)[keyof typeof MASTER_DATA_AUDIT_FUNCTIONS]
