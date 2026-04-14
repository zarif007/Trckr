import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BuilderOutput } from "@/lib/agent/builder-schema";
type Tracker = NonNullable<BuilderOutput["tracker"]>;

const applyMasterDataBindingsMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ tracker: {}, actions: [] }),
);
const runGenerateExprIntentMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ expr: { op: "const", value: true } }),
);
const validateTrackerMock = vi.hoisted(() =>
  vi.fn().mockReturnValue({ valid: true, errors: [] }),
);
const autoFixBindingsMock = vi.hoisted(() =>
  vi.fn().mockImplementation((t: Record<string, unknown>) => t),
);
const buildBindingsFromSchemaMock = vi.hoisted(() =>
  vi.fn().mockImplementation((t: Record<string, unknown>) => t),
);
const enrichBindingsFromSchemaMock = vi.hoisted(() =>
  vi.fn().mockImplementation((t: Record<string, unknown>) => t),
);
const collectExprIntentsMock = vi.hoisted(() => vi.fn().mockReturnValue([]));
const applyExprIntentResultsMock = vi.hoisted(() =>
  vi.fn((tracker: unknown) => tracker),
);
const applyTrackerPatchMock = vi.hoisted(() =>
  vi.fn((base: Tracker, patch: Record<string, unknown>) => ({
    ...base,
    ...patch,
  })),
);

vi.mock("@/lib/master-data/builder", () => ({
  applyMasterDataBindings: applyMasterDataBindingsMock,
}));
vi.mock("@/app/api/agent/generate-expr/lib/run-intent", () => ({
  runGenerateExprIntent: runGenerateExprIntentMock,
}));
vi.mock("@/lib/validate-tracker", () => ({
  validateTracker: validateTrackerMock,
  autoFixBindings: autoFixBindingsMock,
}));
vi.mock("@/lib/binding", () => ({
  buildBindingsFromSchema: buildBindingsFromSchemaMock,
  enrichBindingsFromSchema: enrichBindingsFromSchemaMock,
  isSelfBinding: (sourceId: string | null | undefined) => {
    if (!sourceId) return false;
    const s = sourceId.trim();
    return s === "ThisTracker" || s === "__self__";
  },
}));
vi.mock("@/lib/expr-intents", () => ({
  collectExprIntents: collectExprIntentsMock,
  applyExprIntentResults: applyExprIntentResultsMock,
}));
vi.mock("@/app/tracker/utils/mergeTracker", () => ({
  applyTrackerPatch: applyTrackerPatchMock,
}));

import { postProcessBuilderOutput } from "../postprocess";

function createMinimalTracker(overrides: Record<string, unknown> = {}): Tracker {
  return {
    tabs: [{ id: "overview_tab", name: "Overview", placeId: 0, config: {} }],
    sections: [
      {
        id: "main_section",
        name: "Main",
        tabId: "overview_tab",
        placeId: 1,
        config: {},
      },
    ],
    grids: [
      {
        id: "tasks_grid",
        name: "Tasks",
        sectionId: "main_section",
        placeId: 1,
        views: [],
        config: {},
      },
    ],
    fields: [
      {
        id: "title",
        dataType: "string" as const,
        ui: { label: "Title" },
        config: {},
      },
    ],
    layoutNodes: [{ gridId: "tasks_grid", fieldId: "title", order: 1 }],
    bindings: {},
    validations: {},
    calculations: {},
    dataRows: [],
    formActions: [],
    styles: {},
    ...overrides,
  } as Tracker;
}

describe("postProcessBuilderOutput", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    validateTrackerMock.mockReturnValue({ valid: true, errors: [] });
    autoFixBindingsMock.mockImplementation((tracker: unknown) => tracker);
    buildBindingsFromSchemaMock.mockImplementation((tracker: unknown) => tracker);
    enrichBindingsFromSchemaMock.mockImplementation((tracker: unknown) => tracker);
    collectExprIntentsMock.mockReturnValue([]);
    applyExprIntentResultsMock.mockImplementation((tracker: unknown) => tracker);
  });

  describe("tracker materialization", () => {
    it("materializes greenfield tracker output", async () => {
      const tracker = createMinimalTracker();
      const result = await postProcessBuilderOutput(
        { tracker },
        {
          masterDataScope: "tracker",
          userId: "user-1",
          projectId: null,
          moduleId: null,
        },
      );

      expect(result.output.tracker).toBeDefined();
      expect((result.output.tracker as Record<string, unknown>).tabs).toHaveLength(1);
    });

    it("materializes patch output by merging with base tracker", async () => {
      const baseTracker = createMinimalTracker();
      const patch = {
        fields: [
          { id: "title", dataType: "string" as const, ui: { label: "Updated Title" } },
          { id: "description", dataType: "string" as const, ui: { label: "Description" } },
        ],
      };

      applyTrackerPatchMock.mockReturnValue({
        ...baseTracker,
        fields: patch.fields,
      });

      const result = await postProcessBuilderOutput(
        { trackerPatch: patch },
        {
          masterDataScope: "tracker",
          userId: "user-1",
          projectId: null,
          moduleId: null,
          baseTracker,
        },
      );

      expect(applyTrackerPatchMock).toHaveBeenCalledWith(baseTracker, patch);
      expect(result.output.tracker).toBeDefined();
    });

    it("throws when no tracker or trackerPatch is provided", async () => {
      await expect(
        postProcessBuilderOutput(
          {},
          {
            masterDataScope: "tracker",
            userId: "user-1",
            projectId: null,
            moduleId: null,
          },
        ),
      ).rejects.toThrow("Builder produced no tracker or trackerPatch");
    });

    it("throws when trackerPatch is provided without baseTracker", async () => {
      await expect(
        postProcessBuilderOutput(
          { trackerPatch: { fields: [] } },
          {
            masterDataScope: "tracker",
            userId: "user-1",
            projectId: null,
            moduleId: null,
            baseTracker: null,
          },
        ),
      ).rejects.toThrow("Builder produced no tracker or trackerPatch");
    });
  });

  describe("structure repair", () => {
    it("creates default overview_tab when tabs array is empty", async () => {
      const tracker = createMinimalTracker({ tabs: [] });
      const result = await postProcessBuilderOutput(
        { tracker },
        {
          masterDataScope: "tracker",
          userId: "user-1",
          projectId: null,
          moduleId: null,
        },
      );

      const tabs = (result.output.tracker as Record<string, unknown>)
        .tabs as Array<{ id: string }>;
      expect(tabs.some((t) => t.id === "overview_tab")).toBe(true);
    });

    it("repairs sections with missing tabId", async () => {
      const tracker = createMinimalTracker({
        sections: [
          { id: "orphan_section", name: "Orphan", placeId: 1, config: {} },
        ],
      });
      const result = await postProcessBuilderOutput(
        { tracker },
        {
          masterDataScope: "tracker",
          userId: "user-1",
          projectId: null,
          moduleId: null,
        },
      );

      const sections = (result.output.tracker as Record<string, unknown>)
        .sections as Array<{ id: string; tabId: string }>;
      const orphan = sections.find((s) => s.id === "orphan_section");
      expect(orphan?.tabId).toBeDefined();
    });

    it("repairs grids with missing sectionId by creating parent section", async () => {
      const tracker = createMinimalTracker({
        grids: [
          { id: "orphan_grid", name: "Orphan", placeId: 1, config: {} },
        ],
        sections: [],
      });
      const result = await postProcessBuilderOutput(
        { tracker },
        {
          masterDataScope: "tracker",
          userId: "user-1",
          projectId: null,
          moduleId: null,
        },
      );

      const grids = (result.output.tracker as Record<string, unknown>)
        .grids as Array<{ id: string; sectionId: string }>;
      const orphan = grids.find((g) => g.id === "orphan_grid");
      expect(orphan?.sectionId).toBeDefined();

      const sections = (result.output.tracker as Record<string, unknown>)
        .sections as Array<{ id: string }>;
      expect(sections.some((s) => s.id === orphan?.sectionId)).toBe(true);
    });

    it("assigns placeId to sections without one", async () => {
      const tracker = createMinimalTracker({
        sections: [
          {
            id: "main_section",
            name: "Main",
            tabId: "overview_tab",
            config: {},
          },
        ],
      });
      const result = await postProcessBuilderOutput(
        { tracker },
        {
          masterDataScope: "tracker",
          userId: "user-1",
          projectId: null,
          moduleId: null,
        },
      );

      const sections = (result.output.tracker as Record<string, unknown>)
        .sections as Array<{ id: string; placeId: number }>;
      const main = sections.find((s) => s.id === "main_section");
      expect(typeof main?.placeId).toBe("number");
    });
  });

  describe("binding resolution", () => {
    it("calls binding build functions for tracker scope", async () => {
      const tracker = createMinimalTracker();
      await postProcessBuilderOutput(
        { tracker },
        {
          masterDataScope: "tracker",
          userId: "user-1",
          projectId: null,
          moduleId: null,
        },
      );

      expect(buildBindingsFromSchemaMock).toHaveBeenCalled();
      expect(enrichBindingsFromSchemaMock).toHaveBeenCalled();
      expect(applyMasterDataBindingsMock).not.toHaveBeenCalled();
    });

    it("calls applyMasterDataBindings for module scope", async () => {
      const tracker = createMinimalTracker();
      applyMasterDataBindingsMock.mockResolvedValue({
        tracker: { ...tracker, masterDataScope: "module" },
        actions: [{ type: "lookup", name: "Status", key: "status", trackerId: "md-1" }],
      });

      await postProcessBuilderOutput(
        { tracker },
        {
          masterDataScope: "module",
          userId: "user-1",
          projectId: "project-1",
          moduleId: "module-1",
        },
      );

      expect(applyMasterDataBindingsMock).toHaveBeenCalled();
      expect(buildBindingsFromSchemaMock).not.toHaveBeenCalled();
    });

    it("calls applyMasterDataBindings for project scope", async () => {
      const tracker = createMinimalTracker();
      applyMasterDataBindingsMock.mockResolvedValue({
        tracker: { ...tracker, masterDataScope: "project" },
        actions: [],
      });

      await postProcessBuilderOutput(
        { tracker },
        {
          masterDataScope: "project",
          userId: "user-1",
          projectId: "project-1",
          moduleId: null,
        },
      );

      expect(applyMasterDataBindingsMock).toHaveBeenCalled();
    });

    it("falls back to tracker scope when projectId is missing", async () => {
      const tracker = createMinimalTracker();
      await postProcessBuilderOutput(
        { tracker },
        {
          masterDataScope: "module",
          userId: "user-1",
          projectId: null,
          moduleId: null,
        },
      );

      expect(buildBindingsFromSchemaMock).toHaveBeenCalled();
      expect(applyMasterDataBindingsMock).not.toHaveBeenCalled();
    });

    it("always calls autoFixBindings", async () => {
      const tracker = createMinimalTracker();
      await postProcessBuilderOutput(
        { tracker },
        {
          masterDataScope: "tracker",
          userId: "user-1",
          projectId: null,
          moduleId: null,
        },
      );

      expect(autoFixBindingsMock).toHaveBeenCalled();
    });
  });

  describe("binding integrity validation", () => {
    it("accepts bindings with empty sourceId pointing to local grids", async () => {
      const tracker = createMinimalTracker({
        fields: [
          { id: "status", dataType: "options", ui: { label: "Status" }, config: {} },
          { id: "status_option", dataType: "string", ui: { label: "Status" }, config: {} },
        ],
        grids: [
          { id: "tasks_grid", name: "Tasks", sectionId: "main_section", placeId: 1, config: {} },
          { id: "status_options_grid", name: "Status", sectionId: "main_section", placeId: 2, config: {} },
        ],
        layoutNodes: [
          { gridId: "tasks_grid", fieldId: "status", order: 1 },
          { gridId: "status_options_grid", fieldId: "status_option", order: 1 },
        ],
        bindings: {
          "tasks_grid.status": {
            optionsGrid: "status_options_grid",
            labelField: "status_options_grid.status_option",
            fieldMappings: [{ from: "status_options_grid.status_option", to: "tasks_grid.status" }],
          },
        },
      });

      const result = await postProcessBuilderOutput(
        { tracker },
        {
          masterDataScope: "tracker",
          userId: "user-1",
          projectId: null,
          moduleId: null,
        },
      );

      expect(result.output.tracker).toBeDefined();
    });

    it("strips bindings with unresolved placeholder sourceId", async () => {
      const tracker = createMinimalTracker({
        bindings: {
          "tasks_grid.status": {
            optionsSourceSchemaId: "__master_data__",
            optionsGrid: "status_grid",
            labelField: "status_grid.value",
          },
        },
      });

      const result = await postProcessBuilderOutput(
        { tracker },
        {
          masterDataScope: "tracker",
          userId: "user-1",
          projectId: null,
          moduleId: null,
        },
      );

      const stripped = result.toolCalls.filter((tc) =>
        tc.id.startsWith("binding-stripped-"),
      );
      expect(stripped.length).toBeGreaterThan(0);
      expect(
        (result.output.tracker as Record<string, unknown>).bindings,
      ).not.toHaveProperty("tasks_grid.status");
    });

    it("strips bindings when sourceId is empty and optionsGrid does not exist", async () => {
      const tracker = createMinimalTracker({
        bindings: {
          "tasks_grid.status": {
            optionsGrid: "nonexistent_grid",
            labelField: "nonexistent_grid.value",
          },
        },
      });

      const result = await postProcessBuilderOutput(
        { tracker },
        {
          masterDataScope: "tracker",
          userId: "user-1",
          projectId: null,
          moduleId: null,
        },
      );

      const stripped = result.toolCalls.filter((tc) =>
        tc.id.startsWith("binding-stripped-"),
      );
      expect(stripped.length).toBeGreaterThan(0);
    });
  });

  describe("expression intent resolution", () => {
    it("skips expression resolution when no intents are found", async () => {
      const tracker = createMinimalTracker();
      collectExprIntentsMock.mockReturnValue([]);

      await postProcessBuilderOutput(
        { tracker },
        {
          masterDataScope: "tracker",
          userId: "user-1",
          projectId: null,
          moduleId: null,
        },
      );

      expect(runGenerateExprIntentMock).not.toHaveBeenCalled();
    });
  });

  describe("tracker validation", () => {
    it("throws when final validation fails", async () => {
      const tracker = createMinimalTracker();
      validateTrackerMock.mockReturnValue({
        valid: false,
        errors: ["Missing required field"],
      });

      await expect(
        postProcessBuilderOutput(
          { tracker },
          {
            masterDataScope: "tracker",
            userId: "user-1",
            projectId: null,
            moduleId: null,
          },
        ),
      ).rejects.toThrow(/Schema validation failed/);
    });
  });

  describe("tool calls generation", () => {
    it("generates tool calls for binding changes", async () => {
      const tracker = createMinimalTracker({
        bindings: {},
      });

      buildBindingsFromSchemaMock.mockImplementation((t: Record<string, unknown>) => ({
        ...t,
        bindings: {
          "tasks_grid.status": {
            optionsGrid: "status_options_grid",
            labelField: "status_options_grid.status_option",
            fieldMappings: [],
          },
        },
      }));

      autoFixBindingsMock.mockImplementation((t: Record<string, unknown>) => ({
        ...t,
        grids: [
          ...(t.grids as Array<Record<string, unknown>>),
          { id: "status_options_grid", name: "Status", sectionId: "main_section", placeId: 2, config: {} },
        ],
        layoutNodes: [
          ...(t.layoutNodes as Array<Record<string, unknown>>),
          { gridId: "status_options_grid", fieldId: "status_option", order: 1 },
        ],
      }));

      const result = await postProcessBuilderOutput(
        { tracker },
        {
          masterDataScope: "tracker",
          userId: "user-1",
          projectId: null,
          moduleId: null,
        },
      );

      const bindingCalls = result.toolCalls.filter((tc) => tc.purpose === "binding");
      expect(bindingCalls.length).toBeGreaterThan(0);
    });

    it("generates tool calls for master data actions", async () => {
      const tracker = createMinimalTracker();
      applyMasterDataBindingsMock.mockResolvedValue({
        tracker: { ...tracker, masterDataScope: "module" },
        actions: [
          { type: "create", name: "Status", key: "status", trackerId: "md-1" },
          { type: "lookup", name: "Priority", key: "priority", trackerId: "md-2" },
        ],
      });

      const result = await postProcessBuilderOutput(
        { tracker },
        {
          masterDataScope: "module",
          userId: "user-1",
          projectId: "project-1",
          moduleId: "module-1",
        },
      );

      const mdCalls = result.toolCalls.filter(
        (tc) => tc.purpose === "master-data-create" || tc.purpose === "master-data-lookup",
      );
      expect(mdCalls).toHaveLength(2);
    });
  });

  describe("masterDataScope handling", () => {
    it("sets masterDataScope on output tracker", async () => {
      const tracker = createMinimalTracker();
      const result = await postProcessBuilderOutput(
        { tracker },
        {
          masterDataScope: "tracker",
          userId: "user-1",
          projectId: null,
          moduleId: null,
        },
      );

      expect(
        (result.output.tracker as Record<string, unknown>).masterDataScope,
      ).toBe("tracker");
    });

    it("normalizes masterDataScope values", async () => {
      const tracker = createMinimalTracker();
      const result = await postProcessBuilderOutput(
        { tracker },
        {
          masterDataScope: "TRACKER",
          userId: "user-1",
          projectId: null,
          moduleId: null,
        },
      );

      expect(
        (result.output.tracker as Record<string, unknown>).masterDataScope,
      ).toBe("tracker");
    });
  });
});
