/**
 * Trigger node executor.
 * Validates that the incoming event matches the trigger configuration.
 */

import type { TriggerNode, WorkflowTriggerData } from "@/lib/workflows/types";

export function executeTriggerNode(
  node: TriggerNode,
  triggerData: WorkflowTriggerData,
): void {
  if (triggerData.event !== node.config.event) {
    throw new Error(
      `Trigger event mismatch: expected ${node.config.event}, got ${triggerData.event}`,
    );
  }

  if (triggerData.trackerSchemaId !== node.config.trackerSchemaId) {
    throw new Error(
      `Tracker schema mismatch: expected ${node.config.trackerSchemaId}, got ${triggerData.trackerSchemaId}`,
    );
  }

  if (
    node.config.gridId != null &&
    node.config.gridId !== "" &&
    triggerData.gridId !== node.config.gridId
  ) {
    throw new Error(
      `Grid mismatch: expected ${node.config.gridId}, got ${triggerData.gridId}`,
    );
  }

  if (
    node.config.watchFields &&
    node.config.watchFields.length > 0 &&
    triggerData.changedFields
  ) {
    const matches = triggerData.changedFields.some((f) =>
      node.config.watchFields!.includes(f),
    );
    if (!matches) {
      throw new Error(
        `No watched fields changed in trigger event`,
      );
    }
  }
}
