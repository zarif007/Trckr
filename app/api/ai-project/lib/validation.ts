import { z } from "zod";
import { hasDeepSeekApiKey } from "@/lib/ai";
import { projectPlanSchema } from "@/lib/schemas/project-agent";

export type QuestionsParseResult =
  | { ok: true; prompt: string; projectId: string | null }
  | { ok: false; error: string; status: number };

export type QuestionParseResult =
  | {
      ok: true;
      prompt: string;
      answers: Record<string, unknown>;
      projectId: string | null;
    }
  | { ok: false; error: string; status: number };

export type PlanParseResult =
  | {
      ok: true;
      prompt: string;
      answers: Record<string, unknown>;
      projectId: string | null;
    }
  | { ok: false; error: string; status: number };

export type CreateParseResult =
  | { ok: true; plan: z.infer<typeof projectPlanSchema> }
  | { ok: false; error: string; status: number };

export type BuildParseResult =
  | {
      ok: true;
      projectId: string;
      moduleId?: string | null;
      trackerSpec: Record<string, unknown>;
      projectContext: Record<string, unknown>;
    }
  | { ok: false; error: string; status: number };

function getBodyObject(body: unknown): Record<string, unknown> | null {
  if (body == null || typeof body !== "object" || Array.isArray(body))
    return null;
  return body as Record<string, unknown>;
}

function optionalProjectId(obj: Record<string, unknown>): string | null {
  const v = obj.projectId;
  if (v == null) return null;
  if (typeof v !== "string" || !v.trim()) return null;
  return v.trim();
}

export function parseQuestionsBody(body: unknown): QuestionsParseResult {
  const obj = getBodyObject(body);
  if (!obj) {
    return {
      ok: false,
      error: 'Invalid request body. Expected JSON with "prompt".',
      status: 400,
    };
  }

  const prompt = obj.prompt;
  if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
    return {
      ok: false,
      error: "Prompt is required and must be a non-empty string.",
      status: 400,
    };
  }

  if (!hasDeepSeekApiKey()) {
    return {
      ok: false,
      error: "DEEPSEEK_API_KEY is not configured",
      status: 500,
    };
  }

  return { ok: true, prompt: prompt.trim(), projectId: optionalProjectId(obj) };
}

export function parseQuestionBody(body: unknown): QuestionParseResult {
  const obj = getBodyObject(body);
  if (!obj) {
    return {
      ok: false,
      error: 'Invalid request body. Expected JSON with "prompt".',
      status: 400,
    };
  }

  const prompt = obj.prompt;
  if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
    return {
      ok: false,
      error: "Prompt is required and must be a non-empty string.",
      status: 400,
    };
  }

  const answers = obj.answers;
  if (
    answers != null &&
    (typeof answers !== "object" || Array.isArray(answers))
  ) {
    return {
      ok: false,
      error: "Answers must be an object when provided.",
      status: 400,
    };
  }

  if (!hasDeepSeekApiKey()) {
    return {
      ok: false,
      error: "DEEPSEEK_API_KEY is not configured",
      status: 500,
    };
  }

  return {
    ok: true,
    prompt: prompt.trim(),
    answers: (answers as Record<string, unknown>) ?? {},
    projectId: optionalProjectId(obj),
  };
}

export function parsePlanBody(body: unknown): PlanParseResult {
  const obj = getBodyObject(body);
  if (!obj) {
    return {
      ok: false,
      error: 'Invalid request body. Expected JSON with "prompt" and "answers".',
      status: 400,
    };
  }

  const prompt = obj.prompt;
  const answers = obj.answers;

  if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
    return {
      ok: false,
      error: "Prompt is required and must be a non-empty string.",
      status: 400,
    };
  }
  if (
    answers == null ||
    typeof answers !== "object" ||
    Array.isArray(answers)
  ) {
    return { ok: false, error: "Answers must be an object.", status: 400 };
  }

  if (!hasDeepSeekApiKey()) {
    return {
      ok: false,
      error: "DEEPSEEK_API_KEY is not configured",
      status: 500,
    };
  }

  return {
    ok: true,
    prompt: prompt.trim(),
    answers: answers as Record<string, unknown>,
    projectId: optionalProjectId(obj),
  };
}

export function parseCreateBody(body: unknown): CreateParseResult {
  const obj = getBodyObject(body);
  if (!obj) {
    return {
      ok: false,
      error: 'Invalid request body. Expected JSON with "plan".',
      status: 400,
    };
  }

  const plan = obj.plan;
  const parsed = projectPlanSchema.safeParse(plan);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error: issue?.message ?? "Invalid plan body",
      status: 400,
    };
  }

  return { ok: true, plan: parsed.data };
}

export function parseBuildBody(body: unknown): BuildParseResult {
  const obj = getBodyObject(body);
  if (!obj) {
    return {
      ok: false,
      error:
        'Invalid request body. Expected JSON with "projectId" and "trackerSpec".',
      status: 400,
    };
  }

  const projectId = obj.projectId;
  const moduleId = obj.moduleId;
  const trackerSpec = obj.trackerSpec;
  const projectContext = obj.projectContext;

  if (!projectId || typeof projectId !== "string" || projectId.trim() === "") {
    return { ok: false, error: "projectId is required.", status: 400 };
  }

  if (
    trackerSpec == null ||
    typeof trackerSpec !== "object" ||
    Array.isArray(trackerSpec)
  ) {
    return { ok: false, error: "trackerSpec must be an object.", status: 400 };
  }

  if (
    projectContext != null &&
    (typeof projectContext !== "object" || Array.isArray(projectContext))
  ) {
    return {
      ok: false,
      error: "projectContext must be an object.",
      status: 400,
    };
  }

  if (!hasDeepSeekApiKey()) {
    return {
      ok: false,
      error: "DEEPSEEK_API_KEY is not configured",
      status: 500,
    };
  }

  return {
    ok: true,
    projectId: projectId.trim(),
    moduleId:
      typeof moduleId === "string" && moduleId.trim() ? moduleId.trim() : null,
    trackerSpec: trackerSpec as Record<string, unknown>,
    projectContext: (projectContext ?? {}) as Record<string, unknown>,
  };
}
