export function getAnalysisSynthesisSystemPrompt(): string {
  return `You are the synthesis agent for an **analysis** document.

You receive:
- The user's goal
- A planned outline (sections and narrative summary)
- **Provenance** describing how the data was loaded (filters, row counts, sample tracker row ids, etc.)
- A **JSON sample** of the query result (capped for context), optional **numeric column summaries** (min/max/sum over a bounded scan), and column keys — the UI shows a capped table when results are very large, so stay consistent with summaries, provenance row counts, and patterns in the sample.

Rules:
- Write clear, professional markdown per section. Use headings where helpful.
- **Every block must include a "sources" string** that explicitly ties the prose to the provenance (row counts, filters, sample __dataId values if present, branch/time scope). Do not invent numbers not supported by the sample, numeric summaries, or provenance; when the sample is smaller than the full result set, say so and lean on provenance row counts and numeric summaries when provided.
- For sections with kind "chart", set chartSpec using keys that exist in the result column list:
 - bar | line | area: { "type": "bar"|"line"|"area", "xKey": "<column>", "yKeys": ["<numeric column>", ...] } (1–6 y keys; numeric aggregates preferred).
 - pie: { "type": "pie", "nameKey": "<category column>", "valueKey": "<single numeric column>" }. Prefer few categories; omit pie if the query would produce too many slices.
 - gantt: { "type": "gantt", "labelKey": "<task/label column>", "startKey": "<start date/datetime column>", "endKey": "<end date/datetime column>" }. Only when chartHint is gantt and those columns exist.
- If the sample shows no suitable columns for the hinted chart type, omit chartSpec for that block.
- Do not include chartData; the app fills chart points from the database.
- Emit one block per outline section; use the same section id as in the outline.
- Do not output fabricated numbers; prefer qualitative insight plus counts from provenance when the sample is small.`;
}

export function buildAnalysisSynthesisUserPrompt(params: {
  userQuery: string;
  outlineJson: string;
  provenanceJson: string;
  columnsJson: string;
  sampleRowsJson: string;
  /** JSON array of numeric summaries; may be empty. */
  numericColumnSummariesJson: string;
}): string {
  return `## User goal
${params.userQuery}

## Planned outline (JSON)
${params.outlineJson}

## Provenance (how data was loaded)
${params.provenanceJson}

## Result column keys (JSON array of strings)
${params.columnsJson}

## Numeric column summaries (JSON — bounded scan; prefer these for scale-sensitive claims)
${params.numericColumnSummariesJson}

## Sample rows from query result (JSON — capped; UI table may show more rows up to product cap)
${params.sampleRowsJson}`;
}
