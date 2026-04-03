import type { TrackerDisplayProps } from "@/app/components/tracker-display/types";
import {
  PIPELINE_DEMO_ROWS,
  type LandingPipelineSeedRow,
} from "@/app/components/landing-page/landing-demo-pipeline-seed";

export { PIPELINE_DEMO_ROWS, type LandingPipelineSeedRow };

export function buildLandingDemoSchema(): TrackerDisplayProps {
  return {
    tabs: [
      { id: "projects_tab", name: "Pipeline", placeId: 1 },
      { id: "logic_tab", name: "Line items", placeId: 2 },
      { id: "conditional_tab", name: "Category & detail", placeId: 3 },
      { id: "master_data_tab", name: "Master data", placeId: 999, config: {} },
    ],
    sections: [
      {
        id: "projects_section",
        name: "Project pipeline",
        tabId: "projects_tab",
        placeId: 1,
      },
      {
        id: "logic_section",
        name: "Validated line items",
        tabId: "logic_tab",
        placeId: 1,
      },
      {
        id: "conditional_section",
        name: "Category → detail",
        tabId: "conditional_tab",
        placeId: 1,
      },
      {
        id: "master_data_section",
        name: "Master Data",
        tabId: "master_data_tab",
        placeId: 1,
        config: {},
      },
    ],
    grids: [
      {
        id: "project_list",
        name: "Projects",
        sectionId: "projects_section",
        placeId: 1,
        config: {},
        views: [
          { id: "project_list_table", name: "Table", type: "table" as const },
          {
            id: "project_list_kanban",
            name: "Kanban",
            type: "kanban" as const,
            config: { groupBy: "project_status" },
          },
        ],
      },
      {
        id: "logic_lines_grid",
        name: "Line items",
        type: "table" as const,
        sectionId: "logic_section",
        placeId: 1,
        config: {},
      },
      {
        id: "category_options_grid",
        name: "Categories",
        type: "table" as const,
        sectionId: "conditional_section",
        placeId: 1,
        config: {},
      },
      {
        id: "cond_demo_grid",
        name: "Work items",
        type: "table" as const,
        sectionId: "conditional_section",
        placeId: 2,
        config: {},
      },
      {
        id: "priority_options_grid",
        name: "Priority",
        type: "table" as const,
        sectionId: "master_data_section",
        placeId: 1,
        config: {},
      },
      {
        id: "status_options_grid",
        name: "Status",
        type: "table" as const,
        sectionId: "master_data_section",
        placeId: 2,
        config: {},
      },
    ],
    fields: [
      {
        id: "project_name",
        dataType: "string" as const,
        ui: { label: "Project" },
      },
      {
        id: "project_owner",
        dataType: "string" as const,
        ui: { label: "Owner" },
      },
      {
        id: "project_team",
        dataType: "string" as const,
        ui: { label: "Team" },
      },
      {
        id: "project_due_date",
        dataType: "date" as const,
        ui: { label: "Due date" },
      },
      {
        id: "project_est_hours",
        dataType: "number" as const,
        ui: { label: "Est. hours" },
        config: { numberDecimalPlaces: 0 },
      },
      {
        id: "project_hourly_rate",
        dataType: "number" as const,
        ui: { label: "Rate ($/hr)" },
        config: { numberDecimalPlaces: 0, prefix: "$" },
      },
      {
        id: "project_budget",
        dataType: "number" as const,
        ui: { label: "Est. budget" },
        config: { isDisabled: true, numberDecimalPlaces: 0, prefix: "$" },
      },
      {
        id: "project_priority",
        dataType: "options" as const,
        ui: { label: "Priority" },
        config: {},
      },
      {
        id: "project_status",
        dataType: "options" as const,
        ui: { label: "Status" },
        config: {},
      },
      {
        id: "logic_item_label",
        dataType: "string" as const,
        ui: { label: "Item" },
      },
      {
        id: "logic_qty",
        dataType: "number" as const,
        ui: { label: "Qty" },
        config: { numberDecimalPlaces: 0 },
      },
      {
        id: "logic_unit_rate",
        dataType: "number" as const,
        ui: { label: "Unit ($)" },
        config: { numberDecimalPlaces: 0, prefix: "$" },
      },
      {
        id: "logic_line_total",
        dataType: "number" as const,
        ui: { label: "Line total" },
        config: { isDisabled: true, numberDecimalPlaces: 0, prefix: "$" },
      },
      {
        id: "cond_category_option",
        dataType: "string" as const,
        ui: { label: "Category" },
        config: {},
      },
      {
        id: "cond_title",
        dataType: "string" as const,
        ui: { label: "Work item" },
      },
      {
        id: "cond_category",
        dataType: "options" as const,
        ui: { label: "Area" },
        config: {},
      },
      {
        id: "cond_notes",
        dataType: "string" as const,
        ui: { label: "Detail note" },
      },
      {
        id: "project_priority_option",
        dataType: "string" as const,
        ui: { label: "Priority" },
        config: {},
      },
      {
        id: "project_status_option",
        dataType: "string" as const,
        ui: { label: "Status" },
        config: {},
      },
    ],
    layoutNodes: [
      { gridId: "project_list", fieldId: "project_name", order: 1 },
      { gridId: "project_list", fieldId: "project_owner", order: 2 },
      { gridId: "project_list", fieldId: "project_team", order: 3 },
      { gridId: "project_list", fieldId: "project_due_date", order: 4 },
      { gridId: "project_list", fieldId: "project_est_hours", order: 5 },
      { gridId: "project_list", fieldId: "project_hourly_rate", order: 6 },
      { gridId: "project_list", fieldId: "project_budget", order: 7 },
      { gridId: "project_list", fieldId: "project_priority", order: 8 },
      { gridId: "project_list", fieldId: "project_status", order: 9 },
      { gridId: "logic_lines_grid", fieldId: "logic_item_label", order: 1 },
      { gridId: "logic_lines_grid", fieldId: "logic_qty", order: 2 },
      { gridId: "logic_lines_grid", fieldId: "logic_unit_rate", order: 3 },
      { gridId: "logic_lines_grid", fieldId: "logic_line_total", order: 4 },
      {
        gridId: "category_options_grid",
        fieldId: "cond_category_option",
        order: 1,
      },
      { gridId: "cond_demo_grid", fieldId: "cond_title", order: 1 },
      { gridId: "cond_demo_grid", fieldId: "cond_category", order: 2 },
      { gridId: "cond_demo_grid", fieldId: "cond_notes", order: 3 },
      {
        gridId: "priority_options_grid",
        fieldId: "project_priority_option",
        order: 1,
      },
      {
        gridId: "status_options_grid",
        fieldId: "project_status_option",
        order: 1,
      },
    ],
    bindings: {
      "project_list.project_priority": {
        optionsGrid: "priority_options_grid",
        labelField: "priority_options_grid.project_priority_option",
        fieldMappings: [
          {
            from: "priority_options_grid.project_priority_option",
            to: "project_list.project_priority",
          },
        ],
      },
      "project_list.project_status": {
        optionsGrid: "status_options_grid",
        labelField: "status_options_grid.project_status_option",
        fieldMappings: [
          {
            from: "status_options_grid.project_status_option",
            to: "project_list.project_status",
          },
        ],
      },
      "cond_demo_grid.cond_category": {
        optionsGrid: "category_options_grid",
        labelField: "category_options_grid.cond_category_option",
        fieldMappings: [
          {
            from: "category_options_grid.cond_category_option",
            to: "cond_demo_grid.cond_category",
          },
        ],
      },
    },
    calculations: {
      "project_list.project_budget": {
        expr: {
          op: "mul",
          args: [
            { op: "field", fieldId: "project_list.project_est_hours" },
            { op: "field", fieldId: "project_list.project_hourly_rate" },
          ],
        },
      },
      "logic_lines_grid.logic_line_total": {
        expr: {
          op: "mul",
          args: [
            { op: "field", fieldId: "logic_lines_grid.logic_qty" },
            { op: "field", fieldId: "logic_lines_grid.logic_unit_rate" },
          ],
        },
      },
    },
    validations: {
      "logic_lines_grid.logic_qty": [
        { type: "required", message: "Quantity is required" },
        { type: "min", value: 1, message: "Use at least 1" },
      ],
      "logic_lines_grid.logic_unit_rate": [
        { type: "required", message: "Unit rate is required" },
        { type: "min", value: 0, message: "Rate cannot be negative" },
      ],
    },
  };
}

export function buildLandingDemoGridData() {
  const projectListRows = PIPELINE_DEMO_ROWS.map((e) => ({
    project_name: e.project,
    project_owner: e.owner,
    project_team: e.team,
    project_due_date: e.dueDate,
    project_est_hours: e.estHours,
    project_hourly_rate: e.hourlyRate,
    project_budget: e.estHours * e.hourlyRate,
    project_priority: e.priority,
    project_status: e.status,
  }));

  return {
    project_list: projectListRows,
    logic_lines_grid: [
      {
        logic_item_label: "Design systems audit",
        logic_qty: 8,
        logic_unit_rate: 120,
      },
      {
        logic_item_label: "Core implementation",
        logic_qty: 24,
        logic_unit_rate: 95,
      },
      {
        logic_item_label: "Regression QA",
        logic_qty: 6,
        logic_unit_rate: 75,
      },
      {
        logic_item_label: "Technical writing",
        logic_qty: 14,
        logic_unit_rate: 68,
      },
      {
        logic_item_label: "On-call hardening",
        logic_qty: 18,
        logic_unit_rate: 110,
      },
    ],
    category_options_grid: [
      { cond_category_option: "Product" },
      { cond_category_option: "Operations" },
      { cond_category_option: "People" },
      { cond_category_option: "Engineering" },
      { cond_category_option: "Security" },
      { cond_category_option: "RevOps" },
    ],
    cond_demo_grid: [
      {
        cond_title: "Launch checklist — v1 cut line",
        cond_category: "Product",
        cond_notes: "Defer cohort exports; keep activation funnel + SSO only.",
      },
      {
        cond_title: "Vendor MSA renewal",
        cond_category: "Operations",
        cond_notes:
          "Redlines with counsel by Thu; escalate if payment terms slip past Net 45.",
      },
      {
        cond_title: "Access review cadence",
        cond_category: "Security",
        cond_notes: "Sample 20% of seats; attach evidence IDs for SOC 2 TS.",
      },
      {
        cond_title: "Lead scoring refresh",
        cond_category: "RevOps",
        cond_notes: "Backtest six months; ship model card to RevComm.",
      },
      {
        cond_title: "Pick a category first",
        cond_category: "",
        cond_notes: "",
      },
    ],
    priority_options_grid: [
      { project_priority_option: "High" },
      { project_priority_option: "Medium" },
      { project_priority_option: "Low" },
    ],
    status_options_grid: [
      { project_status_option: "Not Started" },
      { project_status_option: "In Progress" },
      { project_status_option: "Blocked" },
      { project_status_option: "Completed" },
    ],
  };
}
