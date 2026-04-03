import { parseRequestBody, getErrorMessage } from "./lib/validation";
import { runGenerateExprIntent } from "./lib/run-intent";
import {
  badRequest,
  createRequestLogContext,
  jsonError,
  jsonOk,
} from "@/lib/api";
import { logAiError, logAiStage } from "@/lib/ai";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import {
  resolveLlmUsageAttribution,
  scheduleRecordLlmUsage,
} from "@/lib/llm-usage";

export async function POST(request: Request) {
  const logContext = createRequestLogContext(request, "generate-expr");
  try {
    const authResult = await requireAuthenticatedUser();
    if (!authResult.ok) return authResult.response;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest(
        'Invalid request body. Expected JSON with "prompt", "gridId", and "fieldId".',
      );
    }

    const parsed = parseRequestBody(body);
    if (!parsed.ok) {
      return jsonError(parsed.error, parsed.status);
    }

    const attr = await resolveLlmUsageAttribution(authResult.user.id, {
      trackerSchemaId: parsed.trackerSchemaId,
      projectId: parsed.projectId,
    });
    if (!attr.ok) {
      return jsonError(attr.error, attr.status);
    }

    const { prompt, gridId, fieldId, purpose, currentTracker } = parsed;
    const fieldPath = `${gridId}.${fieldId}`;

    try {
      logAiStage(logContext, "request", "Generating expression.");
      const { expr, usage } = await runGenerateExprIntent({
        prompt,
        fieldPath,
        purpose,
        currentTracker,
      });
      scheduleRecordLlmUsage({
        userId: authResult.user.id,
        source: "generate-expr",
        usage,
        projectId: attr.value.projectId,
        trackerSchemaId: attr.value.trackerSchemaId,
      });
      return jsonOk({ expr });
    } catch (error) {
      const message = getErrorMessage(error);
      logAiError(logContext, "generation-error", error);
      return jsonError(message || "Failed to generate expression.", 500);
    }
  } catch (error) {
    const message = getErrorMessage(error);
    logAiError(logContext, "route-error", error);
    return jsonError(message || "Failed to generate expression.", 500);
  }
}
