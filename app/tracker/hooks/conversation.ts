export type ConversationMode = "BUILDER" | "ANALYST";

export interface ToolCallPayload {
  purpose:
    | "validation"
    | "calculation"
    | "field-rule"
    | "binding"
    | "master-data-lookup"
    | "master-data-create";
  fieldPath: string;
  description: string;
  status: "pending" | "running" | "done" | "error";
  error?: string;
  result?: unknown;
}

export interface PersistMessagePayload {
  role: "USER" | "ASSISTANT";
  content: string;
  trackerSchemaSnapshot?: object;
  managerData?: object;
  toolCalls?: ToolCallPayload[];
}

export interface ConversationListItem {
  id: string;
  title: string | null;
  mode: ConversationMode;
  createdAt: string;
}

export async function listConversations(
  trackerId: string,
  mode?: ConversationMode,
): Promise<ConversationListItem[]> {
  const params = new URLSearchParams();
  if (mode) params.set("mode", mode);
  const qs = params.toString();
  const url = `/api/trackers/${trackerId}/conversations${qs ? `?${qs}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to list conversations");
  }
  const data = (await res.json()) as { conversations: ConversationListItem[] };
  return data.conversations ?? [];
}

export interface CreateConversationResult {
  id: string;
  title: string | null;
  mode: ConversationMode;
  createdAt: string;
}

export async function createConversation(
  trackerId: string,
  mode: ConversationMode = "BUILDER",
  title?: string | null,
): Promise<CreateConversationResult> {
  const res = await fetch(`/api/trackers/${trackerId}/conversation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode,
      createNew: true,
      ...(title != null && { title }),
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to create conversation");
  }
  return res.json() as Promise<CreateConversationResult>;
}

export interface ConversationWithMessages {
  conversation: {
    id: string;
    title: string | null;
    mode: ConversationMode;
    createdAt: string;
  };
  messages: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    trackerData?: unknown;
    managerData?: unknown;
    createdAt: string;
    toolCalls?: Array<{
      id: string;
      purpose: string;
      fieldPath: string;
      description: string;
      status: string;
      error?: string;
      result?: unknown;
    }>;
  }>;
}

export async function getConversation(
  trackerId: string,
  conversationId: string,
  mode?: ConversationMode,
): Promise<ConversationWithMessages | null> {
  const params = new URLSearchParams({ conversationId });
  if (mode) params.set("mode", mode);
  const res = await fetch(
    `/api/trackers/${trackerId}/conversation?${params.toString()}`,
  );
  if (res.status === 404 || !res.ok) return null;
  return res.json() as Promise<ConversationWithMessages>;
}

export async function ensureConversation(
  trackerId: string,
  mode: ConversationMode = "BUILDER",
): Promise<string> {
  const res = await fetch(`/api/trackers/${trackerId}/conversation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to create conversation");
  }
  const data = (await res.json()) as { id: string };
  return data.id;
}

export async function persistMessage(
  conversationId: string,
  payload: PersistMessagePayload,
): Promise<void> {
  const body: Record<string, unknown> = {
    role: payload.role,
    content: payload.content,
  };
  if (payload.trackerSchemaSnapshot != null)
    body.trackerSchemaSnapshot = payload.trackerSchemaSnapshot;
  if (payload.managerData != null) body.managerData = payload.managerData;
  if (payload.toolCalls?.length) {
    body.toolCalls = payload.toolCalls.map((tc) => ({
      purpose: tc.purpose,
      fieldPath: tc.fieldPath ?? "",
      description: tc.description,
      status: tc.status,
      ...(tc.error != null && { error: tc.error }),
      ...(tc.result !== undefined && { result: tc.result }),
    }));
  }
  const res = await fetch(`/api/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to save message");
  }
}
