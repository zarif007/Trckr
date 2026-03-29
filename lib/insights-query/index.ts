/**
 * Public API for tracker-backed query planning and execution (reports + analyses).
 * Prefer importing from this barrel for new code.
 */
export {
  evalComputeExpression,
  getAtPath,
  toNumeric,
} from './compute-expr'
export { buildFieldCatalog, formatCatalogForPrompt, type FieldCatalog, type FieldCatalogEntry } from './field-catalog'
export { fingerprintFromCatalog } from './fingerprint'
export { needsMultiFairPoolForAggregates } from './multi-load-policy'
export {
  buildTrackerDataWhere,
  compareValues,
  executeQueryPlan,
  resolveRowTimeRange,
  resultSchemaFromRows,
  type TrackerDataInput,
} from './query-executor'
export {
  aggregateMetricSchema,
  comparisonOpSchema,
  type AggregateMetric,
  type ComparisonOp,
  type FormatterComputeExpression,
  type FormatterOp,
  type FormatterPlanV1,
  type FormatterValueRef,
  type QueryPlanV1,
  formatterComputeExpressionSchema,
  formatterPlanV1Schema,
  formatterValueRefSchema,
  parseFormatterPlan,
  parseQueryPlan,
  queryPlanV1Schema,
  rowTimeFilterSchema,
  structuredJsonValueSchema,
  timePresetSchema,
} from './schemas'
