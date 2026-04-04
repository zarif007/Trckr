"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { MultiAgentSchema } from "@/lib/schemas/multi-agent";
import { useAgentStream } from "./useAgentStream";
import {
  validateTracker,
  autoFixBindings,
  type TrackerLike,
} from "@/lib/validate-tracker";
import {
  buildBindingsFromSchema,
  enrichBindingsFromSchema,
} from "@/lib/binding";
import { applyTrackerPatch } from "@/app/tracker/utils/mergeTracker";
import { removeEmptyOverviewTabIfUnused } from "@/app/tracker/utils/removeEmptyOverviewTab";
import { mapApiToolCallsToEntries } from "@/app/tracker/utils/mapConversationToolCalls";
import type { TrackerDisplayProps } from "@/app/components/tracker-display/types";
import { INITIAL_TRACKER_SCHEMA } from "@/app/components/tracker-display/tracker-editor";
import { ensureConversation, persistMessage } from "./conversation";
import {
  CONTINUE_PROMPT,
  MAX_AUTO_CONTINUES,
  MAX_VALIDATION_FIX_RETRIES,
} from "./constants";
import {
  isUntouchedFirstRunScaffold,
  normalizeValidationAndCalculations,
  trackerHasAnyData,
} from "./normalization";
import type { ToolCallEntry } from "@/lib/agent/tool-calls";

export type { ToolCallEntry } from "@/lib/agent/tool-calls";
export { suggestions } from "./constants";

const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

export type TrackerResponse = TrackerDisplayProps;

export interface Message {
  role: "user" | "assistant";
  content?: string;
  trackerData?: TrackerResponse;
  managerData?: MultiAgentSchema["manager"];
  errorMessage?: string;
  isThinkingOpen?: boolean;
  isToolsOpen?: boolean;
  /** Tool calls persisted with this assistant turn */
  toolCalls?: ToolCallEntry[];
  /** Internal-only message (not rendered in the UI). */
  internal?: boolean;
}

export interface UseTrackerChatOptions {
  /** When provided, the chat starts with this tracker as the base (e.g. when editing an existing tracker by id). */
  initialTracker?: TrackerResponse | null;
  /** Tracker (schema) id when viewing an existing tracker; enables persisting conversation to DB. */
  trackerId?: string | null;
  /** Project id for the owning project. Used for master data resolution when trackerId is not yet available (new tracker). */
  projectId?: string | null;
  /** Module id within the project. Used for module-scope master data resolution when trackerId is not yet available. */
  moduleId?: string | null;
  /** Conversation id (from DB). When set, messages are persisted. Pass from parent to control active conversation (e.g. tab switch). */
  conversationId?: string | null;
  /** Messages loaded from DB for this tracker; used to hydrate chat on open. */
  initialMessages?: Message[];
  /** When provided and conversationId is unset (draft tab), called on first submit to create conversation and persist message; hook skips persist. */
  onConversationCreate?: (
    userMessage: string,
  ) => Promise<{ id: string; title: string } | null>;
}

function sanitizeManagerData(
  manager: MultiAgentSchema["manager"] | undefined,
): MultiAgentSchema["manager"] | undefined {
  if (!manager) return undefined;
  const sanitized = { ...(manager as Record<string, unknown>) };
  if ("thinking" in sanitized) delete sanitized.thinking;
  return sanitized as MultiAgentSchema["manager"];
}

export function useTrackerChat(options: UseTrackerChatOptions = {}) {
  const {
    initialTracker = null,
    trackerId,
    projectId,
    moduleId,
    conversationId: conversationIdProp,
    initialMessages,
    onConversationCreate,
  } = options;
  const [input, setInput] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [messages, setMessages] = useState<Message[]>(
    () => initialMessages ?? [],
  );
  const [conversationId, setConversationId] = useState<string | null>(
    conversationIdProp ?? null,
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTrackerData, _setActiveTrackerData] =
    useState<TrackerResponse | null>(initialTracker ?? null);
  const [generationErrorMessage, setGenerationErrorMessage] = useState<
    string | null
  >(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [pendingContinue, setPendingContinue] = useState(false);
  const [resumingAfterError, setResumingAfterError] = useState(false);
  const [suppressErrors, setSuppressErrors] = useState(false);
  const [toolCalls, setToolCalls] = useState<ToolCallEntry[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const continueCountRef = useRef(0);
  const validationFixRetryCountRef = useRef(0);
  const lastObjectRef = useRef<MultiAgentSchema | undefined>(undefined);
  const trackerDataRef = useRef<
    (() => Record<string, Array<Record<string, unknown>>>) | null
  >(null);
  const messagesRef = useRef<Message[]>([]);
  const activeTrackerRef = useRef<TrackerResponse | null>(null);
  const firstRunUserDraftRef = useRef<TrackerResponse | null>(
    initialTracker ?? null,
  );
  const conversationIdRef = useRef<string | null>(conversationIdProp ?? null);

  const submitRef = useRef<(input: any) => void>(() => {});

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);
  // Controlled conversationId: when parent passes conversationId (e.g. active tab), sync internal state
  // When parent clears it (draft tab), reset to null to avoid leaking prior conversation ids.
  useEffect(() => {
    if (conversationIdProp === undefined) {
      setConversationId(null);
      return;
    }
    setConversationId(conversationIdProp ?? null);
  }, [conversationIdProp]);
  // Hydrate messages once when conversation loads from DB (e.g. after opening a tracker)
  const hasHydratedRef = useRef(false);
  useEffect(() => {
    if (hasHydratedRef.current || !initialMessages?.length) return;
    hasHydratedRef.current = true;
    setMessages(
      initialMessages.map((m) => {
        const normalized = mapApiToolCallsToEntries(m.toolCalls);
        return {
          ...m,
          ...(normalized?.length ? { toolCalls: normalized } : {}),
        };
      }),
    );
  }, [initialMessages]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    activeTrackerRef.current = activeTrackerData;
  }, [activeTrackerData]);

  const getBaseTracker = useCallback(() => {
    if (activeTrackerRef.current) return activeTrackerRef.current;
    const reversed = [...messagesRef.current].reverse();
    return reversed.find((msg) => msg.trackerData)?.trackerData ?? null;
  }, []);

  const stripInternalMessages = useCallback((msgs: Message[]) => {
    return msgs.filter((m) => !m.internal);
  }, []);

  /**
   * Current state sent to the API.
   * - After an assistant turn with trackerData, send the base tracker for patches.
   * - On the first request, always send a concrete baseline (user draft, live schema, or INITIAL)
   * so the server can inject the empty-scaffold hint vs full JSON state.
   */
  const getCurrentTrackerForApi = useCallback((): TrackerResponse | null => {
    const hasGeneratedTracker = messagesRef.current.some(
      (m) => !!m.trackerData,
    );
    if (!hasGeneratedTracker) {
      return (
        firstRunUserDraftRef.current ??
        activeTrackerRef.current ??
        (INITIAL_TRACKER_SCHEMA as TrackerResponse)
      );
    }
    return getBaseTracker();
  }, [getBaseTracker]);

  const getDirtyForApi = useCallback((): boolean => {
    if (messagesRef.current.some((m) => !!m.trackerData)) return true;
    const draft =
      firstRunUserDraftRef.current ??
      activeTrackerRef.current ??
      (INITIAL_TRACKER_SCHEMA as TrackerResponse);
    return !isUntouchedFirstRunScaffold(draft as TrackerLike);
  }, []);

  const getMasterDataScopeForApi = useCallback((): string | undefined => {
    const fromActive = (
      activeTrackerRef.current as { masterDataScope?: unknown } | null
    )?.masterDataScope;
    if (typeof fromActive === "string" && fromActive.trim())
      return fromActive.trim();
    const fromDraft = (
      firstRunUserDraftRef.current as { masterDataScope?: unknown } | null
    )?.masterDataScope;
    if (typeof fromDraft === "string" && fromDraft.trim())
      return fromDraft.trim();
    const fromInitial = (initialTracker as { masterDataScope?: unknown } | null)
      ?.masterDataScope;
    if (typeof fromInitial === "string" && fromInitial.trim())
      return fromInitial.trim();
    return undefined;
  }, [initialTracker]);

  const setResolvedTrackerData = useCallback(
    (next: TrackerResponse | null) => {
      _setActiveTrackerData(next);
    },
    [_setActiveTrackerData],
  );

  const setActiveTrackerData = useCallback(
    (next: TrackerResponse | null) => {
      _setActiveTrackerData(next);
      const hasGeneratedTracker = messagesRef.current.some(
        (m) => !!m.trackerData,
      );
      if (!hasGeneratedTracker) {
        firstRunUserDraftRef.current = isUntouchedFirstRunScaffold(
          next as TrackerLike | null,
        )
          ? null
          : next;
      }
    },
    [_setActiveTrackerData],
  );

  const buildTrackerFromResponse = useCallback(
    (response?: MultiAgentSchema) => {
      if (!response) return null;
      // Keep merge base aligned with what we send to the API:
      // if we don't have a tracker yet, use the same initial schema baseline.
      const base =
        getBaseTracker() ?? (INITIAL_TRACKER_SCHEMA as TrackerResponse);
      let rawTracker = response.tracker as TrackerLike | undefined;

      if (!rawTracker && response.trackerPatch && base) {
        rawTracker = applyTrackerPatch(
          base,
          response.trackerPatch,
        ) as TrackerLike;
      }

      if (!rawTracker) return null;
      rawTracker = normalizeValidationAndCalculations(rawTracker);
      rawTracker = removeEmptyOverviewTabIfUnused(rawTracker as TrackerLike);
      const built = buildBindingsFromSchema(rawTracker as TrackerLike);
      const tracker = built
        ? enrichBindingsFromSchema(built as TrackerLike)
        : built;
      return tracker as TrackerResponse;
    },
    [getBaseTracker],
  );

  const finalizeTracker = useCallback(
    (
      tracker: TrackerResponse | null,
      managerData: MultiAgentSchema["manager"],
      toolCallsForPersist?: ToolCallEntry[],
    ) => {
      const validation = tracker
        ? validateTracker(tracker as TrackerLike)
        : { valid: true, errors: [], warnings: [] };

      if (
        !validation.valid &&
        validation.errors.length > 0 &&
        tracker &&
        validationFixRetryCountRef.current < MAX_VALIDATION_FIX_RETRIES
      ) {
        validationFixRetryCountRef.current += 1;
        const fixPrompt = `Fix these schema validation errors:\n${validation.errors.map((e) => `- ${e}`).join("\n")}`;
        const assistantMessage: Message = {
          role: "assistant",
          trackerData: tracker as TrackerResponse,
          managerData,
        };
        const fixUserMessage: Message = { role: "user", content: fixPrompt };
        const nextMessages = [
          ...messagesRef.current,
          assistantMessage,
          fixUserMessage,
        ];
        setMessages(nextMessages);
        const cidFix = conversationIdRef.current;
        const masterDataScopeForApi = getMasterDataScopeForApi();
        if (cidFix) {
          persistMessage(cidFix, { role: "USER", content: fixPrompt }).catch(
            (e) => console.error("Failed to persist user message:", e),
          );
        }
        submitRef.current({
          query: fixPrompt,
          messages: stripInternalMessages(nextMessages),
          currentTracker: tracker as TrackerResponse,
          dirty: true,
          ...(trackerId ? { trackerSchemaId: trackerId } : {}),
          ...(projectId ? { projectId } : {}),
          ...(moduleId ? { moduleId } : {}),
          ...(masterDataScopeForApi
            ? { masterDataScope: masterDataScopeForApi }
            : {}),
        });
        return;
      }

      if (!validation.valid) {
        setValidationErrors(validation.errors);
      } else {
        validationFixRetryCountRef.current = 0;
      }
      const hasValidTracker =
        tracker && Array.isArray(tracker.tabs) && tracker.tabs.length > 0;
      const assistantMessage: Message = {
        role: "assistant",
        trackerData: tracker as TrackerResponse,
        managerData,
        ...(toolCallsForPersist?.length
          ? { toolCalls: toolCallsForPersist, isToolsOpen: true }
          : {}),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      if (toolCallsForPersist?.length) {
        setToolCalls([]);
      }
      const cid = conversationIdRef.current;
      if (cid) {
        const payload: Parameters<typeof persistMessage>[1] = {
          role: "ASSISTANT",
          content: "",
          trackerSchemaSnapshot: (tracker as TrackerResponse) ?? undefined,
          managerData: sanitizeManagerData(managerData),
        };
        if (toolCallsForPersist?.length) {
          payload.toolCalls = toolCallsForPersist.map((tc) => ({
            purpose: tc.purpose,
            fieldPath: tc.fieldPath ?? "",
            description: tc.description,
            status: tc.status,
            ...(tc.error != null && { error: tc.error }),
            ...(tc.result !== undefined && { result: tc.result }),
          }));
        }
        persistMessage(cid, payload).catch((err) =>
          console.error("Failed to persist assistant message:", err),
        );
      }
      if (hasValidTracker) {
        continueCountRef.current = 0;
        setResolvedTrackerData(tracker as TrackerResponse);
      } else {
        if (continueCountRef.current < MAX_AUTO_CONTINUES) {
          setPendingContinue(true);
        } else {
          continueCountRef.current = 0;
          setGenerationErrorMessage(GENERIC_ERROR_MESSAGE);
        }
      }
    },
    [
      setResolvedTrackerData,
      trackerId,
      projectId,
      moduleId,
      getMasterDataScopeForApi,
    ],
  );

  const {
    object,
    toolCalls: _streamToolCalls,
    submit,
    isLoading,
    error,
    phase,
    statusMessage,
  } = useAgentStream({
    api: "/api/agent/build-tracker",
    onFinish: ({
      object: finishedObject,
      toolCalls: finishedToolCalls,
    }: {
      object?: MultiAgentSchema;
      toolCalls?: ToolCallEntry[];
    }) => {
      setSuppressErrors(false);
      setGenerationErrorMessage(null);
      setResumingAfterError(false);
      setValidationErrors([]);
      if (finishedObject) {
        let tracker = buildTrackerFromResponse(finishedObject);
        if (tracker) {
          tracker = autoFixBindings(tracker as TrackerLike) as TrackerResponse;
        }
        if (finishedToolCalls?.length) {
          setToolCalls(finishedToolCalls);
        } else {
          setToolCalls([]);
        }
        finalizeTracker(tracker, finishedObject.manager, finishedToolCalls);
      } else {
        // When stream ends with no valid object (e.g. truncated at 8K), use partial if available
        const partial = lastObjectRef.current;
        let partialTracker = buildTrackerFromResponse(partial);
        if (partialTracker) {
          partialTracker = autoFixBindings(
            partialTracker as TrackerLike,
          ) as TrackerResponse;
        }
        const hasPartial =
          partial && (partial.manager || trackerHasAnyData(partialTracker));
        if (hasPartial && partial) {
          const assistantMessage: Message = {
            role: "assistant",
            trackerData: partialTracker ?? undefined,
            managerData: partial.manager,
          };
          setMessages((prev) => [...prev, assistantMessage]);
          const cid = conversationIdRef.current;
          if (cid) {
            persistMessage(cid, {
              role: "ASSISTANT",
              content: "",
              trackerSchemaSnapshot: partialTracker ?? undefined,
              managerData: sanitizeManagerData(partial.manager),
            }).catch((err) =>
              console.error("Failed to persist assistant message:", err),
            );
          }
          if (partialTracker)
            setResolvedTrackerData(partialTracker as TrackerResponse);
          if (continueCountRef.current < MAX_AUTO_CONTINUES) {
            setPendingContinue(true);
          } else {
            continueCountRef.current = 0;
            setGenerationErrorMessage(GENERIC_ERROR_MESSAGE);
          }
        } else {
          setGenerationErrorMessage(GENERIC_ERROR_MESSAGE);
          const errorMessageObj: Message = {
            role: "assistant",
            content: GENERIC_ERROR_MESSAGE,
          };
          setMessages((prev) => [...prev, errorMessageObj]);
          const cid = conversationIdRef.current;
          if (cid) {
            persistMessage(cid, {
              role: "ASSISTANT",
              content: GENERIC_ERROR_MESSAGE,
            }).catch((err) =>
              console.error("Failed to persist assistant message:", err),
            );
          }
        }
      }
    },
    onError: (err: Error) => {
      const message = err.message || "An unknown error occurred";
      const shouldAutoContinue = !(
        message.includes("Schema validation failed") ||
        message.includes(
          "Missing project context for master data resolution",
        ) ||
        message.includes("Builder produced no tracker")
      );
      const partial = lastObjectRef.current;
      let partialTracker = buildTrackerFromResponse(partial);
      if (partialTracker) {
        partialTracker = autoFixBindings(
          partialTracker as TrackerLike,
        ) as TrackerResponse;
      }
      const hasPartial =
        partial && (partial.manager || trackerHasAnyData(partialTracker));

      if (hasPartial && partial && shouldAutoContinue) {
        setSuppressErrors(true);
        const assistantMessage: Message = {
          role: "assistant",
          trackerData: partialTracker ?? undefined,
          managerData: partial.manager,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        const cid = conversationIdRef.current;
        if (cid) {
          persistMessage(cid, {
            role: "ASSISTANT",
            content: "",
            trackerSchemaSnapshot: partialTracker ?? undefined,
            managerData: sanitizeManagerData(partial.manager),
          }).catch((e) =>
            console.error("Failed to persist assistant message:", e),
          );
        }
        setPendingContinue(true);
        continueCountRef.current = 0;
      } else {
        setSuppressErrors(false);
        setResumingAfterError(false);
        setGenerationErrorMessage(GENERIC_ERROR_MESSAGE);
        const errorContent = GENERIC_ERROR_MESSAGE;
        const errorMessageObj: Message = {
          role: "assistant",
          content: errorContent,
        };
        setMessages((prev) => [...prev, errorMessageObj]);
        const cid = conversationIdRef.current;
        if (cid) {
          persistMessage(cid, {
            role: "ASSISTANT",
            content: errorContent,
          }).catch((e) =>
            console.error("Failed to persist assistant message:", e),
          );
        }
      }
      console.error("Error generating tracker:", err);
    },
  });

  submitRef.current = submit;

  useEffect(() => {
    lastObjectRef.current = object as MultiAgentSchema | undefined;
  }, [object]);

  /** Resolved tracker for streaming UI: full tracker or base + trackerPatch. Use this so 2nd+ requests show streaming when LLM returns a patch. */
  const streamedDisplayTracker = useMemo(() => {
    const built = buildTrackerFromResponse(
      object as MultiAgentSchema | undefined,
    );
    return built
      ? (autoFixBindings(built as TrackerLike) as TrackerResponse)
      : built;
  }, [object, buildTrackerFromResponse]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, object]);

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;

    continueCountRef.current = 0;
    validationFixRetryCountRef.current = 0;
    setSuppressErrors(false);
    setToolCalls([]);
    const userMessage = input.trim();
    setInput("");

    const newUserMessage: Message = {
      role: "user",
      content: userMessage,
    };

    setMessages((prev) => [...prev, newUserMessage]);

    let cid = onConversationCreate ? null : conversationIdRef.current;
    let alreadyPersisted = false;
    let skipPersist = false;
    if (trackerId && onConversationCreate) {
      try {
        const result = await onConversationCreate(userMessage);
        if (result) {
          setConversationId(result.id);
          conversationIdRef.current = result.id;
          cid = result.id;
          alreadyPersisted = true;
        } else {
          skipPersist = true;
        }
      } catch (err) {
        console.error("Failed to create conversation via callback:", err);
        skipPersist = true;
      }
    }
    if (trackerId && !cid && !onConversationCreate) {
      try {
        cid = await ensureConversation(trackerId);
        setConversationId(cid);
        conversationIdRef.current = cid;
      } catch (err) {
        console.error("Failed to create conversation:", err);
      }
    }
    if (cid && !alreadyPersisted && !skipPersist) {
      try {
        await persistMessage(cid, { role: "USER", content: userMessage });
      } catch (err) {
        console.error("Failed to persist user message:", err);
      }
    }

    const dirty = getDirtyForApi();
    const masterDataScopeForApi = getMasterDataScopeForApi();
    const visibleMessages = stripInternalMessages(messagesRef.current);
    submit({
      query: userMessage,
      messages: visibleMessages,
      currentTracker: dirty
        ? (getCurrentTrackerForApi() ??
          (INITIAL_TRACKER_SCHEMA as TrackerResponse))
        : {},
      dirty,
      ...(trackerId ? { trackerSchemaId: trackerId } : {}),
      ...(projectId ? { projectId } : {}),
      ...(moduleId ? { moduleId } : {}),
      ...(masterDataScopeForApi
        ? { masterDataScope: masterDataScopeForApi }
        : {}),
    });
  };

  const handleContinue = () => {
    setGenerationErrorMessage(null);
    setSuppressErrors(false);
    const continueMessage: Message = {
      role: "user",
      content: CONTINUE_PROMPT,
      internal: true,
    };
    const baseMessages = stripInternalMessages(messages);
    const nextMessages = [...baseMessages, continueMessage];
    setMessages(nextMessages);
    const dirtyContinue = getDirtyForApi();
    const masterDataScopeForApi = getMasterDataScopeForApi();
    submit({
      query: CONTINUE_PROMPT,
      messages: stripInternalMessages(nextMessages),
      currentTracker: dirtyContinue
        ? (getCurrentTrackerForApi() ??
          (INITIAL_TRACKER_SCHEMA as TrackerResponse))
        : {},
      dirty: dirtyContinue,
      ...(trackerId ? { trackerSchemaId: trackerId } : {}),
      ...(masterDataScopeForApi
        ? { masterDataScope: masterDataScopeForApi }
        : {}),
    });
    continueCountRef.current = 0;
  };

  useEffect(() => {
    if (
      !pendingContinue ||
      isLoading ||
      continueCountRef.current >= MAX_AUTO_CONTINUES
    )
      return;

    setResumingAfterError(false);
    setSuppressErrors(false);
    const continueMessage: Message = {
      role: "user",
      content: CONTINUE_PROMPT,
      internal: true,
    };
    const baseMessages = stripInternalMessages(messages);
    const nextMessages = [...baseMessages, continueMessage];
    setMessages(nextMessages);
    const dirtyPending = getDirtyForApi();
    const masterDataScopeForApi = getMasterDataScopeForApi();
    submit({
      query: CONTINUE_PROMPT,
      messages: stripInternalMessages(nextMessages),
      currentTracker: dirtyPending
        ? (getCurrentTrackerForApi() ??
          (INITIAL_TRACKER_SCHEMA as TrackerResponse))
        : {},
      dirty: dirtyPending,
      ...(trackerId ? { trackerSchemaId: trackerId } : {}),
      ...(masterDataScopeForApi
        ? { masterDataScope: masterDataScopeForApi }
        : {}),
    });
    setPendingContinue(false);
    continueCountRef.current += 1;
  }, [
    pendingContinue,
    isLoading,
    messages,
    submit,
    getCurrentTrackerForApi,
    getDirtyForApi,
    getMasterDataScopeForApi,
    stripInternalMessages,
  ]);

  useEffect(() => {
    if (isLoading && (object?.tracker || object?.trackerPatch)) {
      setIsDialogOpen(true);
      setGenerationErrorMessage(null);
    }
  }, [isLoading, object?.tracker, object?.trackerPatch]);

  useEffect(() => {
    if (!isLoading && (error || generationErrorMessage)) {
      setIsDialogOpen(true);
    }
  }, [isLoading, error, generationErrorMessage]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "0px";
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.min(scrollHeight, 200) + "px";
    }
  }, [input]);

  const applySuggestion = (s: string) => {
    setInput(s);
    textareaRef.current?.focus();
  };

  const setMessageThinkingOpen = (idx: number, open: boolean) => {
    setMessages((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, isThinkingOpen: open } : m)),
    );
  };

  const setMessageToolsOpen = (idx: number, open: boolean) => {
    setMessages((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, isToolsOpen: open } : m)),
    );
  };

  const isChatEmpty = messages.length === 0 && !isLoading;

  const clearDialogError = () => {
    setGenerationErrorMessage(null);
    setValidationErrors([]);
  };

  return {
    input,
    setInput,
    isFocused,
    setIsFocused,
    messages,
    setMessages,
    handleSubmit,
    handleContinue,
    applySuggestion,
    setMessageThinkingOpen,
    setMessageToolsOpen,
    isLoading,
    error: suppressErrors ? undefined : error,
    object,
    streamedDisplayTracker,
    isDialogOpen,
    setIsDialogOpen,
    activeTrackerData,
    setActiveTrackerData,
    generationErrorMessage: suppressErrors ? null : generationErrorMessage,
    validationErrors,
    resumingAfterError,
    trackerDataRef,
    messagesEndRef,
    textareaRef,
    isChatEmpty,
    clearDialogError,
    toolCalls,
    phase,
    statusMessage,
  };
}
