import type { MasterDataBindingAction, MasterDataBuildAudit } from "./schema";

export function selectCreatedBindingActions(
  audit: MasterDataBuildAudit,
): MasterDataBindingAction[] {
  return audit.actions.filter((a) => a.type === "create");
}

export function masterDataAuditHasCreated(
  audit: MasterDataBuildAudit,
): boolean {
  return audit.actions.some((a) => a.type === "create");
}
