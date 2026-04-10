/**
 * Redirect node — records an inline effect (URL) for interactive save responses.
 */

import type {
  RedirectNode,
  WorkflowExecutionContext,
} from "@/lib/workflows/types";

export function executeRedirectNode(
  node: RedirectNode,
  context: WorkflowExecutionContext,
): Record<string, unknown> {
  if (node.config.kind === "url" && node.config.value) {
    if (!context.inlineEffects.redirect) {
      context.inlineEffects.redirect = { url: node.config.value };
    }
  }
  return { redirect: context.inlineEffects.redirect ?? null };
}
