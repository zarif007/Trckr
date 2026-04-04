/**
 * Public re-exports for master data binding utilities.
 */
export {
  applyMasterDataBindings,
  type MasterDataBuildResult,
} from "./bindings";

/**
 * @deprecated The chat-audit system is no longer used. Master data operations
 * are now surfaced via ToolCallEntry in the build-tracker postprocess pipeline.
 * Kept for backward compatibility with legacy persisted messages.
 */
export {
  masterDataBuildAuditSchema,
  masterDataBuildResultBodySchema,
  parseMasterDataBuildAuditFromUnknown,
  type MasterDataBindingAction,
  type MasterDataBuildAudit,
} from "./chat-audit";
