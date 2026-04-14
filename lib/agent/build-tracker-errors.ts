/**
 * Error string extraction for the multi-agent build pipeline.
 *
 * Kept in `lib/agent` (not `lib/tracker-prompt`) so API route tests can import orchestration
 * code without pulling optional `@/lib/ai` symbols required by other tracker-prompt modules.
 */
export function errorMessageFromUnknown(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "An unexpected error occurred";
  }
}
