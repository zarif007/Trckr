import type { ReportIntent } from '@/lib/reports/report-schemas'

/** User wording suggests a numeric total (sum/amount/volume), not row cardinality. */
const IMPLIES_NUMERIC_TOTAL =
  /\b(?:total|volume|sum|amount|combined|rollup|quantities)\b|grand\s+total|how\s+much|quantity\s+of/i

export function userPromptImpliesNumericTotal(userQuery: string): boolean {
  return IMPLIES_NUMERIC_TOTAL.test(userQuery)
}

export function intentUsesOnlyCountAggregates(intent: ReportIntent): boolean {
  const { metrics } = intent
  if (metrics.length === 0) return false
  return metrics.every((m) => m.aggregation === 'count')
}

export function shouldRetryIntentForNumericTotalMismatch(
  userQuery: string,
  intent: ReportIntent,
): boolean {
  return userPromptImpliesNumericTotal(userQuery) && intentUsesOnlyCountAggregates(intent)
}

/** Appended on a single retry when heuristics detect count-only metrics for a numeric-total ask. */
export function reportIntentNumericTotalRetryAddendum(): string {
  return `

## Correction (required)
The user’s wording implies a **numeric total** (sum or average of a quantity, volume, money, or similar)—**not** a row count.
Re-emit the intent with **metrics** using **aggregation \`sum\`** or **\`avg\`** on the appropriate **numeric** catalog field(s) (see each field’s \`type=\`). Use **\`count\`** only if they explicitly asked how many rows/entries/records.
If they wanted to **see individual rows** across instances, use **aggregation \`none\`** and **outputStyle** \`table\` instead of collapsing to a single count.`
}
