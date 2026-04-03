import { z } from "zod";

export const analystSchema = z.object({
  thinking: z
    .string()
    .optional()
    .describe(
      "Internal reasoning about the data before composing the response. Not shown to users.",
    ),
  content: z
    .string()
    .describe(
      "The analysis response in well-structured markdown. Use headings, bullet points, tables, and bold/italic for clarity.",
    ),
});

export type AnalystSchema = z.infer<typeof analystSchema>;
