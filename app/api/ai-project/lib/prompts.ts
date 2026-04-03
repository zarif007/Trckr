import projectOrchestratorPrompt from "@/lib/prompts/project-orchestrator";
import projectOrchestratorSinglePrompt from "@/lib/prompts/project-orchestrator-single";
import projectPlannerPrompt from "@/lib/prompts/project-planner";

export function getOrchestratorSystemPrompt(): string {
  return projectOrchestratorPrompt;
}

export function getOrchestratorSingleSystemPrompt(): string {
  return projectOrchestratorSinglePrompt;
}

export function getPlannerSystemPrompt(): string {
  return projectPlannerPrompt;
}

export function buildQuestionsPrompt(userPrompt: string): string {
  return `User prompt:\n${userPrompt.trim()}\n\nGenerate the questionnaire now.`;
}

export function buildSingleQuestionPrompt(
  userPrompt: string,
  answers: Record<string, unknown>,
): string {
  const formattedAnswers = Object.entries(answers)
    .map(([key, value]) => `- ${key}: ${formatAnswerValue(value)}`)
    .join("\n");

  return `User prompt:\n${userPrompt.trim()}\n\nPrevious answers:\n${formattedAnswers || "- (none)"}\n\nOutput the next question or { "done": true } if you have enough.`;
}

function formatAnswerValue(value: unknown): string {
  if (Array.isArray(value)) return value.map(String).join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value == null) return "";
  return String(value);
}

export function buildPlanPrompt(
  userPrompt: string,
  answers: Record<string, unknown>,
): string {
  const formattedAnswers = Object.entries(answers)
    .map(([key, value]) => `- ${key}: ${formatAnswerValue(value)}`)
    .join("\n");

  return `User prompt:\n${userPrompt.trim()}\n\nQuestionnaire answers:\n${formattedAnswers || "- (none)"}\n\nCreate the project plan now.`;
}

export function buildTrackerBuilderPrompt(input: {
  project: {
    name: string;
    description?: string;
    industry?: string;
    goals?: string[];
  };
  modules?: Array<{ name: string; description?: string }>;
  tracker: {
    name: string;
    description?: string;
    module?: string | null;
    prompt: string;
    instance: "SINGLE" | "MULTI";
    versionControl: boolean;
    autoSave: boolean;
    masterDataScope?: "tracker" | "module" | "project";
  };
}): string {
  const moduleLabel = input.tracker.module
    ? `Module: ${input.tracker.module}`
    : "Module: (none)";
  const goals = input.project.goals?.length
    ? input.project.goals.join(", ")
    : "None";
  const modules = input.modules?.length
    ? input.modules
        .map((m) => `- ${m.name}${m.description ? `: ${m.description}` : ""}`)
        .join("\n")
    : "- (none)";

  return `
Project context:
- Name: ${input.project.name}
- Industry: ${input.project.industry ?? "Unspecified"}
- Description: ${input.project.description ?? "Unspecified"}
- Goals: ${goals}
- Modules:\n${modules}

Tracker to build:
- Name: ${input.tracker.name}
- ${moduleLabel}
- Description: ${input.tracker.description ?? "Unspecified"}
- Instance: ${input.tracker.instance}
- Version control: ${input.tracker.versionControl ? "Enabled" : "Disabled"}
- Auto save: ${input.tracker.autoSave ? "Enabled" : "Disabled"}
- Master data scope: ${input.tracker.masterDataScope ?? "tracker"}

Builder instructions:
${input.tracker.prompt}

Create a complete tracker schema that satisfies the instructions.
`;
}
