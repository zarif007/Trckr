import { describe, expect, it } from "vitest";
import { createMessageBodySchema, toolCallSchema } from "../message-body-schema";

describe("toolCallSchema", () => {
  it("accepts valid tool call shape", () => {
    const r = toolCallSchema.safeParse({
      purpose: "validation",
      fieldPath: "g.f",
      description: "Check",
      status: "done",
    });
    expect(r.success).toBe(true);
  });

  it("rejects invalid purpose", () => {
    const r = toolCallSchema.safeParse({
      purpose: "other",
      fieldPath: "g.f",
      description: "x",
      status: "pending",
    });
    expect(r.success).toBe(false);
  });
});

describe("createMessageBodySchema", () => {
  it("parses empty object", () => {
    const r = createMessageBodySchema.safeParse({});
    expect(r.success).toBe(true);
  });

  it("accepts toolCalls array", () => {
    const r = createMessageBodySchema.safeParse({
      role: "USER",
      content: "hi",
      toolCalls: [
        {
          purpose: "binding",
          fieldPath: "a.b",
          description: "d",
          status: "running",
        },
      ],
    });
    expect(r.success).toBe(true);
  });
});
