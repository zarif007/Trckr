/**
 * Workflow system public API.
 * Automated actions triggered by tracker data changes.
 */

// Core types
export type {
  WorkflowSchema,
  WorkflowSchemaV1,
  WorkflowSchemaV2,
  WorkflowNode,
  WorkflowEdge,
  WorkflowTriggerData,
  WorkflowExecutionContext,
  WorkflowInlineEffects,
  TriggerNode,
  ConditionNode,
  MapFieldsNode,
  ActionNode,
  RedirectNode,
} from "./types";
export { isWorkflowSchemaV2 } from "./types";

// Zod schemas for validation
export {
  workflowSchemaZod,
  workflowSchemaV1Zod,
  workflowSchemaV2Zod,
  workflowSchemaV2OnlyZod,
  type WorkflowSchemaZod,
} from "./schema";

// Metadata extraction
export {
  extractTrackerMetadata,
  extractTrackersFromProject,
  flattenTrackerFields,
  type FieldMetadata,
  type GridMetadata,
  type TrackerMetadata,
} from "./metadata";

// Validation
export {
  validateWorkflowSchema,
  validateWorkflowSchemaFull,
  normalizeWorkflowEdges,
  type ValidationError,
  type WorkflowValidationResult,
} from "./validation";

// Primary grid (V2)
export { getPrimaryGridSlug } from "./resolve-primary-grid";

// Snapshots for API dispatch
export { loadTrackerSnapshotGrids } from "./tracker-snapshot";

// Registries (palette + extension catalog)
export {
  listTriggerDefinitions,
  getTriggerDefinition,
  listActionDefinitions,
  getActionDefinition,
  allowAllScopePolicy,
  setWorkflowScopePolicy,
  getWorkflowScopePolicy,
  canExecuteWorkflowScoped,
  type TriggerDefinition,
  type ActionDefinition,
  type WorkflowScopePolicy,
  type ScopePolicyContext,
} from "./registries";

// Execution engine
export {
  executeWorkflow,
  executeWorkflowHybrid,
  dispatchTrackerEventAfterSave,
  DEFAULT_WORKFLOW_INLINE_TIMEOUT_MS,
  type WorkflowExecutionResult,
  type WorkflowExecutionHooks,
  type DispatchOrchestrationOptions,
  type DispatchOrchestrationResult,
  type ScheduleBackgroundWork,
} from "./execution";
