import { describe, expect, it } from "vitest";
import {
  getManagerSystemPrompt,
  getBuilderSystemPrompt,
  buildManagerUserPrompt,
  buildBuilderUserPrompt,
  buildBuilderFallbackPrompts,
  type PromptInputs,
} from "../prompts";
import type { ManagerSchema } from "@/lib/schemas/multi-agent";

function createPromptInputs(overrides: Partial<PromptInputs> = {}): PromptInputs {
  return {
    query: "build a task tracker",
    currentStateBlock: "",
    hasFullTrackerStateForPatch: false,
    conversationContext: "",
    hasMessages: false,
    ...overrides,
  };
}

function createManager(overrides: Partial<ManagerSchema> = {}): ManagerSchema {
  return {
    thinking: "Users need to track tasks across sprints.",
    prd: {
      name: "Task Tracker",
      keyFeatures: ["Task creation", "Status tracking", "Sprint management"],
      suggestedModules: [],
    },
    builderTodo: [
      { task: "Create overview tab", target: "tab", action: "create" as const },
      { task: "Create tasks grid", target: "grid", action: "create" as const },
    ],
    requiredMasterData: [{ key: "status", name: "Status", labelFieldId: "status_name" }],
    ...overrides,
  };
}

describe("prompt building", () => {
  describe("system prompts", () => {
    it("getManagerSystemPrompt includes manager prompt content", () => {
      const prompt = getManagerSystemPrompt();

      expect(prompt).toContain("Manager");
      expect(prompt).toContain("token budget");
      expect(prompt).toBeTypeOf("string");
      expect(prompt.length).toBeGreaterThan(0);
    });

    it("getBuilderSystemPrompt includes builder philosophy", () => {
      const prompt = getBuilderSystemPrompt();

      expect(prompt).toContain("BUILDER PHILOSOPHY");
      expect(prompt).toContain("builderTodo");
      expect(prompt).toContain("token budget");
      expect(prompt).toBeTypeOf("string");
      expect(prompt.length).toBeGreaterThan(0);
    });

    it("builder prompt references master data scope rules", () => {
      const prompt = getBuilderSystemPrompt();

      expect(prompt).toContain("MASTER DATA SCOPE RULE");
    });
  });

  describe("buildManagerUserPrompt", () => {
    it("builds prompt with query and scope context", () => {
      const inputs = createPromptInputs({ masterDataScope: "tracker" });
      const result = buildManagerUserPrompt(inputs);

      expect(result).toContain("build a task tracker");
      expect(result).toContain("Master Data Scope: tracker");
    });

    it("builds prompt without scope when scope is empty", () => {
      const inputs = createPromptInputs({ masterDataScope: "" });
      const result = buildManagerUserPrompt(inputs);

      expect(result).toContain("build a task tracker");
    });

    it("includes conversation context when present", () => {
      const inputs = createPromptInputs({
        query: "add a kanban view",
        conversationContext: "We've been discussing a project tracker.",
        hasMessages: true,
      });
      const result = buildManagerUserPrompt(inputs);

      expect(result).toContain("We've been discussing a project tracker.");
      expect(result).toContain("add a kanban view");
      expect(result).toContain("update or create");
    });

    it("includes patch mode hint when full tracker state is present", () => {
      const inputs = createPromptInputs({
        currentStateBlock: "Current Tracker State: {...}",
        hasFullTrackerStateForPatch: true,
        conversationContext: "",
        hasMessages: false,
      });
      const result = buildManagerUserPrompt(inputs);

      expect(result).toContain("Current Tracker State");
      expect(result).toContain("analyze the user's request and produce a PRD");
      expect(result).toContain("produce a PRD + builderTodo for the changes needed");
    });
  });

  describe("buildBuilderUserPrompt", () => {
    it("injects manager plan into prompt", () => {
      const inputs = createPromptInputs();
      const manager = createManager();
      const result = buildBuilderUserPrompt(inputs, manager);

      expect(result).toContain("build a task tracker");
      expect(result).toContain("Manager Plan");
      expect(result).toContain("Task Tracker");
    });

    it("injects resolved master data into prompt", () => {
      const inputs = createPromptInputs({
        resolvedMasterData: [
          {
            key: "status",
            name: "Status",
            trackerId: "md-tracker-1",
            gridId: "md_grid_1",
            labelFieldId: "status_name",
          },
        ],
      });
      const manager = createManager();
      const result = buildBuilderUserPrompt(inputs, manager);

      expect(result).toContain("Pre-Resolved Master Data");
      expect(result).toContain("status");
      expect(result).toContain("md-tracker-1");
      expect(result).toContain("md_grid_1");
    });

    it("includes current tracker state hint when patch mode", () => {
      const inputs = createPromptInputs({
        currentStateBlock: "Current Tracker State: {...}",
        hasFullTrackerStateForPatch: true,
      });
      const manager = createManager();
      const result = buildBuilderUserPrompt(inputs, manager);

      expect(result).toContain("Start from the Current Tracker State above");
    });

    it("handles empty resolved master data", () => {
      const inputs = createPromptInputs({ resolvedMasterData: [] });
      const manager = createManager();
      const result = buildBuilderUserPrompt(inputs, manager);

      expect(result).not.toContain("Pre-Resolved Master Data");
    });

    it("handles null resolved master data", () => {
      const inputs = createPromptInputs({ resolvedMasterData: null });
      const manager = createManager();
      const result = buildBuilderUserPrompt(inputs, manager);

      expect(result).not.toContain("Pre-Resolved Master Data");
    });
  });

  describe("buildBuilderFallbackPrompts", () => {
    it("returns 3 fallback prompts", () => {
      const inputs = createPromptInputs();
      const manager = createManager();
      const prompts = buildBuilderFallbackPrompts(inputs, manager);

      expect(prompts).toHaveLength(3);
      prompts.forEach((p) => {
        expect(typeof p).toBe("string");
        expect(p.length).toBeGreaterThan(0);
      });
    });

    it("first fallback includes manager plan context", () => {
      const inputs = createPromptInputs();
      const manager = createManager();
      const [first] = buildBuilderFallbackPrompts(inputs, manager);

      expect(first).toContain("Manager");
    });

    it("second fallback reduces context to scope and state", () => {
      const inputs = createPromptInputs({
        currentStateBlock: "Current Tracker State: {...}",
      });
      const manager = createManager();
      const [, second] = buildBuilderFallbackPrompts(inputs, manager);

      expect(second).toContain("Current Tracker State");
      expect(second).not.toContain("Manager");
    });

    it("third fallback is completely minimal", () => {
      const inputs = createPromptInputs();
      const manager = createManager();
      const [, , third] = buildBuilderFallbackPrompts(inputs, manager);

      expect(third).toContain("minimal valid tracker JSON");
    });

    it("fallbacks include state hint in patch mode", () => {
      const inputs = createPromptInputs({
        currentStateBlock: "Current Tracker State: {...}",
        hasFullTrackerStateForPatch: true,
      });
      const manager = createManager();
      const prompts = buildBuilderFallbackPrompts(inputs, manager);

      prompts.slice(0, 2).forEach((p) => {
        expect(p).toContain("Current Tracker State");
      });
    });
  });

  describe("edge cases", () => {
    it("handles whitespace-only query", () => {
      const inputs = createPromptInputs({ query: "   " });
      const result = buildManagerUserPrompt(inputs);

      expect(result).toContain("   ");
    });

    it("handles whitespace-only scope", () => {
      const inputs = createPromptInputs({ masterDataScope: "   " });
      const result = buildManagerUserPrompt(inputs);

      expect(result).not.toContain("Master Data Scope");
    });

    it("handles null scope", () => {
      const inputs = createPromptInputs({ masterDataScope: null });
      const managerResult = buildManagerUserPrompt(inputs);
      const builderInputs = createPromptInputs({ masterDataScope: null });
      const builderResult = buildBuilderUserPrompt(builderInputs, createManager());

      expect(managerResult).not.toContain("Master Data Scope");
      expect(builderResult).not.toContain("Master Data Scope");
    });

    it("manager todo with phase markers are formatted correctly", () => {
      const inputs = createPromptInputs();
      const manager = createManager({
        builderTodo: [
          { task: "PHASE 1: TABS - Create main tabs", target: "tab", action: "create" },
          { task: "Add tasks grid", target: "grid", action: "create" },
          { task: "PHASE 2: BINDINGS - Wire fields", target: "bindings", action: "create" },
        ],
      });
      const result = buildBuilderUserPrompt(inputs, manager);

      expect(result).toContain("PHASE 1: TABS");
      expect(result).toContain("PHASE 2: BINDINGS");
    });
  });
});
