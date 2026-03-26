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
  LANDING_DEMO_FIELD_CATALOG,
  LANDING_DEMO_EXPR_FIELDS,
  LANDING_DEMO_INITIAL_EXPR,
  LANDING_DEMO_QUERY_PLAN,
  LANDING_DEMO_REPORT_MARKDOWN,
  LANDING_DEMO_REPORT_ROWS,
} from '@/app/components/landing-page/landing-demo-insights'
import { AnalysisDocumentView } from '@/app/analysis/components/AnalysisDocumentView'
import { filterDraftFromQueryPlan } from '@/app/report/lib/replay-overrides'
import { ReportRecipeFilters } from '@/app/report/components/ReportRecipeFilters'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { theme } from '@/lib/theme'
import type { ExprNode } from '@/lib/functions/types'

const DEMO_BADGES = [
  'Live',
  'Formula',
  'AST builder',
  'Reports',
  'Analysis',
  'Bindings',
] as const

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
      {
        id: 'status',
        accessorKey: 'project_list.project_status',
        header: 'Status',
      },
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
      {
        id: 'deal_count',
        accessorKey: 'deal_count',
        header: 'Deals',
      },
    ],
    []
  )

  return (
    <LandingAxisFrame
      id="demo"
      className="mt-6 sm:mt-8 relative"
      contentClassName="relative p-4 sm:p-6 md:p-8 bg-secondary/30"
    >
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-5">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="text-center sm:text-left space-y-1 sm:min-w-0">
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Real UI
            </h3>
            <p className="text-muted-foreground text-[11px] sm:text-xs font-medium leading-snug max-w-xl">
              Switch between the embedded tracker, the visual expression builder (calculations &
              validations), and the same report and analysis surfaces as the signed-in app.
            </p>
          </div>
          <div
            className="flex flex-wrap justify-center sm:justify-end gap-1 shrink-0"
            aria-hidden
          >
            {DEMO_BADGES.map((label) => (
              <span
                key={label}
                className={cn(
                  'rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider',
                  theme.border.subtle,
                  'bg-background/90 text-muted-foreground'
                )}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        <Tabs
          value={surface}
          onValueChange={(v) => {
            if (isDemoSurface(v)) setSurface(v)
          }}
          className="w-full gap-3"
        >
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            {surface === 'tracker' ? (
              <div
                className="inline-flex shrink-0 items-center rounded-md border border-border/60 bg-background/80 p-0.5"
                role="group"
                aria-label="Data or layout editing"
              >
                <button
                  type="button"
                  onClick={() => handleLayoutToggle(false)}
                  className={cn(
                    'px-2 py-1 text-xs font-semibold rounded-md transition-colors duration-150 ease-out sm:px-3',
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
                    'px-2 py-1 text-xs font-semibold rounded-md transition-colors duration-150 ease-out sm:px-3',
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
            <TabsList
              className={cn(
                'min-h-8 w-fit shrink-0',
                '[&_[data-slot=tabs-trigger]]:min-h-7 [&_[data-slot=tabs-trigger]]:px-2 [&_[data-slot=tabs-trigger]]:py-0.5',
                '[&_[data-slot=tabs-trigger]]:text-xs [&_[data-slot=tabs-trigger]]:gap-1.5',
                '[&_[data-slot=tabs-trigger]]:font-semibold'
              )}
            >
              {SURFACE_TABS.map(({ id, label, icon: Icon }) => (
                <TabsTrigger key={id} value={id} className="gap-1.5">
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent
            value="tracker"
            forceMount
            className="data-[state=inactive]:hidden mt-0"
          >
            <TrackerDisplay
              key={displayKey}
              {...schema}
              initialGridData={initialGridData}
              editMode={layoutPlayground}
              onSchemaChange={layoutPlayground ? setSchema : undefined}
            />
          </TabsContent>

          <TabsContent
            value="expression"
            forceMount
            className="data-[state=inactive]:hidden mt-0"
          >
            <div className="rounded-lg border border-border/60 bg-background shadow-sm overflow-hidden min-h-[min(52vh,520px)]">
              <ExprFlowBuilder
                key="landing-expr"
                expr={demoExpr}
                availableFields={LANDING_DEMO_EXPR_FIELDS}
                onChange={setDemoExpr}
                resultFieldId="logic_lines_grid.logic_line_total"
                resultFieldLabel="Line total"
                flowHeightClassName="h-[min(42vh,440px)]"
              />
            </div>
          </TabsContent>

          <TabsContent value="report" forceMount className="data-[state=inactive]:hidden mt-0">
            <div className="rounded-lg border border-border/60 bg-background shadow-sm overflow-hidden space-y-5 p-4 sm:p-5">
              <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/90">
                <Markdown>{LANDING_DEMO_REPORT_MARKDOWN}</Markdown>
              </div>
              <ReportRecipeFilters
                defaultOpen
                disabled
                userRequirementPrompt="For high-priority projects, sum estimated budget and group by status."
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
              <div className="w-full min-w-0 rounded-md overflow-hidden border border-border/40">
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
            <div className="rounded-lg border border-border/60 bg-background shadow-sm max-h-[min(78vh,720px)] overflow-y-auto">
              <AnalysisDocumentView
                document={LANDING_DEMO_ANALYSIS_DOCUMENT}
                header={{
                  title: 'Pipeline concentration',
                  asOfIso: null,
                  projectName: 'Demo org',
                  moduleName: 'Go-to-market',
                  trackerName: 'Project pipeline',
                }}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </LandingAxisFrame>
  )
}
