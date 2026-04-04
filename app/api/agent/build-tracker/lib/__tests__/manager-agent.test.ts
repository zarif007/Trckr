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

import { runManagerAgent } from "../manager-agent";
import type { PromptInputs } from "../prompts";

const validManagerOutput = {
  thinking: "Plan created",
  prd: { name: "Task Tracker", keyFeatures: [], suggestedModules: [] },
  builderTodo: [],
  requiredMasterData: [],
};

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

describe("runManagerAgent", () => {
  const write = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    generateObjectMock.mockReturnValue({ object: validManagerOutput, usage: undefined });
  });

  it("writes manager_complete with the final schema via fallback", async () => {
    await runManagerAgent(promptInputs(), write, {});

    const completeEvent = write.mock.calls.find((c) => c[0].t === "manager_complete");
    expect(completeEvent).toBeDefined();
    expect(completeEvent[0].manager.thinking).toBe("Plan created");
  });

  it("returns the manager schema object", async () => {
    const result = await runManagerAgent(promptInputs(), write, {});

    expect(result.thinking).toBe("Plan created");
    expect(result.prd?.name).toBe("Task Tracker");
  });

  it("falls back to minimal prompt when generateObject fails", async () => {
    generateObjectMock.mockRejectedValueOnce(new Error("API failure"));
    generateObjectMock.mockResolvedValueOnce({
      object: { ...validManagerOutput, thinking: "Minimal plan" },
      usage: undefined,
    });

    await runManagerAgent(promptInputs(), write, { logContext: {} as any });

    expect(logAiErrorMock).toHaveBeenCalled();
    const completeEvent = write.mock.calls.find((c) => c[0].t === "manager_complete");
    expect(completeEvent).toBeDefined();
    expect(completeEvent[0].manager.thinking).toBe("Minimal plan");
  });

  it("throws when all paths fail", async () => {
    generateObjectMock.mockRejectedValue(new Error("All paths failed"));

    await expect(runManagerAgent(promptInputs(), write, {})).rejects.toThrow(
      "All paths failed",
    );
  });
});
