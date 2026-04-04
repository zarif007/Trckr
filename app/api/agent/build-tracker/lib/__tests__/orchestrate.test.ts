import { beforeEach, describe, expect, it, vi } from "vitest";

const runManagerAgentMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    thinking: "Planning...",
    prd: { name: "Test Tracker", keyFeatures: [], suggestedModules: [] },
    builderTodo: [{ task: "Create grid", target: "grid", action: "create" }],
    requiredMasterData: [],
  }),
);
const runMasterDataAgentMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue([]),
);
const runBuilderAgentMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ tracker: { tabs: [] } }),
);
const postProcessMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    output: { tracker: { tabs: [], bindings: {} } },
    toolCalls: [],
  }),
);
const logAiStageMock = vi.hoisted(() => vi.fn());
const logAiErrorMock = vi.hoisted(() => vi.fn());
const encodeEventMock = vi.hoisted(() => vi.fn((evt) => JSON.stringify(evt)));

vi.mock("@/lib/ai", () => ({
  logAiStage: logAiStageMock,
  logAiError: logAiErrorMock,
}));
vi.mock("@/lib/agent/events", () => ({ encodeEvent: encodeEventMock }));
vi.mock("../manager-agent", () => ({ runManagerAgent: runManagerAgentMock }));
vi.mock("../master-data-agent", () => ({ runMasterDataAgent: runMasterDataAgentMock }));
vi.mock("../builder-agent", () => ({ runBuilderAgent: runBuilderAgentMock }));
vi.mock("../postprocess", () => ({ postProcessBuilderOutput: postProcessMock }));

import { orchestrateBuildTracker } from "../orchestrate";
import type { PromptInputs } from "../prompts";

function makeController(): ReadableStreamDefaultController<Uint8Array> & { enqueued: string[] } {
  const enqueued: string[] = [];
  const controller = {
    enqueue: vi.fn((data: Uint8Array) => {
      enqueued.push(new TextDecoder().decode(data));
    }),
  };
  return Object.assign(controller, { enqueued }) as unknown as ReadableStreamDefaultController<Uint8Array> & { enqueued: string[] };
}

function promptInputs(): PromptInputs {
  return {
    query: "build a test tracker",
    currentStateBlock: "",
    hasFullTrackerStateForPatch: false,
    conversationContext: "",
    hasMessages: false,
  };
}

describe("orchestrateBuildTracker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runManagerAgentMock.mockResolvedValue({
      thinking: "Planning...",
      prd: { name: "Test Tracker", keyFeatures: [], suggestedModules: [] },
      builderTodo: [],
      requiredMasterData: [],
    });
    runMasterDataAgentMock.mockResolvedValue([]);
    runBuilderAgentMock.mockResolvedValue({ tracker: { tabs: [] } });
    postProcessMock.mockResolvedValue({ output: { tracker: { tabs: [] } }, toolCalls: [] });
  });

  it("runs all three phases and writes phase markers", async () => {
    const controller = makeController();

    await orchestrateBuildTracker(promptInputs(), controller, { userId: "user-1" });

    const events = controller.enqueued.map((e) => JSON.parse(e));
    const types = events.map((e: Record<string, string>) => e.t);

    expect(types).toContain("phase");
    expect(types).toContain("builder_finish");

    const phaseMarkers = events.filter((e: Record<string, string>) => e.t === "phase");
    expect(phaseMarkers.length).toBeGreaterThanOrEqual(1);
  });

  it("passes userId through to post-processing", async () => {
    const controller = makeController();

    await orchestrateBuildTracker(promptInputs(), controller, {
      userId: "user-123",
    });

    expect(postProcessMock).toHaveBeenCalled();
    expect(postProcessMock.mock.calls[0][1].userId).toBe("user-123");
  });

  it("skips post-processing when userId is absent", async () => {
    const controller = makeController();

    await orchestrateBuildTracker(promptInputs(), controller);

    expect(postProcessMock).not.toHaveBeenCalled();
  });

  it("skips master-data phase when manager requires no master data", async () => {
    const controller = makeController();

    await orchestrateBuildTracker(promptInputs(), controller, {
      userId: "user-1",
      projectId: "project-1",
      masterDataScope: "module",
    });

    expect(logAiStageMock).not.toHaveBeenCalled();
  });

  it("runs master-data phase when manager requires master data and scope is module", async () => {
    runManagerAgentMock.mockResolvedValue({
      thinking: "Needs entities",
      prd: { name: "HR Tracker", keyFeatures: [], suggestedModules: [] },
      builderTodo: [],
      requiredMasterData: [{ key: "department", name: "Department" }],
    });
    runMasterDataAgentMock.mockResolvedValue([
      {
        key: "department",
        name: "Department",
        trackerId: "md-1",
        gridId: "department_grid",
        labelFieldId: "dept_name",
      },
    ]);

    const controller = makeController();

    await orchestrateBuildTracker(promptInputs(), controller, {
      userId: "user-1",
      projectId: "project-1",
      moduleId: "module-1",
      masterDataScope: "module",
    });

    expect(runMasterDataAgentMock).toHaveBeenCalled();
    const events = controller.enqueued.map((e) => JSON.parse(e));
    const phases = events.filter((e: Record<string, string>) => e.t === "phase");
    expect(phases.map((p: Record<string, string>) => p.phase)).toContain("master-data");
  });

  it("skips master-data phase when scope is tracker", async () => {
    runManagerAgentMock.mockResolvedValue({
      requiredMasterData: [{ key: "status", name: "Status" }],
      builderTodo: [],
    });

    const controller = makeController();

    await orchestrateBuildTracker(promptInputs(), controller, {
      userId: "user-1",
      projectId: "project-1",
      masterDataScope: "tracker",
    });

    expect(runMasterDataAgentMock).not.toHaveBeenCalled();
  });

  it("passes resolved master data to builder when available", async () => {
    runManagerAgentMock.mockResolvedValue({
      requiredMasterData: [{ key: "priority", name: "Priority" }],
      builderTodo: [],
    });
    runMasterDataAgentMock.mockResolvedValue([
      {
        key: "priority",
        name: "Priority",
        trackerId: "md-priority",
        gridId: "priority_grid",
        labelFieldId: "priority_name",
      },
    ]);

    const controller = makeController();

    await orchestrateBuildTracker(promptInputs(), controller, {
      userId: "user-1",
      projectId: "project-1",
      moduleId: "module-1",
      masterDataScope: "module",
    });

    const builderInputs = runBuilderAgentMock.mock.calls[0][0] as PromptInputs;
    expect(builderInputs.resolvedMasterData).toHaveLength(1);
    expect(builderInputs.resolvedMasterData?.[0]?.key).toBe("priority");
    expect(builderInputs.masterDataScope).toBe("module");
  });

  it("does not pass master data to builder when master data agent returns empty", async () => {
    runManagerAgentMock.mockResolvedValue({
      requiredMasterData: [{ key: "status", name: "Status" }],
      builderTodo: [],
    });
    runMasterDataAgentMock.mockResolvedValue([]);

    const controller = makeController();

    await orchestrateBuildTracker(promptInputs(), controller, {
      userId: "user-1",
      projectId: "project-1",
      moduleId: "module-1",
      masterDataScope: "module",
    });

    const builderInputs = runBuilderAgentMock.mock.calls[0][0] as PromptInputs;
    expect(builderInputs.resolvedMasterData).toBeUndefined();
    expect(builderInputs.masterDataScope).toBeUndefined();
  });

  it("skips master-data phase when projectId is missing", async () => {
    runManagerAgentMock.mockResolvedValue({
      requiredMasterData: [{ key: "status", name: "Status" }],
      builderTodo: [],
    });

    const controller = makeController();

    await orchestrateBuildTracker(promptInputs(), controller, {
      userId: "user-1",
      projectId: null,
      moduleId: null,
      masterDataScope: "module",
    });

    expect(runMasterDataAgentMock).not.toHaveBeenCalled();
  });

  it("skips master-data phase when userId is missing", async () => {
    runManagerAgentMock.mockResolvedValue({
      requiredMasterData: [{ key: "status", name: "Status" }],
      builderTodo: [],
    });

    const controller = makeController();

    await orchestrateBuildTracker(promptInputs(), controller, {
      userId: undefined,
      projectId: "project-1",
      masterDataScope: "module",
    });

    expect(runMasterDataAgentMock).not.toHaveBeenCalled();
  });

  it("master-data errors are non-fatal and builder still runs", async () => {
    runManagerAgentMock.mockResolvedValue({
      requiredMasterData: [{ key: "status", name: "Status" }],
      builderTodo: [],
    });
    runMasterDataAgentMock.mockRejectedValue(new Error("Database connection failed"));

    const controller = makeController();

    await expect(orchestrateBuildTracker(promptInputs(), controller, {
      userId: "user-1",
      projectId: "project-1",
      masterDataScope: "module",
      logContext: {} as any,
    })).resolves.toBeUndefined();

    expect(runBuilderAgentMock).toHaveBeenCalled();
    expect(logAiErrorMock).toHaveBeenCalled();
  });

  it("writes builder_finish with toolCalls from post-processing", async () => {
    postProcessMock.mockResolvedValue({
      output: { tracker: { tabs: [] } },
      toolCalls: [
        {
          id: "tc-1",
          purpose: "binding" as const,
          description: "Added binding",
          status: "done" as const,
        },
      ],
    });

    const controller = makeController();

    await orchestrateBuildTracker(promptInputs(), controller, { userId: "user-1" });

    const events = controller.enqueued.map((e) => JSON.parse(e));
    const finishEvent = events.find((e: Record<string, string>) => e.t === "builder_finish");
    expect(finishEvent).toBeDefined();
    expect(finishEvent.toolCalls).toHaveLength(1);
  });

  it("uses current tracker as base tracker for patch mode in post-processing", async () => {
    const baseTracker = { tabs: [{ id: "overview_tab" }] };

    await orchestrateBuildTracker(promptInputs(), makeController(), {
      userId: "user-1",
      currentTracker: baseTracker,
    });

    expect(postProcessMock).toHaveBeenCalled();
    expect(postProcessMock.mock.calls[0][1].baseTracker).toEqual(baseTracker);
  });

  it("uses project scope for post-processing", async () => {
    await orchestrateBuildTracker(promptInputs(), makeController(), {
      userId: "user-1",
      masterDataScope: "project",
      projectId: "project-1",
    });

    expect(postProcessMock.mock.calls[0][1].masterDataScope).toBe("project");
  });
});
