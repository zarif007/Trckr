import { z } from "zod";

export const toolCallSchema = z.object({
  purpose: z.enum([
    "validation",
    "calculation",
    "field-rule",
    "binding",
    "master-data-lookup",
    "master-data-create",
  ]),
  fieldPath: z.string(),
  description: z.string(),
  status: z.enum(["pending", "running", "done", "error"]),
  error: z.string().optional(),
  result: z.unknown().optional(),
});

export const createMessageBodySchema = z
  .object({
    role: z.string().optional(),
    content: z.string().optional(),
    trackerSchemaSnapshot: z.unknown().optional(),
    managerData: z.unknown().optional(),
    toolCalls: z.array(toolCallSchema).optional(),
  })
  .passthrough();
