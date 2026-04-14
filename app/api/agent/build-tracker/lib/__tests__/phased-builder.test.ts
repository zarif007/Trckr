import { describe, expect, it } from "vitest";

import { shouldUsePhasedBuilder } from "../phased-builder";
import type { ManagerSchema } from "@/lib/schemas/multi-agent";
import type { PromptInputs } from "../prompts";

function baseInputs(overrides: Partial<PromptInputs> = {}): PromptInputs {
  return {
    query: "x",
    currentStateBlock: "",
    hasFullTrackerStateForPatch: false,
    conversationContext: "",
    hasMessages: false,
    ...overrides,
  };
}

describe("shouldUsePhasedBuilder", () => {
  it("returns true when builderTodo is at the threshold", () => {
    const manager: ManagerSchema = {
      builderTodo: Array.from({ length: 10 }, (_, i) => ({
        task: `t${i}`,
        target: "grid",
        action: "create",
      })),
    };
    expect(shouldUsePhasedBuilder(manager, baseInputs())).toBe(true);
  });

  it("returns false below threshold with short query", () => {
    const manager: ManagerSchema = {
      builderTodo: Array.from({ length: 9 }, (_, i) => ({
        task: `t${i}`,
        target: "grid",
        action: "create",
      })),
    };
    expect(shouldUsePhasedBuilder(manager, baseInputs())).toBe(false);
  });

  it("returns true for very long query", () => {
    const manager: ManagerSchema = { builderTodo: [] };
    expect(
      shouldUsePhasedBuilder(
        manager,
        baseInputs({ query: "y".repeat(2500) }),
      ),
    ).toBe(true);
  });

  it("returns false in patch mode even for large plans", () => {
    const manager: ManagerSchema = {
      builderTodo: Array.from({ length: 20 }, () => ({
        task: "t",
        target: "grid",
        action: "create",
      })),
    };
    expect(
      shouldUsePhasedBuilder(
        manager,
        baseInputs({ hasFullTrackerStateForPatch: true }),
      ),
    ).toBe(false);
  });
});
