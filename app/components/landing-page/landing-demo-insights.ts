import type { AvailableField } from "@/app/components/tracker-display/edit-mode/expr/expr-types";
import type { AnalysisDocumentV1 } from "@/lib/analysis/analysis-schemas";
import type { ExprNode } from "@/lib/functions/types";
import {
  LANDING_DEMO_REPORT_FILTERED_DEAL_COUNT,
  LANDING_DEMO_REPORT_HIGH_PRIORITY_BUDGET,
  LANDING_DEMO_REPORT_MEDIUM_PRIORITY_BUDGET,
  LANDING_DEMO_REPORT_RECIPE_TOTAL_BUDGET,
  LANDING_DEMO_REPORT_ROWS,
} from "@/app/components/landing-page/landing-demo-report-snapshot";

export {
  LANDING_DEMO_QUERY_PLAN,
  LANDING_DEMO_REPORT_ROWS,
  LANDING_DEMO_SNAPSHOT_AS_OF_ISO,
} from "@/app/components/landing-page/landing-demo-report-snapshot";

/** Matches `FieldCatalogEntry` in ReportRecipeFilters (bare `fieldId` per grid, same as `buildFieldCatalog`). */
export type LandingDemoFieldCatalogEntry = {
  fieldId: string;
  label: string;
  gridId: string;
  gridName: string;
  dataType: string;
};

/**
 * Rich demo expression for the landing ExprFlow canvas: core **qty × unit rate** plus a
 * **rush add-on** ($50 per unit above 10). The tracker’s saved **Line total** field remains
 * the simple product in schema; this graph shows what multi-step formulas look like in the builder.
 */
export const LANDING_DEMO_INITIAL_EXPR: ExprNode = {
  op: "add",
  args: [
    {
      op: "mul",
      args: [
        { op: "field", fieldId: "logic_lines_grid.logic_qty" },
        { op: "field", fieldId: "logic_lines_grid.logic_unit_rate" },
      ],
    },
    {
      op: "mul",
      args: [
        {
          op: "max",
          args: [
            {
              op: "sub",
              left: { op: "field", fieldId: "logic_lines_grid.logic_qty" },
              right: { op: "const", value: 10 },
            },
            { op: "const", value: 0 },
          ],
        },
        { op: "const", value: 50 },
      ],
    },
  ],
};

/** Shown on the Result node in marketing ExprFlow demos (not necessarily the saved schema calc). */
export const LANDING_DEMO_EXPR_RESULT_LABEL = "Quoted line total";

export const LANDING_DEMO_EXPR_FIELDS: AvailableField[] = [
  {
    fieldId: "logic_lines_grid.logic_item_label",
    label: "Line item",
    dataType: "string",
  },
  { fieldId: "logic_lines_grid.logic_qty", label: "Qty", dataType: "number" },
  {
    fieldId: "logic_lines_grid.logic_unit_rate",
    label: "Unit ($)",
    dataType: "number",
  },
  {
    fieldId: "logic_lines_grid.logic_line_total",
    label: "Line total",
    dataType: "number",
  },
  {
    fieldId: "project_list.project_name",
    label: "Project",
    dataType: "string",
  },
  { fieldId: "project_list.project_owner", label: "Owner", dataType: "string" },
  { fieldId: "project_list.project_team", label: "Team", dataType: "string" },
  {
    fieldId: "project_list.project_due_date",
    label: "Due date",
    dataType: "date",
  },
  {
    fieldId: "project_list.project_est_hours",
    label: "Est. hours",
    dataType: "number",
  },
  {
    fieldId: "project_list.project_hourly_rate",
    label: "Rate ($/hr)",
    dataType: "number",
  },
  {
    fieldId: "project_list.project_budget",
    label: "Est. budget",
    dataType: "number",
  },
  {
    fieldId: "project_list.project_priority",
    label: "Priority",
    dataType: "options",
  },
  {
    fieldId: "project_list.project_status",
    label: "Status",
    dataType: "options",
  },
];

export const LANDING_DEMO_FIELD_CATALOG: LandingDemoFieldCatalogEntry[] = [
  {
    fieldId: "project_name",
    label: "Project",
    gridId: "project_list",
    gridName: "Projects",
    dataType: "string",
  },
  {
    fieldId: "project_owner",
    label: "Owner",
    gridId: "project_list",
    gridName: "Projects",
    dataType: "string",
  },
  {
    fieldId: "project_team",
    label: "Team",
    gridId: "project_list",
    gridName: "Projects",
    dataType: "string",
  },
  {
    fieldId: "project_due_date",
    label: "Due date",
    gridId: "project_list",
    gridName: "Projects",
    dataType: "date",
  },
  {
    fieldId: "project_est_hours",
    label: "Est. hours",
    gridId: "project_list",
    gridName: "Projects",
    dataType: "number",
  },
  {
    fieldId: "project_hourly_rate",
    label: "Rate ($/hr)",
    gridId: "project_list",
    gridName: "Projects",
    dataType: "number",
  },
  {
    fieldId: "project_budget",
    label: "Est. budget",
    gridId: "project_list",
    gridName: "Projects",
    dataType: "number",
  },
  {
    fieldId: "project_status",
    label: "Status",
    gridId: "project_list",
    gridName: "Projects",
    dataType: "options",
  },
  {
    fieldId: "project_priority",
    label: "Priority",
    gridId: "project_list",
    gridName: "Projects",
    dataType: "options",
  },
];

const totalBudgetFormatted =
  LANDING_DEMO_REPORT_RECIPE_TOTAL_BUDGET.toLocaleString("en-US");
const highBudgetFormatted =
  LANDING_DEMO_REPORT_HIGH_PRIORITY_BUDGET.toLocaleString("en-US");
const mediumBudgetFormatted =
  LANDING_DEMO_REPORT_MEDIUM_PRIORITY_BUDGET.toLocaleString("en-US");

export const LANDING_DEMO_REPORT_MARKDOWN = `**Active portfolio (High + Medium, excluding Completed)** — This recipe matches the **Pipeline** tab seed: flatten **Projects**, require **Priority ∈ {High, Medium}**, drop **Completed**, then **sum Est. budget** with **count**, **avg rate**, and **max deal** by **Status**. Rows and totals below are produced by the same \`executeQueryPlan\` path as live reports.

- **In Progress** carries the largest share of committed dollars; **Blocked** is a close second on risk (work is stalled but still funded).
- **High** vs **Medium** budget split is almost even (**$${highBudgetFormatted}** vs **$${mediumBudgetFormatted}**) — capacity planning should treat both tiers as first-class.

**Total** Est. budget in this cohort: **$${totalBudgetFormatted}** across **${String(LANDING_DEMO_REPORT_FILTERED_DEAL_COUNT)}** initiatives. Sign in to run live generation and edit recipes.`;

const analysisBarChartData = LANDING_DEMO_REPORT_ROWS.map((r) => ({
  status: String(r.project_status ?? ""),
  budget:
    typeof r.sum_budget === "number" && Number.isFinite(r.sum_budget)
      ? r.sum_budget
      : 0,
}));

const inProgressBudgetRow = LANDING_DEMO_REPORT_ROWS.find(
  (r) => r.project_status === "In Progress",
);
const blockedBudgetRow = LANDING_DEMO_REPORT_ROWS.find(
  (r) => r.project_status === "Blocked",
);
const inProgressBudgetFormatted =
  typeof inProgressBudgetRow?.sum_budget === "number" &&
  Number.isFinite(inProgressBudgetRow.sum_budget)
    ? inProgressBudgetRow.sum_budget.toLocaleString("en-US")
    : "—";
const blockedBudgetFormatted =
  typeof blockedBudgetRow?.sum_budget === "number" &&
  Number.isFinite(blockedBudgetRow.sum_budget)
    ? blockedBudgetRow.sum_budget.toLocaleString("en-US")
    : "—";

export const LANDING_DEMO_ANALYSIS_DOCUMENT: AnalysisDocumentV1 = {
  version: 1,
  blocks: [
    {
      sectionId: "landing-demo-1",
      title: "Budget concentration by status",
      markdown: `The **${String(LANDING_DEMO_REPORT_FILTERED_DEAL_COUNT)}** active initiatives (High + Medium, not Completed) roll up to **$${totalBudgetFormatted}** Est. budget. Largest status bucket is **In Progress** at **$${inProgressBudgetFormatted}** — mostly **Engineering** and **Product** workstreams (*API reliability sprint*, *Data warehouse refactor*, *New onboarding flow*, *SOC 2 evidence pack*). **Blocked** is **$${blockedBudgetFormatted}** (*Laptop refresh Q1*, *Customer research panels*).`,
      chartSpec: { type: "bar", xKey: "status", yKeys: ["budget"] },
      chartData: analysisBarChartData,
      sources: `Tracker snapshot · ${String(LANDING_DEMO_REPORT_FILTERED_DEAL_COUNT)} rows · priority ∈ {High, Medium} · status ≠ Completed · as of demo seed`,
    },
    {
      sectionId: "landing-demo-2",
      title: "Priority mix (same cohort)",
      markdown: `**High** initiatives total **$${highBudgetFormatted}**; **Medium** total **$${mediumBudgetFormatted}** — nearly a 50/50 split, so prioritization reviews should not assume “Medium” is a small tail.

Suggested next steps:
1. **Unblock** *Laptop refresh Q1* and *Customer research panels* or re-scope dates — combined they anchor the **Blocked** bucket.
2. **Guard capacity** on *Data warehouse refactor* and *New onboarding flow* — they dominate **In Progress** dollars.
3. **Re-run** after any pipeline edit so reports and analysis stay wired to the same query plan.`,
      chartSpec: {
        type: "pie",
        nameKey: "priority",
        valueKey: "budget",
      },
      chartData: [
        { priority: "High", budget: LANDING_DEMO_REPORT_HIGH_PRIORITY_BUDGET },
        {
          priority: "Medium",
          budget: LANDING_DEMO_REPORT_MEDIUM_PRIORITY_BUDGET,
        },
      ],
      sources: `Derived from same filtered cohort · High $${highBudgetFormatted} · Medium $${mediumBudgetFormatted}`,
    },
    {
      sectionId: "landing-demo-3",
      title: "Operational follow-ups",
      markdown:
        "1. **Security / GTM alignment** — *SOC 2 evidence pack* sits in **In Progress** with a high blended rate; keep evidence IDs attached in the tracker for audit trail.\n2. **RevOps** — *CRM data hygiene* is out of this cohort (Low priority); escalate if leadership wants it in the next planning slice.\n3. **Reproducibility** — This brief is static marketing data, but the numbers are generated with the product query executor so the story matches the implementation.",
      sources:
        "Demo narrative · aligned with landing pipeline seed and report snapshot",
    },
  ],
};
