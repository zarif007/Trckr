import { analystPrompt } from "@/lib/prompts/analyst";

export interface AnalystPromptInputs {
  query: string;
  schemaContext: string;
  dataContext: string;
  conversationContext: string;
}

export function getAnalystSystemPrompt(): string {
  return analystPrompt;
}

export function buildAnalystUserPrompt(inputs: AnalystPromptInputs): string {
  const parts: string[] = [];

  if (inputs.schemaContext) {
    parts.push(inputs.schemaContext);
  }

  if (inputs.dataContext) {
    parts.push(inputs.dataContext);
  }

  if (inputs.conversationContext) {
    parts.push("## Conversation History\n");
    parts.push(inputs.conversationContext);
  }

  parts.push(`## User Request\n\n${inputs.query}`);

  return parts.join("\n");
}
