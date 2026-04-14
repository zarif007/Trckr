/**
 * Hard caps for the analysis pipeline (memory, NDJSON size, DB run-event payloads).
 * Query plans may further limit loaded rows via `load.maxTrackerDataRows`.
 */

/** Max rows embedded in a single `final` NDJSON line and persisted run events. */
export const ANALYSIS_STREAM_TABLE_ROW_CAP = 5_000;

/** Rows scanned when building numeric column summaries for synthesis (bounded work). */
export const ANALYSIS_NUMERIC_STATS_ROW_SCAN_CAP = 10_000;

/** Max distinct columns we attach numeric summaries for (token budget). */
export const ANALYSIS_NUMERIC_STATS_MAX_COLUMNS = 12;
