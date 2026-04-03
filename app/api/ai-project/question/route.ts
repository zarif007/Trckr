import { projectSingleQuestionSchema } from "@/lib/schemas/project-agent";
import {
  getDefaultAiProvider,
  logAiError,
  logAiStage,
  getConfiguredMaxOutputTokens,
} from "@/lib/ai";
import { createRequestLogContext, jsonError } from "@/lib/api";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import {
  resolveLlmUsageAttribution,
  scheduleRecordLlmUsage,
} from "@/lib/llm-usage";
import {
  buildSingleQuestionPrompt,
  getOrchestratorSingleSystemPrompt,
} from "../lib/prompts";
import { parseQuestionBody } from "../lib/validation";

function toStreamResponse(object: unknown): Response {
  const json = JSON.stringify(object);
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(json);
      controller.close();
    },
  });
  return new Response(stream.pipeThrough(new TextEncoderStream()), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function POST(request: Request) {
  const logContext = createRequestLogContext(request, "ai-project/question");
  try {
    const authResult = await requireAuthenticatedUser();
    if (!authResult.ok) return authResult.response;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError(
        'Invalid request body. Expected JSON with "prompt".',
        400,
      );
    }

    const parsed = parseQuestionBody(body);
    if (!parsed.ok) {
      return jsonError(parsed.error, parsed.status);
    }

    const attr = await resolveLlmUsageAttribution(authResult.user.id, {
      projectId: parsed.projectId,
    });
    if (!attr.ok) {
      return jsonError(attr.error, attr.status);
    }

    const provider = getDefaultAiProvider();
    const system = getOrchestratorSingleSystemPrompt();
    const prompt = buildSingleQuestionPrompt(parsed.prompt, parsed.answers);
    const maxOutputTokens = getConfiguredMaxOutputTokens();

    try {
      logAiStage(logContext, "request", "Streaming next question.");
      const result = provider.streamObject({
        system,
        prompt,
        schema: projectSingleQuestionSchema,
        maxOutputTokens,
        onFinish: ({ error: validationError, usage }) => {
          if (validationError) {
            logAiError(logContext, "stream-finish-validation", validationError);
          }
          scheduleRecordLlmUsage({
            userId: authResult.user.id,
            source: "ai-project-question",
            usage,
            projectId: attr.value.projectId,
            trackerSchemaId: attr.value.trackerSchemaId,
          });
        },
      });
      return result.toTextStreamResponse();
    } catch (error) {
      logAiError(logContext, "stream-failure", error);
    }

    logAiStage(
      logContext,
      "fallback",
      "Falling back to non-streaming question.",
    );
    const { object, usage } = await provider.generateObject({
      system,
      prompt,
      schema: projectSingleQuestionSchema,
      maxOutputTokens,
    });
    scheduleRecordLlmUsage({
      userId: authResult.user.id,
      source: "ai-project-question",
      usage,
      projectId: attr.value.projectId,
      trackerSchemaId: attr.value.trackerSchemaId,
    });
    return toStreamResponse(object);
  } catch (error) {
    logAiError(logContext, "route-error", error);
    return jsonError("Failed to generate question. Please try again.", 500);
  }
}
