import { beforeEach, describe, expect, it, vi } from "vitest";

const generateObjectMock = vi.hoisted(() => vi.fn());
const logAiStageMock = vi.hoisted(() => vi.fn());
const logAiErrorMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/ai", () => ({
  getDefaultAiProvider: vi.fn(() => ({
    generateObject: vi.fn(async () => generateObjectMock()),
  })),
  logAiStage: logAiStageMock,
  logAiError: logAiErrorMock,
}));

vi.mock("@/lib/ai/structured-json-repair", () => ({
  repairStructuredJsonText: vi.fn(),
}));

import { runBuilderAgent } from "../builder-agent";
import type { PromptInputs } from "../prompts";
import type { ManagerSchema } from "@/lib/schemas/multi-agent";

function promptInputs(overrides: Partial<PromptInputs> = {}): PromptInputs {
  return {
    query: "Build a task tracker",
    currentStateBlock: "",
    hasFullTrackerStateForPatch: false,
    conversationContext: "",
    hasMessages: false,
    ...overrides,
  };
}

function makeManager(overrides: Partial<ManagerSchema> = {}): ManagerSchema {
  return {
    thinking: "Planning...",
    prd: { name: "Task Tracker", keyFeatures: [], suggestedModules: [] },
    builderTodo: [{ task: "Create grid", target: "grid", action: "create" }],
    requiredMasterData: [],
    ...overrides,
  };
}

const validBuilderOutput = {
  tracker: {
    tabs: [{ id: "overview_tab", name: "Overview", placeId: 0, config: {} }],
    sections: [
      { id: "main_section", name: "Main", tabId: "overview_tab", placeId: 1, config: {} },
    ],
    grids: [
      { id: "tasks_grid", name: "Tasks", sectionId: "main_section", placeId: 1, config: {} },
    ],
    fields: [{ id: "title", dataType: "string", ui: { label: "Title" }, config: {} }],
    layoutNodes: [{ gridId: "tasks_grid", fieldId: "title", order: 1 }],
    bindings: {},
  },
};

describe("runBuilderAgent", () => {
  const write = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    generateObjectMock.mockReturnValue({ object: validBuilderOutput, usage: undefined });
  });

  it("writes builder_finish event with the schema via fallback", async () => {
    const manager = makeManager();
    const result = await runBuilderAgent(promptInputs(), manager, write, {});

    expect(result.tracker).toBeDefined();
    expect((result.tracker as Record<string, unknown>).tabs).toHaveLength(1);
  });

  it("returns patch output when trackerPatch is provided", async () => {
    generateObjectMock.mockReturnValue({
      object: {
        trackerPatch: {
          fields: [{ id: "new_field", dataType: "string", ui: { label: "New Field" } }],
        },
      },
      usage: undefined,
    });

    const manager = makeManager();
    const result = await runBuilderAgent(promptInputs(), manager, write, {});

    expect(result.tracker).toBeUndefined();
    expect(result.trackerPatch).toBeDefined();
  });

  it("throws when output has neither tracker nor trackerPatch", async () => {
    generateObjectMock.mockResolvedValue({ object: {}, usage: undefined });

    const manager = makeManager();

    await expect(runBuilderAgent(promptInputs(), manager, write, {})).rejects.toThrow(
      "Builder: all streaming and fallback attempts failed",
    );
  });

  it("throws when all fallback attempts fail", async () => {
    generateObjectMock.mockRejectedValue(new Error("All attempts failed"));

    const manager = makeManager();

    await expect(runBuilderAgent(promptInputs(), manager, write, {})).rejects.toThrow(
      "All attempts failed",
    );
  });
});
