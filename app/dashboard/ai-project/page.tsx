"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { experimental_useObject as useObject } from "@ai-sdk/react";
import { Loader2, Sparkles } from "lucide-react";
import { OrchestrationView } from "./OrchestrationView";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  projectPlanSchema,
  projectSingleQuestionSchema,
} from "@/lib/schemas/project-agent";

type QuestionType =
  | "text"
  | "textarea"
  | "select"
  | "multiselect"
  | "boolean"
  | "number";

type Question = {
  id: string;
  label: string;
  help?: string;
  placeholder?: string;
  required?: boolean;
  type?: QuestionType;
  options?: string[];
};

type ProjectPlan = {
  project: {
    name: string;
    description?: string;
    industry?: string;
    goals?: string[];
  };
  modules?: Array<{
    name: string;
    description?: string;
    trackerNames?: string[];
  }>;
  trackers: Array<{
    name: string;
    description?: string;
    module?: string | null;
    prompt: string;
    instance: "SINGLE" | "MULTI";
    versionControl: boolean;
    autoSave: boolean;
  }>;
};

type AgentType = "orchestrator" | "planner" | "builder";
type Phase = "think" | "ask" | "discuss" | "plan" | "build";

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "status";
  agentType?: AgentType;
  phase?: Phase;
  content: string;
  tone?: "info" | "error" | "success";
  stream?: boolean;
  links?: Array<{ label: string; href: string }>;
  actions?: Array<
    | { type: "confirm-build" }
    | { type: "edit-answers" }
    | { type: "retry-tracker"; index: number }
    | { type: "retry-plan" }
  >;
};

type SetupItem = {
  type: "project" | "module";
  name: string;
  status: "pending" | "working" | "done" | "error";
  buildProgress?: string;
};

type BuildItem = {
  name: string;
  module?: string | null;
  status: "pending" | "working" | "done" | "error";
  trackerId?: string;
  error?: string;
  buildProgress?: string;
};

type Stage = "idle" | "asking" | "planning" | "confirm" | "building";

function formatQuestion(question: Question, index: number): string {
  const parts = [`${index + 1}. ${question.label}`];
  if (question.help) parts.push(question.help);
  if (question.options?.length) {
    parts.push(`Options: ${question.options.join(", ")}`);
  }
  return parts.join("\n");
}

function formatPlanDraft(plan?: unknown): string {
  if (!plan || typeof plan !== "object") return "Drafting the build plan...";
  const p = plan as {
    project?: { name?: string };
    modules?: { name: string }[];
    trackers?: { name: string }[];
  };
  const projectName = p.project?.name?.trim() || "...";
  const modules = p.modules?.map((m) => m.name).filter(Boolean) ?? [];
  const trackers = p.trackers?.map((t) => t.name).filter(Boolean) ?? [];

  return [
    "Plan (draft)",
    `Project: ${projectName}`,
    `Modules: ${modules.length ? modules.join(", ") : "..."}`,
    "Trackers:",
    trackers.length ? trackers.map((name) => `- ${name}`).join("\n") : "- ...",
  ].join("\n");
}

function normalizeAnswer(question: Question, raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (question.type === "boolean") {
    if (/^(y|yes|true|1)$/i.test(trimmed)) return true;
    if (/^(n|no|false|0)$/i.test(trimmed)) return false;
  }
  if (question.type === "number") {
    const num = Number(trimmed);
    if (Number.isFinite(num)) return num;
  }
  if (question.type === "multiselect") {
    return trimmed
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return trimmed;
}

function buildPlanSummary(plan: ProjectPlan): string {
  const modules = plan.modules?.length
    ? plan.modules.map((m) => m.name).join(", ")
    : "None";
  const trackers = plan.trackers
    .map((t) => {
      const moduleLabel = t.module ? ` (Module: ${t.module})` : "";
      return `- ${t.name}${moduleLabel} [${t.instance}, VC ${t.versionControl ? "On" : "Off"}, Auto ${t.autoSave ? "On" : "Off"}]`;
    })
    .join("\n");

  return [
    "Plan ready.",
    `Project: ${plan.project.name}`,
    `Modules: ${modules}`,
    "Trackers:",
    trackers || "- (none)",
    "",
    "Confirm to build?",
  ].join("\n");
}

function makeId() {
  return (
    globalThis.crypto?.randomUUID?.() ?? `msg_${Date.now()}_${Math.random()}`
  );
}

export default function AiProjectBuilderPage() {
  const [stage, setStage] = useState<Stage>("idle");
  const [prompt, setPrompt] = useState("");
  const [input, setInput] = useState("");
  const [buildBusy, setBuildBusy] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [answeredQuestions, setAnsweredQuestions] = useState<
    Array<{ question: Question; answer: unknown }>
  >([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [plan, setPlan] = useState<ProjectPlan | null>(null);

  const [projectId, setProjectId] = useState<string | null>(null);
  const projectAwareFetch = useCallback(
    (url: RequestInfo | URL, init?: RequestInit) => {
      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse((init?.body as string) ?? "{}") as Record<
          string,
          unknown
        >;
      } catch {
        parsed = {};
      }
      return fetch(url, {
        ...init,
        body: JSON.stringify({
          ...parsed,
          ...(projectId ? { projectId } : {}),
        }),
      });
    },
    [projectId],
  );
  const [modulesByName, setModulesByName] = useState<Record<string, string>>(
    {},
  );
  const [setupItems, setSetupItems] = useState<SetupItem[]>([]);
  const [buildItems, setBuildItems] = useState<BuildItem[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const questionStreamIdRef = useRef<string | null>(null);
  const planStreamIdRef = useRef<string | null>(null);

  const {
    submit: submitQuestion,
    isLoading: isQuestionsLoading,
    error: questionsError,
  } = useObject({
    api: "/api/ai-project/question",
    fetch: projectAwareFetch,
    schema: projectSingleQuestionSchema,
    onFinish: ({ object }) => {
      const streamId = questionStreamIdRef.current;
      const obj = object as { question?: Question; done?: true } | null;
      if (obj?.done === true) {
        if (streamId) {
          updateMessage(streamId, {
            content: "I have everything I need. Planning the project now...",
            stream: true,
            agentType: "orchestrator",
            phase: "think",
          });
        } else {
          appendMessage({
            role: "assistant",
            content: "I have everything I need. Planning the project now...",
            stream: true,
            agentType: "orchestrator",
            phase: "think",
          });
        }
        void handlePlan(prompt, answers);
      } else if (obj?.question) {
        setCurrentQuestion(obj.question);
        setStage("asking");
        if (streamId) {
          updateMessage(streamId, {
            content: formatQuestion(obj.question, answeredQuestions.length),
            stream: true,
            agentType: "orchestrator",
            phase: "ask",
          });
        } else {
          appendMessage({
            role: "assistant",
            content: formatQuestion(obj.question, answeredQuestions.length),
            stream: true,
            agentType: "orchestrator",
            phase: "ask",
          });
        }
      }
      questionStreamIdRef.current = null;
    },
    onError: (err: Error) => {
      const streamId = questionStreamIdRef.current;
      if (streamId) {
        updateMessage(streamId, {
          role: "assistant",
          tone: "error",
          content: err.message || "Failed to generate question.",
          stream: true,
          agentType: "orchestrator",
          phase: "ask",
        });
      } else {
        appendMessage({
          role: "assistant",
          tone: "error",
          content: err.message || "Failed to generate question.",
          stream: true,
          agentType: "orchestrator",
          phase: "ask",
        });
      }
      questionStreamIdRef.current = null;
      setStage("idle");
    },
  });

  const {
    object: streamedPlan,
    submit: submitPlan,
    isLoading: isPlanLoading,
    error: planError,
  } = useObject({
    api: "/api/ai-project/plan",
    fetch: projectAwareFetch,
    schema: projectPlanSchema,
    onFinish: ({ object }) => {
      const streamId = planStreamIdRef.current;
      if (object?.project?.name) {
        setPlan(object);
        setStage("confirm");
        if (streamId) {
          updateMessage(streamId, {
            content: buildPlanSummary(object),
            actions: [{ type: "confirm-build" }, { type: "edit-answers" }],
            stream: true,
            agentType: "planner",
            phase: "plan",
          });
        } else {
          appendMessage({
            role: "assistant",
            content: buildPlanSummary(object),
            actions: [{ type: "confirm-build" }, { type: "edit-answers" }],
            stream: true,
            agentType: "planner",
            phase: "plan",
          });
        }
      } else {
        if (streamId) {
          updateMessage(streamId, {
            role: "assistant",
            tone: "error",
            content: "Failed to generate a project plan. Please retry.",
            stream: true,
            agentType: "planner",
            phase: "plan",
          });
        } else {
          appendMessage({
            role: "assistant",
            tone: "error",
            content: "Failed to generate a project plan. Please retry.",
            stream: true,
            agentType: "planner",
            phase: "plan",
          });
        }
        setStage("asking");
      }
      planStreamIdRef.current = null;
    },
    onError: (err: Error) => {
      const streamId = planStreamIdRef.current;
      if (streamId) {
        updateMessage(streamId, {
          role: "assistant",
          tone: "error",
          content: err.message || "Failed to generate plan.",
          actions: [{ type: "retry-plan" }],
          stream: true,
          agentType: "planner",
          phase: "plan",
        });
      } else {
        appendMessage({
          role: "assistant",
          tone: "error",
          content: err.message || "Failed to generate plan.",
          actions: [{ type: "retry-plan" }],
          stream: true,
          agentType: "planner",
          phase: "plan",
        });
      }
      planStreamIdRef.current = null;
      setStage("asking");
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [
    messages,
    streamedPlan,
    isPlanLoading,
    isQuestionsLoading,
    buildItems,
    answeredQuestions,
    currentQuestion,
  ]);

  useEffect(() => {
    const streamId = planStreamIdRef.current;
    if (!streamId) return;
    if (!streamedPlan) return;
    updateMessage(streamId, {
      content: formatPlanDraft(streamedPlan),
      stream: false,
    });
  }, [streamedPlan]);

  const inputPlaceholder = useMemo(() => {
    if (stage === "idle") return "Describe the system you want to build...";
    if (stage === "asking")
      return currentQuestion?.placeholder ?? "Type your answer...";
    if (stage === "planning") return "Planning your project...";
    if (stage === "confirm") return "Confirm the plan to continue...";
    return "Building your trackers...";
  }, [stage, currentQuestion]);

  const busy = buildBusy || isQuestionsLoading || isPlanLoading;

  const inputDisabled =
    busy || stage === "planning" || stage === "confirm" || stage === "building";

  const canSend = !inputDisabled && input.trim().length > 0;

  const appendMessage = (
    message: Omit<ChatMessage, "id"> & { id?: string },
  ) => {
    const shouldStream =
      message.stream ??
      (message.role === "assistant" || message.role === "status");
    const id = message.id ?? makeId();
    setMessages((prev) => [...prev, { ...message, stream: shouldStream, id }]);
    return id;
  };

  const updateMessage = (id: string, updates: Partial<ChatMessage>) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === id ? { ...message, ...updates } : message,
      ),
    );
  };

  const handleStart = async (userPrompt: string) => {
    setPrompt(userPrompt);
    setAnsweredQuestions([]);
    setCurrentQuestion(null);
    setAnswers({});
    appendMessage({ role: "user", content: userPrompt, phase: "discuss" });
    appendMessage({
      role: "status",
      tone: "info",
      content: "Analyzing your request...",
      stream: true,
      agentType: "orchestrator",
      phase: "think",
    });

    const streamId = appendMessage({
      role: "assistant",
      content: "Preparing your question...",
      agentType: "orchestrator",
      phase: "ask",
    });
    questionStreamIdRef.current = streamId;

    submitQuestion({ prompt: userPrompt });
  };

  const handlePlan = async (
    userPrompt: string,
    collectedAnswers: Record<string, unknown>,
  ) => {
    setStage("planning");
    appendMessage({
      role: "status",
      tone: "info",
      content: "Designing project and trackers...",
      stream: true,
      agentType: "planner",
      phase: "plan",
    });

    const streamId = appendMessage({
      role: "assistant",
      content: "Drafting the build plan...",
      agentType: "planner",
      phase: "plan",
    });
    planStreamIdRef.current = streamId;

    submitPlan({ prompt: userPrompt, answers: collectedAnswers });
  };

  const handleConfirmBuild = async () => {
    if (!plan) return;
    appendMessage({
      role: "user",
      content: "Confirm build.",
      phase: "discuss",
    });
    setStage("building");
    setBuildBusy(true);

    try {
      const projectName = plan.project.name?.trim() || "Untitled project";
      const moduleNames =
        plan.modules?.map((m) => m.name?.trim()).filter(Boolean) ?? [];

      const initialSetupItems: SetupItem[] = [
        {
          type: "project",
          name: projectName,
          status: "working",
          buildProgress: "Creating project...",
        },
        ...moduleNames.map((name) => ({
          type: "module" as const,
          name,
          status: "pending" as const,
        })),
      ];
      setSetupItems(initialSetupItems);

      appendMessage({
        role: "status",
        tone: "info",
        content: "Creating project and modules...",
        stream: true,
        agentType: "planner",
        phase: "plan",
      });

      const createRes = await fetch("/api/ai-project/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
        cache: "no-store",
      });
      if (!createRes.ok) {
        const errData = await createRes.json().catch(() => ({}));
        throw new Error(errData.error ?? "Failed to create project");
      }

      const reader = createRes.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let createData: {
        projectId?: string;
        modules?: Array<{ name: string; id: string }>;
      } = {};

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const msg = JSON.parse(line) as {
                type: string;
                step?: string;
                name?: string;
                message?: string;
                projectId?: string;
                modules?: Array<{ name: string; id: string }>;
              };
              if (msg.type === "progress") {
                if (msg.step === "project") {
                  setSetupItems((prev) =>
                    prev.map((item) =>
                      item.type === "project"
                        ? {
                            ...item,
                            status:
                              msg.message === "Project created"
                                ? "done"
                                : "working",
                            buildProgress: msg.message,
                          }
                        : item,
                    ),
                  );
                } else if (msg.step === "module" && msg.name) {
                  setSetupItems((prev) =>
                    prev.map((item) =>
                      item.type === "module" && item.name === msg.name
                        ? {
                            ...item,
                            status:
                              msg.message === "Module created"
                                ? "done"
                                : "working",
                            buildProgress: msg.message,
                          }
                        : item,
                    ),
                  );
                }
              } else if (msg.type === "complete") {
                createData = { projectId: msg.projectId, modules: msg.modules };
              } else if (msg.type === "error") {
                throw new Error(msg.message ?? "Create failed");
              }
            } catch (parseErr) {
              if (parseErr instanceof SyntaxError) continue;
              throw parseErr;
            }
          }
        }
      }

      if (!createData.projectId) throw new Error("No project created");

      setProjectId(createData.projectId);

      const createdModules = createData.modules ?? [];
      const map: Record<string, string> = {};
      for (const mod of createdModules) {
        const key = mod.name.trim().toLowerCase();
        map[key] = mod.id;
      }
      setModulesByName(map);

      const initialBuildItems: BuildItem[] = plan.trackers.map((tracker) => ({
        name: tracker.name,
        module: tracker.module ?? null,
        status: "working",
        buildProgress: "Designing schema...",
      }));
      setBuildItems(initialBuildItems);

      appendMessage({
        role: "status",
        tone: "info",
        content: `Building ${plan.trackers.length} tracker${plan.trackers.length === 1 ? "" : "s"} in parallel...`,
        stream: true,
        agentType: "builder",
        phase: "build",
      });

      const buildTracker = async (i: number) => {
        const trackerSpec = plan.trackers[i];
        const moduleName = trackerSpec.module?.trim().toLowerCase();
        const moduleId = moduleName ? map[moduleName] : undefined;

        try {
          const buildRes = await fetch("/api/ai-project/build-tracker", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectId: createData.projectId,
              moduleId,
              trackerSpec,
              projectContext: {
                project: plan.project,
                modules: plan.modules?.map((m) => ({
                  name: m.name,
                  description: m.description,
                })),
              },
            }),
            cache: "no-store",
          });
          if (!buildRes.ok) {
            const errData = await buildRes.json().catch(() => ({}));
            throw new Error(errData.error ?? "Failed to build tracker");
          }

          const reader = buildRes.body?.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          let buildData: {
            trackerId?: string;
            name?: string;
            moduleId?: string;
          } = {};

          if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() ?? "";
              for (const line of lines) {
                if (!line.trim()) continue;
                try {
                  const msg = JSON.parse(line) as {
                    type: string;
                    message?: string;
                    trackerId?: string;
                    name?: string;
                    moduleId?: string;
                  };
                  if (msg.type === "progress" && msg.message) {
                    setBuildItems((prev) =>
                      prev.map((item, idx) =>
                        idx === i
                          ? { ...item, buildProgress: msg.message }
                          : item,
                      ),
                    );
                  } else if (msg.type === "complete") {
                    buildData = {
                      trackerId: msg.trackerId,
                      name: msg.name,
                      moduleId: msg.moduleId,
                    };
                  } else if (msg.type === "error") {
                    throw new Error(msg.message ?? "Build failed");
                  }
                } catch (parseErr) {
                  if (parseErr instanceof SyntaxError) continue;
                  throw parseErr;
                }
              }
            }
          }

          if (!buildData.trackerId) throw new Error("No tracker created");

          setBuildItems((prev) =>
            prev.map((item, idx) =>
              idx === i
                ? {
                    ...item,
                    status: "done",
                    trackerId: buildData.trackerId,
                    buildProgress: undefined,
                  }
                : item,
            ),
          );

          appendMessage({
            role: "assistant",
            tone: "success",
            content: `Tracker ready: ${trackerSpec.name}`,
            links: [
              {
                label: "Open tracker",
                href: `/tracker/${buildData.trackerId}`,
              },
            ],
            agentType: "builder",
            phase: "build",
          });
        } catch (error) {
          const msg =
            error instanceof Error ? error.message : "Failed to build tracker";
          setBuildItems((prev) =>
            prev.map((item, idx) =>
              idx === i ? { ...item, status: "error", error: msg } : item,
            ),
          );
          appendMessage({
            role: "assistant",
            tone: "error",
            content: `Failed to build ${trackerSpec.name}: ${msg}`,
            actions: [{ type: "retry-tracker", index: i }],
            agentType: "builder",
            phase: "build",
          });
        }
      };

      await Promise.all(plan.trackers.map((_, i) => buildTracker(i)));
    } catch (error) {
      appendMessage({
        role: "assistant",
        tone: "error",
        content:
          error instanceof Error ? error.message : "Failed to build project",
        agentType: "planner",
        phase: "plan",
      });
    } finally {
      setBuildBusy(false);
    }
  };

  const handleRetryTracker = async (index: number) => {
    if (!plan || !projectId) return;
    const trackerSpec = plan.trackers[index];
    if (!trackerSpec) return;

    appendMessage({
      role: "status",
      tone: "info",
      content: `Retrying ${trackerSpec.name}...`,
      stream: true,
      agentType: "builder",
      phase: "build",
    });
    setBuildBusy(true);

    const moduleName = trackerSpec.module?.trim().toLowerCase();
    const moduleId = moduleName ? modulesByName[moduleName] : undefined;

    setBuildItems((prev) =>
      prev.map((item, idx) =>
        idx === index
          ? {
              ...item,
              status: "working",
              buildProgress: "Designing schema...",
              error: undefined,
            }
          : item,
      ),
    );

    try {
      const buildRes = await fetch("/api/ai-project/build-tracker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          moduleId,
          trackerSpec,
          projectContext: {
            project: plan.project,
            modules: plan.modules?.map((m) => ({
              name: m.name,
              description: m.description,
            })),
          },
        }),
        cache: "no-store",
      });
      if (!buildRes.ok) {
        const errData = await buildRes.json().catch(() => ({}));
        throw new Error(errData.error ?? "Failed to build tracker");
      }

      const reader = buildRes.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let buildData: { trackerId?: string } = {};

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const msg = JSON.parse(line) as {
                type: string;
                message?: string;
                trackerId?: string;
              };
              if (msg.type === "progress" && msg.message) {
                setBuildItems((prev) =>
                  prev.map((item, idx) =>
                    idx === index
                      ? { ...item, buildProgress: msg.message }
                      : item,
                  ),
                );
              } else if (msg.type === "complete") {
                buildData = { trackerId: msg.trackerId };
              } else if (msg.type === "error") {
                throw new Error(msg.message ?? "Build failed");
              }
            } catch (parseErr) {
              if (parseErr instanceof SyntaxError) continue;
              throw parseErr;
            }
          }
        }
      }

      if (!buildData.trackerId) throw new Error("No tracker created");

      setBuildItems((prev) =>
        prev.map((item, idx) =>
          idx === index
            ? {
                ...item,
                status: "done",
                trackerId: buildData.trackerId,
                buildProgress: undefined,
              }
            : item,
        ),
      );
      appendMessage({
        role: "assistant",
        tone: "success",
        content: `Tracker ready: ${trackerSpec.name}`,
        links: [
          { label: "Open tracker", href: `/tracker/${buildData.trackerId}` },
        ],
        agentType: "builder",
        phase: "build",
      });
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Failed to build tracker";
      appendMessage({
        role: "assistant",
        tone: "error",
        content: `Retry failed for ${trackerSpec.name}: ${msg}`,
        actions: [{ type: "retry-tracker", index }],
        agentType: "builder",
        phase: "build",
      });
    } finally {
      setBuildBusy(false);
    }
  };

  const handleEditAnswers = () => {
    if (!plan) return;
    setStage("asking");
    setAnsweredQuestions([]);
    setCurrentQuestion(null);
    setAnswers({});
    const streamId = appendMessage({
      role: "assistant",
      content: "Preparing your question...",
      agentType: "orchestrator",
      phase: "ask",
    });
    questionStreamIdRef.current = streamId;
    submitQuestion({ prompt });
  };

  const handleRetryPlan = async () => {
    await handlePlan(prompt, answers);
  };

  const handleSend = async () => {
    if (!canSend) return;
    const value = input.trim();
    setInput("");

    if (stage === "idle") {
      await handleStart(value);
      return;
    }

    if (stage === "asking" && currentQuestion) {
      const normalized = normalizeAnswer(currentQuestion, value);
      const collected = { ...answers, [currentQuestion.id]: normalized };
      setAnswers(collected);
      setAnsweredQuestions((prev) => [
        ...prev,
        { question: currentQuestion, answer: normalized },
      ]);
      setCurrentQuestion(null);

      const streamId = appendMessage({
        role: "assistant",
        content: "Preparing your next question...",
        agentType: "orchestrator",
        phase: "ask",
      });
      questionStreamIdRef.current = streamId;
      submitQuestion({ prompt, answers: collected });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const showOrchestration = prompt.length > 0;

  return (
    <main className="flex flex-col flex-1 min-w-0 min-h-0 bg-background text-foreground">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 py-8">
          <header className="mb-6">
            <h1 className="text-xl font-medium tracking-tight text-foreground">
              {showOrchestration ? "Plan mode" : "New project"}
            </h1>
            {showOrchestration && (
              <p className="mt-1 text-sm text-muted-foreground">
                I will analyze, ask questions, design the plan, and build.
              </p>
            )}
          </header>

          {showOrchestration ? (
            <OrchestrationView
              userPrompt={prompt}
              stage={stage}
              answeredQuestions={answeredQuestions}
              currentQuestion={currentQuestion}
              answers={answers}
              plan={plan}
              setupItems={setupItems}
              buildItems={buildItems}
              streamedPlan={streamedPlan}
              isQuestionsLoading={isQuestionsLoading}
              isPlanLoading={isPlanLoading}
              input={input}
              onInputChange={setInput}
              onSend={handleSend}
              onConfirmBuild={handleConfirmBuild}
              onEditAnswers={handleEditAnswers}
              onRetryTracker={handleRetryTracker}
              onRetryPlan={handleRetryPlan}
              busy={busy}
              inputDisabled={inputDisabled}
              canSend={canSend}
              projectId={projectId ?? undefined}
              planError={planError ?? null}
              questionsError={questionsError ?? null}
            />
          ) : (
            <div className="rounded-sm border border-border/50 bg-background overflow-hidden">
              <div className="flex flex-col">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Describe what you want to build... (e.g. A CRM for a small agency with leads, contacts, and campaigns)"
                  className="min-h-[140px] py-4 px-4 text-base leading-relaxed resize-y border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground focus:outline-none"
                  onKeyDown={handleKeyDown}
                  disabled={inputDisabled}
                  rows={5}
                />
                <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border/40 bg-muted/20">
                  <Button
                    onClick={handleSend}
                    disabled={!canSend}
                    className="rounded-sm gap-2"
                    size="default"
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    Start
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
