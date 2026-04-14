"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ColumnDef } from "@tanstack/react-table";
import Markdown from "react-markdown";
import { BookOpen, Pause, Play, Table2, Workflow } from "lucide-react";
import { TrackerDisplay } from "@/app/components/tracker-display";
import type { TrackerDisplayProps } from "@/app/components/tracker-display/types";
import { ExprFlowBuilder } from "@/app/components/tracker-display/edit-mode/expr/ExprFlowBuilder";
import { DataTable } from "@/app/components/tracker-display/grids/data-table/data-table";
import LandingAxisFrame from "@/app/components/landing-page/LandingAxisFrame";
import {
  buildLandingDemoGridData,
  buildLandingDemoSchema,
} from "@/app/components/landing-page/landing-demo-schema";
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
} from "@/app/components/landing-page/landing-demo-insights";
import { AnalysisDocumentView } from "@/app/analysis/components/AnalysisDocumentView";
import { AnalysisRecipeFilters } from "@/app/analysis/components/AnalysisRecipeFilters";
import { filterDraftFromQueryPlan } from "@/app/analysis/lib/replay-overrides";
import { theme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/app/tracker/hooks/useMediaQuery";
import type { ExprNode } from "@/lib/functions/types";

type SurfaceId = "tracker" | "expression" | "analysis";

const SURFACES: {
  id: SurfaceId;
  label: string;
  icon: typeof Table2;
  index: string;
}[] = [
  { id: "tracker", label: "Tracker", icon: Table2, index: "01/03" },
  { id: "expression", label: "Expressions", icon: Workflow, index: "02/03" },
  { id: "analysis", label: "Analysis", icon: BookOpen, index: "03/03" },
];

const DESKTOP_CYCLE_MS = 6000;
const MOBILE_CYCLE_MS = 8000;
const SWIPE_THRESHOLD = 50;

function useReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

function useInView(ref: React.RefObject<HTMLElement | null>): boolean {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref]);
  return inView;
}

export default function Demo() {
  const sectionRef = useRef<HTMLElement>(null);
  const isMobile = useMediaQuery("(max-width: 639px)");
  const prefersReducedMotion = useReducedMotion();
  const inView = useInView(sectionRef);

  const cycleMs = isMobile ? MOBILE_CYCLE_MS : DESKTOP_CYCLE_MS;
  const maxContentHeight = isMobile
    ? "min(45vh, 400px)"
    : "min(60vh, 560px)";

  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [schema] = useState<TrackerDisplayProps>(() =>
    buildLandingDemoSchema(),
  );
  const [demoExpr] = useState<ExprNode>(LANDING_DEMO_INITIAL_EXPR);

  const pausedTotal = paused || !inView || prefersReducedMotion;

  // Auto-cycle
  useEffect(() => {
    if (pausedTotal) return;
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % SURFACES.length);
      setProgress(0);
    }, cycleMs);
    return () => clearInterval(timer);
  }, [pausedTotal, cycleMs]);

  // Progress bar
  useEffect(() => {
    if (pausedTotal) {
      setProgress((p) => Math.min(p, 100));
      return;
    }
    const startTime = performance.now();
    let raf: number;
    const tick = () => {
      const elapsed = performance.now() - startTime;
      const pct = Math.min((elapsed / cycleMs) * 100, 100);
      setProgress(pct);
      if (pct < 100) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pausedTotal, current, cycleMs]);

  // Touch swipe
  const touchStartX = useRef(0);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const delta = e.changedTouches[0].clientX - touchStartX.current;
      if (Math.abs(delta) < SWIPE_THRESHOLD) return;
      setCurrent((c) => {
        setProgress(0);
        if (delta > 0) return (c - 1 + SURFACES.length) % SURFACES.length;
        return (c + 1) % SURFACES.length;
      });
    },
    [],
  );

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        setCurrent((c) => (c + 1) % SURFACES.length);
        setProgress(0);
      } else if (e.key === "ArrowLeft") {
        setCurrent((c) => (c - 1 + SURFACES.length) % SURFACES.length);
        setProgress(0);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleNav = useCallback((i: number) => {
    setCurrent(i);
    setProgress(0);
  }, []);

  const initialGridData = useMemo(() => buildLandingDemoGridData(), []);
  const reportDraft = useMemo(
    () => filterDraftFromQueryPlan(LANDING_DEMO_QUERY_PLAN),
    [],
  );
  const initialExpr = useMemo(
    () => structuredClone(LANDING_DEMO_INITIAL_EXPR),
    [],
  );

  const reportColumns = useMemo(
    (): ColumnDef<Record<string, unknown>, unknown>[] => [
      { id: "status", accessorKey: "project_status", header: "Status" },
      {
        id: "sum_budget",
        accessorKey: "sum_budget",
        header: "Sum budget",
        cell: ({ getValue }) => {
          const v = getValue();
          if (typeof v === "number" && Number.isFinite(v))
            return v.toLocaleString();
          return v == null ? "" : String(v);
        },
      },
      { id: "deal_count", accessorKey: "deal_count", header: "Deals" },
      {
        id: "avg_rate",
        accessorKey: "avg_rate",
        header: "Avg $/hr",
        cell: ({ getValue }) => {
          const v = getValue();
          if (typeof v === "number" && Number.isFinite(v)) {
            return `$${v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
          }
          return v == null ? "" : String(v);
        },
      },
      {
        id: "max_budget",
        accessorKey: "max_budget",
        header: "Largest deal",
        cell: ({ getValue }) => {
          const v = getValue();
          if (typeof v === "number" && Number.isFinite(v))
            return v.toLocaleString();
          return v == null ? "" : String(v);
        },
      },
      {
        id: "pipeline_share",
        accessorKey: "pipeline_share",
        header: "Share of total",
        cell: ({ getValue }) => {
          const v = getValue();
          if (typeof v === "number" && Number.isFinite(v))
            return `${(v * 100).toFixed(1)}%`;
          return v == null ? "" : String(v);
        },
      },
    ],
    [],
  );

  const surface = SURFACES[current];

  const renderSurface = useCallback(
    (id: SurfaceId): ReactNode => {
      switch (id) {
        case "tracker":
          return (
            <TrackerDisplay
              key="demo-tracker"
              {...schema}
              initialGridData={initialGridData}
              editMode={false}
            />
          );
        case "expression":
          return (
            <ExprFlowBuilder
              key="demo-expr"
              expr={initialExpr}
              availableFields={LANDING_DEMO_EXPR_FIELDS}
              onChange={() => {}}
              resultFieldId="logic_lines_grid.logic_line_total"
              resultFieldLabel={LANDING_DEMO_EXPR_RESULT_LABEL}
              flowHeightClassName="h-[min(52vh,560px)]"
            />
          );
        case "analysis":
          return (
            <div className="space-y-4 max-h-[min(78vh,720px)] overflow-y-auto p-4 sm:p-5">
              <div className="prose prose-sm max-w-none text-foreground/90 dark:prose-invert">
                <Markdown>{LANDING_DEMO_REPORT_MARKDOWN}</Markdown>
              </div>
              <AnalysisRecipeFilters
                defaultOpen={false}
                disabled
                userRequirementPrompt="For High and Medium priority work that is not Completed, sum estimated budget, count initiatives, average hourly rate, and max deal size — grouped by status."
                queryPlan={LANDING_DEMO_QUERY_PLAN}
                formatterOnlyGroupBy={false}
                fieldCatalog={LANDING_DEMO_FIELD_CATALOG}
                rowTimeFilter={reportDraft.rowTimeFilter}
                onRowTimeFilterChange={() => {}}
                filterRows={reportDraft.filterRows}
                onFilterRowsChange={() => {}}
                aggregateGroupBy={reportDraft.aggregateGroupBy}
                onAggregateGroupByChange={() => {}}
                onApply={() => {}}
                applyDisabled
                applying={false}
                filtersDirty={false}
                filterBaselineReady
              />
              <div
                className={cn(
                  "w-full min-w-0 rounded-sm overflow-hidden border",
                  theme.uiChrome.floating,
                )}
              >
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
              <AnalysisDocumentView
                document={LANDING_DEMO_ANALYSIS_DOCUMENT}
                header={{
                  title: "Pipeline concentration",
                  asOfIso: LANDING_DEMO_SNAPSHOT_AS_OF_ISO,
                  projectName: "Northwind Ops",
                  moduleName: "Go-to-market",
                  trackerName: "Project pipeline",
                }}
              />
            </div>
          );
      }
    },
    [
      schema,
      initialGridData,
      initialExpr,
      reportDraft,
      reportColumns,
    ],
  );

  return (
    <>
      <style>{`
        @keyframes demoFadeIn {
          from { opacity: 0; transform: scale(0.99) translateY(4px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-demoFadeIn {
          animation: demoFadeIn 350ms ease-out both;
        }
      `}</style>

      <section ref={sectionRef} className="space-y-8 sm:space-y-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-foreground/20 tabular-nums">
                002
              </span>
              <span className="relative flex h-1.5 w-1.5 rounded-full bg-foreground/20">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-foreground/10" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Live demo
              </span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground leading-tight">
              See it work.
            </h3>
          </div>
          {prefersReducedMotion && (
            <p className="text-xs text-muted-foreground/50 max-w-sm sm:text-right">
              Auto-cycling is paused. Use the controls below or arrow keys to
              browse surfaces.
            </p>
          )}
        </div>

        <LandingAxisFrame
          id="demo"
          className="relative"
          contentClassName="relative p-4 sm:p-6 bg-secondary/20"
        >
          <div className="max-w-5xl mx-auto space-y-4">
            {/* Showcase frame */}
            <div
              className="overflow-hidden rounded-sm border border-border/40 bg-background"
              onClick={() => setPaused(true)}
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              role="presentation"
            >
              {/* Top decorative bar */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 bg-muted/10">
                <div className="flex items-center gap-2.5 min-w-0">
                  <surface.icon
                    className="h-3.5 w-3.5 shrink-0 text-muted-foreground/35"
                    aria-hidden
                  />
                  <span className="text-[10px] font-mono tracking-wider text-muted-foreground/40 truncate">
                    trckr/preview — {surface.label}
                  </span>
                </div>
                <span className="text-[9px] font-mono tabular-nums text-muted-foreground/20 shrink-0 ml-2">
                  {surface.index}
                </span>
              </div>

              {/* Content */}
              <div
                className="relative overflow-y-auto rounded-sm"
                style={{ maxHeight: maxContentHeight }}
              >
                <div key={current} className="animate-demoFadeIn">
                  {renderSurface(surface.id)}
                </div>

                {/* Bottom gradient fade */}
                <div className="sticky bottom-0 inset-x-0 h-28 bg-gradient-to-t from-background to-transparent pointer-events-none" />
              </div>
            </div>

            {/* Navigation controls */}
            <div className="flex items-center justify-between gap-4">
              {/* Surface pills */}
              <div className="flex items-center gap-1 min-w-0 overflow-x-auto [-webkit-overflow-scrolling:touch]">
                {SURFACES.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleNav(i)}
                    className={cn(
                      "flex items-center gap-1.5 py-1.5 pr-3 shrink-0 transition-colors rounded-sm",
                      i === current
                        ? "text-foreground/80"
                        : "text-muted-foreground/30 hover:text-muted-foreground/60",
                    )}
                    aria-label={`Show ${s.label}`}
                    aria-current={i === current ? "true" : undefined}
                  >
                    <span
                      className={cn(
                        "inline-block h-1.5 rounded-full transition-all duration-300",
                        i === current
                          ? "w-5 bg-foreground/50"
                          : "w-1.5 bg-foreground/15",
                      )}
                      aria-hidden
                    />
                    <span className="text-[10px] font-medium uppercase tracking-wider hidden xl:inline">
                      {s.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Pause / play */}
              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                className={cn(
                  "flex items-center gap-1.5 py-1.5 px-2.5 rounded-sm transition-colors shrink-0",
                  pausedTotal
                    ? "text-muted-foreground/40 hover:text-foreground/60"
                    : "text-muted-foreground/25 hover:text-muted-foreground/50",
                )}
                aria-label={pausedTotal ? "Resume auto-cycle" : "Pause auto-cycle"}
              >
                {pausedTotal ? (
                  <Play className="h-3 w-3" aria-hidden />
                ) : (
                  <Pause className="h-3 w-3" aria-hidden />
                )}
                <span className="text-[9px] font-medium uppercase tracking-widest hidden sm:inline">
                  {pausedTotal ? "Play" : "Pause"}
                </span>
              </button>
            </div>

            {/* Progress bar */}
            <div className="h-px bg-border/15 relative overflow-hidden rounded-full">
              <div
                className="absolute inset-y-0 left-0 bg-foreground/25 rounded-full transition-none"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </LandingAxisFrame>
      </section>
    </>
  );
}
