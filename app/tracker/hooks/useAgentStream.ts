"use client";

/**
 * useAgentStream — replaces experimental_useObject for the multi-agent NDJSON stream.
 *
 * Reads the NDJSON stream from /api/agent/build-tracker, accumulates agent events into
 * a Partial<MultiAgentSchema>, and calls onFinish/onError with the same contract as
 * experimental_useObject so useTrackerChat needs no logic changes.
 *
 * Extras over the old useObject:
 * - `phase` — 'idle' | 'manager' | 'builder', for rendering phase indicators
 * - `statusMessage` — human-readable description of what the agent is currently doing,
 * derived from the content of in-flight partials (e.g. "Defining fields (12)...")
 */

import { useState, useCallback, useRef } from "react";

import { readAgentStream } from "@/lib/agent/stream-reader";
import type {
  MultiAgentSchema,
  ManagerSchema,
} from "@/lib/schemas/multi-agent";
import type { BuilderOutput } from "@/lib/agent/builder-schema";
import type { ToolCallEntry } from "@/lib/agent/tool-calls";

export type AgentPhase = "idle" | "manager" | "master-data" | "builder";

export interface UseAgentStreamOptions {
  api: string;
  onFinish: (event: {
    object?: MultiAgentSchema;
    toolCalls?: ToolCallEntry[];
  }) => void;
  onError: (err: Error) => void;
}

export interface UseAgentStreamResult {
  object: Partial<MultiAgentSchema> | undefined;
  toolCalls: ToolCallEntry[];
  /** Starts a new generation request. */
  submit: (input: Record<string, unknown>) => void;
  isLoading: boolean;
  error: Error | undefined;
  /** Abort the in-flight request. */
  stop: () => void;
  /** Current agent phase. */
  phase: AgentPhase;
  /** Human-readable description of what's currently being generated. */
  statusMessage: string;
}

// ─── Status derivation ──────────────────────────────────────────────────────

function deriveManagerStatus(partial: Partial<ManagerSchema>): string {
  if (partial.builderTodo?.length) return "Finalizing build tasks...";
  if (partial.prd) return "Drafting tracker plan...";
  if (partial.thinking) return "Thinking through requirements...";
  return "Analyzing your request...";
}

function deriveBuilderStatus(partial: Partial<BuilderOutput>): string {
  if (partial.masterDataTrackers?.length) {
    return `Building master data (${partial.masterDataTrackers.length})...`;
  }

  // Inspect the tracker (full or patch) to surface the current generation frontier
  const tracker = (partial.tracker ?? partial.trackerPatch) as
    | Record<string, unknown>
    | undefined;
  if (!tracker) return "Generating schema...";

  const arr = (key: string) => {
    const v = tracker[key];
    return Array.isArray(v) ? v : null;
  };
  const obj = (key: string) => {
    const v = tracker[key];
    return v && typeof v === "object" && !Array.isArray(v)
      ? (v as Record<string, unknown>)
      : null;
  };

  const fieldRules = arr("fieldRules");
  const validations = obj("validations");
  const calculations = obj("calculations");
  const bindings = obj("bindings");
  const layoutNodes = arr("layoutNodes");
  const fields = arr("fields");
  const grids = arr("grids");
  const sections = arr("sections");
  const tabs = arr("tabs");

  if (fieldRules && fieldRules.length > 0) return "Configuring field rules...";
  if (validations && Object.keys(validations).length > 0)
    return "Adding validation rules...";
  if (calculations && Object.keys(calculations).length > 0)
    return "Setting up calculations...";
  if (bindings && Object.keys(bindings).length > 0)
    return "Wiring data bindings...";
  if (layoutNodes && layoutNodes.length > 0) return "Arranging layout...";
  if (fields && fields.length > 0)
    return `Defining fields (${fields.length})...`;
  if (grids && grids.length > 0) return "Creating grids...";
  if (sections && sections.length > 0) return "Building sections...";
  if (tabs && tabs.length > 0) return "Setting up tabs...";
  return "Building tracker structure...";
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAgentStream(
  options: UseAgentStreamOptions,
): UseAgentStreamResult {
  const { api } = options;
  const [object, setObject] = useState<Partial<MultiAgentSchema> | undefined>(
    undefined,
  );
  const [toolCalls, setToolCalls] = useState<ToolCallEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [phase, setPhase] = useState<AgentPhase>("idle");
  const [statusMessage, setStatusMessage] = useState("");

  const abortControllerRef = useRef<AbortController | null>(null);
  // Mutable accumulator — avoid stale closure issues by reading from ref inside the async loop
  const accumulatedRef = useRef<Partial<MultiAgentSchema>>({});

  // Stable refs for callbacks — prevents submit from re-creating when parent re-renders
  const onFinishRef = useRef(options.onFinish);
  onFinishRef.current = options.onFinish;
  const onErrorRef = useRef(options.onError);
  onErrorRef.current = options.onError;

  const stop = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const submit = useCallback(
    (input: Record<string, unknown>) => {
      // Abort any in-flight request before starting a new one
      abortControllerRef.current?.abort();

      accumulatedRef.current = {};
      setObject(undefined);
      setToolCalls([]);
      setError(undefined);
      setPhase("idle");
      setStatusMessage("");
      setIsLoading(true);

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      async function run() {
        try {
          const response = await fetch(api, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
            signal: abortController.signal,
          });

          if (!response.ok) {
            const text = await response.text().catch(() => response.statusText);
            throw new Error(`Request failed: ${response.status} ${text}`);
          }

          if (!response.body) {
            throw new Error("Response has no body");
          }

          for await (const event of readAgentStream(response.body)) {
            if (abortController.signal.aborted) break;

            switch (event.t) {
              case "phase": {
                setPhase(event.phase);
                if (event.phase === "manager")
                  setStatusMessage("Analyzing your request...");
                if (event.phase === "master-data")
                  setStatusMessage("Setting up master data...");
                if (event.phase === "builder")
                  setStatusMessage("Generating schema...");
                break;
              }
              case "master_data_progress": {
                const { resolved, total, name } = event;
                if (resolved < total) {
                  setStatusMessage(
                    `Setting up master data (${resolved}/${total}: ${name})...`,
                  );
                } else {
                  setStatusMessage("Master data ready");
                }
                break;
              }
              case "manager_partial": {
                // Update object so the UI renders manager thinking/plan progressively.
                // ManagerSchema fields are all optional, so a partial snapshot is safe to display.
                accumulatedRef.current = {
                  ...accumulatedRef.current,
                  manager: event.partial as ManagerSchema,
                };
                setObject({ ...accumulatedRef.current });
                setStatusMessage(deriveManagerStatus(event.partial));
                break;
              }
              case "manager_complete": {
                // Finalize manager with the complete validated output
                accumulatedRef.current = {
                  ...accumulatedRef.current,
                  manager: event.manager,
                };
                setObject({ ...accumulatedRef.current });
                setStatusMessage("Planning complete");
                break;
              }
              case "builder_partial": {
                // partialObjectStream yields snapshots, not deltas — always replace builder fields
                const partial = event.partial as Partial<MultiAgentSchema>;
                accumulatedRef.current = {
                  manager: accumulatedRef.current.manager,
                  ...(partial.tracker !== undefined
                    ? { tracker: partial.tracker }
                    : {}),
                  ...(partial.trackerPatch !== undefined
                    ? { trackerPatch: partial.trackerPatch }
                    : {}),
                  ...(partial.masterDataTrackers !== undefined
                    ? { masterDataTrackers: partial.masterDataTrackers }
                    : {}),
                };
                setObject({ ...accumulatedRef.current });
                setStatusMessage(deriveBuilderStatus(event.partial));
                break;
              }
              case "builder_finish": {
                const output = event.output as Partial<MultiAgentSchema>;
                accumulatedRef.current = {
                  manager: accumulatedRef.current.manager,
                  tracker: output.tracker,
                  trackerPatch: output.trackerPatch,
                  masterDataTrackers: output.masterDataTrackers,
                };
                setObject({ ...accumulatedRef.current });
                if (event.toolCalls && event.toolCalls.length > 0) {
                  setToolCalls(event.toolCalls);
                } else {
                  setToolCalls([]);
                }
                setIsLoading(false);
                setPhase("idle");
                setStatusMessage("");
                onFinishRef.current({
                  object: accumulatedRef.current as MultiAgentSchema,
                  toolCalls: event.toolCalls,
                });
                return;
              }
              case "error": {
                throw new Error(event.message);
              }
            }
          }

          // Stream ended without a builder_finish event (e.g. truncated or aborted)
          if (!abortController.signal.aborted) {
            setIsLoading(false);
            setPhase("idle");
            setStatusMessage("");
            const accumulated = accumulatedRef.current;
            // Surface whatever was accumulated so error recovery (lastObjectRef) still works
            onFinishRef.current({
              object:
                accumulated.tracker ||
                accumulated.trackerPatch ||
                accumulated.manager
                  ? (accumulated as MultiAgentSchema)
                  : undefined,
              toolCalls: toolCalls.length ? toolCalls : undefined,
            });
          }
        } catch (err) {
          if (abortController.signal.aborted) {
            // Intentional abort — clean up silently, do not call onError
            setIsLoading(false);
            setPhase("idle");
            setStatusMessage("");
            return;
          }
          const wrappedError =
            err instanceof Error ? err : new Error(String(err));
          setError(wrappedError);
          setIsLoading(false);
          setPhase("idle");
          setStatusMessage("");
          onErrorRef.current(wrappedError);
        }
      }

      void run();
    },
    [api],
  );

  return {
    object,
    toolCalls,
    submit,
    isLoading,
    error,
    stop,
    phase,
    statusMessage,
  };
}
