'use client'

import { useCallback, useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import Markdown from 'react-markdown'
import { BarChart3, BookOpen, Table2, Workflow } from 'lucide-react'
import { TrackerDisplay } from '@/app/components/tracker-display'
import type { TrackerDisplayProps } from '@/app/components/tracker-display/types'
import { ExprFlowBuilder } from '@/app/components/tracker-display/edit-mode/expr/ExprFlowBuilder'
import { DataTable } from '@/app/components/tracker-display/grids/data-table/data-table'
import LandingAxisFrame from '@/app/components/landing-page/LandingAxisFrame'
import {
 buildLandingDemoGridData,
 buildLandingDemoSchema,
} from '@/app/components/landing-page/landing-demo-schema'
import {
 LANDING_DEMO_ANALYSIS_DOCUMENT,
 LANDING_DEMO_EXPR_FIELDS,
 LANDING_DEMO_EXPR_RESULT_LABEL,
 LANDING_DEMO_FIELD_CATALOG,
 LANDING_DEMO_INITIAL_EXPR,
 LANDING_DEMO_QUERY_PLAN,
 LANDING_DEMO_REPORT_MARKDOWN,
 LANDING_DEMO_REPORT_ROWS,
 LANDING_DEMO_SNAPSHOT_AS_OF_ISO,
} from '@/app/components/landing-page/landing-demo-insights'
import { AnalysisDocumentView } from '@/app/analysis/components/AnalysisDocumentView'
import { filterDraftFromQueryPlan } from '@/app/report/lib/replay-overrides'
import { ReportRecipeFilters } from '@/app/report/components/ReportRecipeFilters'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import type { ExprNode } from '@/lib/functions/types'

type DemoSurface = 'tracker' | 'expression' | 'report' | 'analysis'

function isDemoSurface(v: string): v is DemoSurface {
 return v === 'tracker' || v === 'expression' || v === 'report' || v === 'analysis'
}

const SURFACE_TABS: {
 id: DemoSurface
 label: string
 icon: typeof Table2
}[] = [
 { id: 'tracker', label: 'Tracker', icon: Table2 },
 { id: 'expression', label: 'Expressions', icon: Workflow },
 { id: 'report', label: 'Report', icon: BarChart3 },
 { id: 'analysis', label: 'Analysis', icon: BookOpen },
 ]

export default function Demo() {
 const [surface, setSurface] = useState<DemoSurface>('tracker')
 const [layoutPlayground, setLayoutPlayground] = useState(false)
 const [displayKey, setDisplayKey] = useState(0)
 const [schema, setSchema] = useState<TrackerDisplayProps>(() =>
 structuredClone(buildLandingDemoSchema())
 )
 const [demoExpr, setDemoExpr] = useState<ExprNode>(LANDING_DEMO_INITIAL_EXPR)

 const resetSchema = useCallback(() => {
 setSchema(structuredClone(buildLandingDemoSchema()))
 }, [])

 const handleLayoutToggle = useCallback(
 (next: boolean) => {
 setLayoutPlayground(next)
 if (!next) {
 resetSchema()
 setDisplayKey((k) => k + 1)
 }
 },
 [resetSchema]
 )

 const initialGridData = useMemo(() => buildLandingDemoGridData(), [])

 const reportDraft = useMemo(
 () => filterDraftFromQueryPlan(LANDING_DEMO_QUERY_PLAN),
 []
 )

 const reportColumns = useMemo(
 (): ColumnDef<Record<string, unknown>, unknown>[] => [
 { id: 'status', accessorKey: 'project_status', header: 'Status' },
 {
 id: 'sum_budget',
 accessorKey: 'sum_budget',
 header: 'Sum budget',
 cell: ({ getValue }) => {
 const v = getValue()
 if (typeof v === 'number' && Number.isFinite(v)) return v.toLocaleString()
 return v == null ? '' : String(v)
 },
 },
 { id: 'deal_count', accessorKey: 'deal_count', header: 'Deals' },
 {
 id: 'avg_rate',
 accessorKey: 'avg_rate',
 header: 'Avg $/hr',
 cell: ({ getValue }) => {
 const v = getValue()
 if (typeof v === 'number' && Number.isFinite(v)) {
 return `$${v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
 }
 return v == null ? '' : String(v)
 },
 },
 {
 id: 'max_budget',
 accessorKey: 'max_budget',
 header: 'Largest deal',
 cell: ({ getValue }) => {
 const v = getValue()
 if (typeof v === 'number' && Number.isFinite(v)) return v.toLocaleString()
 return v == null ? '' : String(v)
 },
 },
 {
 id: 'pipeline_share',
 accessorKey: 'pipeline_share',
 header: 'Share of total',
 cell: ({ getValue }) => {
 const v = getValue()
 if (typeof v === 'number' && Number.isFinite(v)) return `${(v * 100).toFixed(1)}%`
 return v == null ? '' : String(v)
 },
 },
 ],
 []
 )

 return (
 <section className="space-y-8 sm:space-y-10">
 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
 <div className="space-y-2">
 <div className="flex items-center gap-2">
 <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-foreground/20 tabular-nums">
 002
 </span>
 <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
 Live demo
 </span>
 </div>
 <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground leading-tight">
 The full platform, live.
 </h3>
 </div>
 <div className="flex flex-wrap items-center gap-2.5 sm:gap-3.5">
 {(['Tracker', 'Expressions', 'Reports', 'Analysis'] as const).map((label, i) => (
 <span key={label} className="flex items-center gap-1.5">
 {i > 0 && <span className="text-border/50" aria-hidden>·</span>}
 <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground/55">
 <span className="inline-flex h-1.5 w-1.5 rounded-full bg-foreground/15" aria-hidden />
 {label}
 </span>
 </span>
 ))}
 </div>
 </div>

 <LandingAxisFrame
 id="demo"
 className="relative"
 contentClassName="relative p-5 sm:p-7 md:p-8 bg-secondary/20"
 >
 <div className="max-w-7xl mx-auto space-y-5 sm:space-y-6">
 <Tabs
 value={surface}
 onValueChange={(v) => {
 if (isDemoSurface(v)) setSurface(v)
 }}
 className="w-full gap-3"
 >
 <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
 <div className="flex h-8 shrink-0 items-center sm:w-[10.25rem]">
 {surface === 'tracker' ? (
 <div
 className="inline-flex items-center rounded-sm border border-border/60 bg-background/80 p-0.5"
 role="group"
 aria-label="Data or layout editing"
 >
 <button
 type="button"
 onClick={() => handleLayoutToggle(false)}
 className={cn(
 'px-2 py-1 text-xs font-semibold rounded-sm transition-colors duration-150 ease-out sm:px-3',
 !layoutPlayground
 ? 'bg-foreground text-background'
 : 'text-muted-foreground hover:text-foreground'
 )}
 aria-pressed={!layoutPlayground}
 >
 Data
 </button>
 <button
 type="button"
 onClick={() => handleLayoutToggle(true)}
 className={cn(
 'px-2 py-1 text-xs font-semibold rounded-sm transition-colors duration-150 ease-out sm:px-3',
 layoutPlayground
 ? 'bg-foreground text-background'
 : 'text-muted-foreground hover:text-foreground'
 )}
 aria-pressed={layoutPlayground}
 >
 Layout
 </button>
 </div>
 ) : null}
 </div>
 <div className="min-w-0 flex-1 overflow-x-auto [-webkit-overflow-scrolling:touch]">
 <div className="flex min-w-min justify-start sm:justify-end">
 <TabsList
 className={cn(
 'min-h-8 inline-flex w-max max-w-none shrink-0',
 '[&_[data-slot=tabs-trigger]]:min-h-7 [&_[data-slot=tabs-trigger]]:px-2 [&_[data-slot=tabs-trigger]]:py-0.5',
 '[&_[data-slot=tabs-trigger]]:text-xs [&_[data-slot=tabs-trigger]]:gap-1.5',
 '[&_[data-slot=tabs-trigger]]:font-semibold',
 '[&_[data-slot=tabs-trigger]]:shrink-0 [&_[data-slot=tabs-trigger]]:flex-none'
 )}
 >
 {SURFACE_TABS.map(({ id, label, icon: Icon }) => (
 <TabsTrigger key={id} value={id} className="shrink-0 flex-none gap-1.5">
 <Icon className="h-3.5 w-3.5" aria-hidden />
 {label}
 </TabsTrigger>
 ))}
 </TabsList>
 </div>
 </div>
 </div>

 <TabsContent value="tracker" forceMount className="data-[state=inactive]:hidden mt-0">
 <TrackerDisplay
 key={displayKey}
 {...schema}
 initialGridData={initialGridData}
 editMode={layoutPlayground}
 onSchemaChange={layoutPlayground ? setSchema : undefined}
 />
 </TabsContent>

 <TabsContent value="expression" forceMount className="data-[state=inactive]:hidden mt-0">
 <div className="rounded-sm border border-border/60 bg-background overflow-hidden min-h-[min(52vh,520px)]">
 <p className="border-b border-border/50 bg-muted/25 px-4 py-2.5 text-xs leading-relaxed text-muted-foreground sm:px-5">
 Example <span className="font-medium text-foreground/90">quoted line</span> on{' '}
 <span className="font-medium text-foreground/90">Line items</span>:{' '}
 <span className="font-medium text-foreground/90">quantity × unit rate</span> plus a{' '}
 <span className="font-medium text-foreground/90">rush add-on</span> ($50 for each unit
 above 10). The graph uses the same fields as the{' '}
 <span className="font-medium text-foreground/90">Line items</span> tab in the tracker.
 The saved <span className="font-medium text-foreground/90">Line total</span> field there
 stays a simple product — this canvas shows a richer example for the demo.
 </p>
 <ExprFlowBuilder
 key="landing-expr"
 expr={demoExpr}
 availableFields={LANDING_DEMO_EXPR_FIELDS}
 onChange={setDemoExpr}
 resultFieldId="logic_lines_grid.logic_line_total"
 resultFieldLabel={LANDING_DEMO_EXPR_RESULT_LABEL}
 flowHeightClassName="h-[min(52vh,560px)]"
 />
 </div>
 </TabsContent>

 <TabsContent value="report" forceMount className="data-[state=inactive]:hidden mt-0">
 <div className="rounded-sm border border-border/60 bg-background overflow-hidden space-y-5 p-4 sm:p-5">
 <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/90">
 <Markdown>{LANDING_DEMO_REPORT_MARKDOWN}</Markdown>
 </div>
 <ReportRecipeFilters
 defaultOpen
 disabled
 userRequirementPrompt="For High and Medium priority work that is not Completed, sum estimated budget, count initiatives, average hourly rate, and max deal size — grouped by status."
 queryPlan={LANDING_DEMO_QUERY_PLAN}
 formatterOnlyGroupBy={false}
 fieldCatalog={LANDING_DEMO_FIELD_CATALOG}
 rowTimeFilter={reportDraft.rowTimeFilter}
 onRowTimeFilterChange={() => { }}
 filterRows={reportDraft.filterRows}
 onFilterRowsChange={() => { }}
 aggregateGroupBy={reportDraft.aggregateGroupBy}
 onAggregateGroupByChange={() => { }}
 onApply={() => { }}
 applyDisabled
 applying={false}
 filtersDirty={false}
 filterBaselineReady
 />
 <div className="w-full min-w-0 rounded-sm overflow-hidden border border-border/40">
 <DataTable<Record<string, unknown>, unknown>
 columns={reportColumns}
 data={LANDING_DEMO_REPORT_ROWS}
 addable={false}
 editable={false}
 deletable={false}
 editLayoutAble={false}
 showRowDetails={false}
 />
 </div>
 </div>
 </TabsContent>

 <TabsContent value="analysis" forceMount className="data-[state=inactive]:hidden mt-0">
 <div className="rounded-sm border border-border/60 bg-background max-h-[min(78vh,720px)] overflow-y-auto">
 <AnalysisDocumentView
 document={LANDING_DEMO_ANALYSIS_DOCUMENT}
 header={{
 title: 'Pipeline concentration',
 asOfIso: LANDING_DEMO_SNAPSHOT_AS_OF_ISO,
 projectName: 'Northwind Ops',
 moduleName: 'Go-to-market',
 trackerName: 'Project pipeline',
 }}
 />
 </div>
 </TabsContent>
 </Tabs>
 </div>
 </LandingAxisFrame>
 </section>
 )
}
