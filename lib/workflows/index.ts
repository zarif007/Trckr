/**
 * Workflow system public API.
 * Automated actions triggered by tracker data changes.
 */

// Core types
export type {
  WorkflowSchema,
  WorkflowNode,
  WorkflowEdge,
  WorkflowTriggerData,
  WorkflowExecutionContext,
  TriggerNode,
  ConditionNode,
  MapFieldsNode,
  ActionNode,
} from "./types";

// Zod schemas for validation
export { workflowSchemaZod, type WorkflowSchemaZod } from "./schema";

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
  type ValidationError,
} from "./validation";

// Execution engine
export {
  executeWorkflow,
  dispatchTrackerEventAfterSave,
  type WorkflowExecutionResult,
} from "./execution";
