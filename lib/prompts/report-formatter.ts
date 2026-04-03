import { formatGenerationPlanForPrompt, type ReportGenerationPlan } from '@/lib/reports/ast-schemas'

export function getReportFormatterSystemPrompt(): string {
 return `You output a formatter plan (version 1): **data presentation only**—transform ops, no commentary, no assumptions spelled out for the reader.

The final markdown is **tables and/or compact KPI lines**, not objectives, notes, or narrative analysis.

Top-level fields:
- **outputStyle:** markdown_table for tabular data; markdown_summary only when the result is effectively one aggregate row; avoid "both" unless the user explicitly wanted a tiny KPI block plus a detail table.
- **segmentMarkdownTablesByColumn:** optional. Set to \`__gridId\` when multiple grids should appear as **separate tables** (one heading per grid). Set to \`__label\` **only** when **generationPlan.instancePolicy** is \`per_instance_breakdown\` or the user explicitly asked for one table per instance. Omit for a single combined table.
- **ops:** ordered transforms.

Ops:
- drop_columns: remove internal keys the user did not ask for (\`__dataId\`, \`__rowIndex\`, \`__branchName\`, etc.). Prefer dropping \`__label\` / \`__dataId\` unless instancePolicy is \`per_instance_breakdown\` or \`filter_specific_instance\` (or the user explicitly wanted instance columns). Prefer **catalog field ids** for visible columns.
- filter, sort, rename, limit, group_by, compute_column: as before.
- Use **rename** for clear column headers.

Do **not** add prose that explains caveats, objectives, or methodology.`
}

export function buildReportFormatterUserPrompt(params: {
 intentSummary: string
 userQuery: string
 columns: { key: string; sampleTypes: string }[]
 sampleRowsJson: string
 generationPlan?: ReportGenerationPlan
}): string {
 const cols = params.columns.map((c) => `- ${c.key} (${c.sampleTypes})`).join('\n')
 return `## User request
${params.userQuery}

## Technical summary (internal)
${params.intentSummary}

## Data layout plan (internal — implement; do not repeat as prose in output)
${formatGenerationPlanForPrompt(params.generationPlan)}

## Result columns
${cols || '(none)'}

## Sample rows (JSON, truncated)
${params.sampleRowsJson}`
}
