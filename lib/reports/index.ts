export {
  type FormatterPlanV1,
  type QueryPlanV1,
  type ReportGenerationPlan,
  type ReportIntent,
  parseFormatterPlan,
  parseQueryPlan,
} from './ast-schemas'
export {
  executeReportFullGeneration,
  executeReportReplay,
  isReplayable,
  type LoadedReport,
  runReportPipeline,
} from './orchestrator'
export { applyFormatterPlan, formatOutputMarkdown, rowsToMarkdownTable } from './formatter-engine'
export {
  appendReportRunEvent,
  createReport,
  getReportForUser,
} from './report-repository'
export { encodeNdjsonLine, type ReportStreamEvent } from './stream-events'
export { buildRowValuesForReportRow, evaluateReportExprOnRow } from './report-expr'

/** @deprecated Import from `@/lib/insights-query` instead. */
export {
  buildFieldCatalog,
  compareValues,
  executeQueryPlan,
  formatCatalogForPrompt,
  buildTrackerDataWhere,
  fingerprintFromCatalog,
  resultSchemaFromRows,
  type FieldCatalog,
  type TrackerDataInput,
} from '@/lib/insights-query'

/** @deprecated Import from `@/lib/insights-query/tracker-list` instead. */
export { listTrackersForScope } from '@/lib/insights-query/tracker-list'
