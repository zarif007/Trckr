import { evalComputeExpression, getAtPath, toNumeric } from '@/lib/insights-query/compute-expr'
import { compareValues } from '@/lib/insights-query/query-executor'

import type { ComparisonOp, FormatterOp, FormatterPlanV1 } from './ast-schemas'

function cloneRow(r: Record<string, unknown>): Record<string, unknown> {
 return { ...r }
}

function applyGroupBy(
 rows: Record<string, unknown>[],
 keys: string[],
 metrics: Extract<FormatterOp, { op: 'group_by' }>['metrics'],
): Record<string, unknown>[] {
 const map = new Map<string, Record<string, unknown>[]>()
 for (const row of rows) {
 const key = keys.map((k) => String(getAtPath(row, k) ?? '')).join('\0')
 const list = map.get(key) ?? []
 list.push(row)
 map.set(key, list)
 }

 const out: Record<string, unknown>[] = []
 for (const [, groupRows] of map) {
 const first = groupRows[0]!
 const rec: Record<string, unknown> = {}
 for (const k of keys) {
 rec[k] = getAtPath(first, k)
 }
 for (const m of metrics) {
 if (m.op === 'count') {
 rec[m.name] = groupRows.length
 continue
 }
 const nums = groupRows
 .map((r) => {
 if (m.expression != null) {
 return evalComputeExpression(r, m.expression)
 }
 if (m.path != null && m.path !== '') {
 return toNumeric(getAtPath(r, m.path))
 }
 return null
 })
 .filter((n): n is number => n !== null)
 if (m.op === 'sum') {
 rec[m.name] = nums.reduce((a, b) => a + b, 0)
 } else if (m.op === 'avg') {
 rec[m.name] = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null
 } else if (m.op === 'min') {
 rec[m.name] = nums.length ? Math.min(...nums) : null
 } else if (m.op === 'max') {
 rec[m.name] = nums.length ? Math.max(...nums) : null
 }
 }
 out.push(rec)
 }
 return out
}

/**
 * Apply declarative formatter ops. Does not mutate input rows.
 */
export function applyFormatterPlan(
 rows: Record<string, unknown>[],
 plan: FormatterPlanV1,
): Record<string, unknown>[] {
 let cur = rows.map(cloneRow)

 for (const op of plan.ops) {
 switch (op.op) {
 case 'drop_columns':
 cur = cur.map((r) => {
 const next = { ...r }
 for (const c of op.columns) {
 delete next[c]
 }
 return next
 })
 break
 case 'filter':
 cur = cur.filter((r) =>
 compareValues(getAtPath(r, op.path), op.cmp as ComparisonOp, op.value),
 )
 break
 case 'sort': {
 const dir = op.direction === 'asc' ? 1 : -1
 cur = [...cur].sort((a, b) => {
 const av = getAtPath(a, op.path)
 const bv = getAtPath(b, op.path)
 if (av === bv) return 0
 if (av === undefined || av === null) return 1
 if (bv === undefined || bv === null) return -1
 if (typeof av === 'number' && typeof bv === 'number') {
 return av < bv ? -dir : dir
 }
 return String(av).localeCompare(String(bv)) * dir
 })
 break
 }
 case 'rename':
 cur = cur.map((r) => {
 const next: Record<string, unknown> = {}
 for (const [k, v] of Object.entries(r)) {
 next[op.map[k] ?? k] = v
 }
 return next
 })
 break
 case 'limit':
 cur = cur.slice(0, op.n)
 break
 case 'group_by':
 cur = applyGroupBy(cur, op.keys, op.metrics)
 break
 case 'compute_column':
 cur = cur.map((r) => {
 const next = { ...r }
 next[op.name] = evalComputeExpression(r, op.expression)
 return next
 })
 break
 default:
 break
 }
 }

 return cur
}

function escapeCell(v: unknown): string {
 const s = v === null || v === undefined ? '' : String(v)
 return s.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')
}

function rowsToSegmentedMarkdownTables(
 rows: Record<string, unknown>[],
 segmentBy: string,
): string {
 const order: string[] = []
 const map = new Map<string, Record<string, unknown>[]>()
 for (const r of rows) {
 const key = String(getAtPath(r, segmentBy) ?? '')
 if (!map.has(key)) {
 order.push(key)
 map.set(key, [])
 }
 map.get(key)!.push(r)
 }
 if (order.length <= 1) {
 return rowsToMarkdownTable(rows)
 }
 return order
 .map((k) => {
 const label = k.trim() === '' ? '(empty)' : escapeCell(k)
 return `### ${label}\n\n${rowsToMarkdownTable(map.get(k)!)}`
 })
 .join('\n\n')
}

export function rowsToMarkdownTable(rows: Record<string, unknown>[]): string {
 if (rows.length === 0) return '_No rows._'
 const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))].filter((k) => !k.startsWith('__'))
 const headerKeys = keys.length > 0 ? keys : Object.keys(rows[0]!)
 if (headerKeys.length === 0) return '_No columns._'
 const header = `| ${headerKeys.map(escapeCell).join(' | ')} |`
 const sep = `| ${headerKeys.map(() => '---').join(' | ')} |`
 const body = rows
 .map((r) => `| ${headerKeys.map((k) => escapeCell(r[k])).join(' | ')} |`)
 .join('\n')
 return `${header}\n${sep}\n${body}`
}

export function rowsToMarkdownSummary(rows: Record<string, unknown>[]): string {
 if (rows.length === 0) return '_No data._'
 if (rows.length === 1) {
 const r = rows[0]!
 const lines = Object.entries(r)
 .filter(([k]) => !k.startsWith('__'))
 .map(([k, v]) => `- **${escapeCell(k)}:** ${escapeCell(v)}`)
 return lines.join('\n')
 }
 return `_${rows.length} rows._\n\n${rowsToMarkdownTable(rows)}`
}

export function formatOutputMarkdown(
 rows: Record<string, unknown>[],
 style: FormatterPlanV1['outputStyle'],
 opts?: { segmentBy?: string | null },
): string {
 const seg = opts?.segmentBy?.trim()
 if (seg && rows.length > 0) {
 return rowsToSegmentedMarkdownTables(rows, seg)
 }
 if (style === 'markdown_table') return rowsToMarkdownTable(rows)
 if (style === 'markdown_summary') return rowsToMarkdownSummary(rows)
 return `${rowsToMarkdownSummary(rows)}\n\n---\n\n${rowsToMarkdownTable(rows)}`
}
