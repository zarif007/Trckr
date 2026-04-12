"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TrackerPageMessage } from "../_components/TrackerPageMessage";
import { TrackerAIView } from "../page";
import { TrackerInstanceListView } from "../views/TrackerInstanceListView";
import type { TrackerResponse, Message } from "../hooks/useTrackerChat";
import { ownerScopeSettingsBannerFromTracker } from "../utils/ownerScopeSettingsBanner";
import {
  schemaWithTrackerName,
  type TrackerPageRecord,
} from "@/lib/tracker-page/schema-with-tracker-name";
import type { TrackerEditPageResource } from "@/lib/tracker-page/tracker-page-resource-types";

const STORAGE_KEY_PREFIX = "trckr:tracker:";

type ConversationState = {
  conversationId: string | null;
  messages: Message[];
};

class TrackerErrorBoundary extends React.Component<
  { onBack: () => void; children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  render() {
    if (this.state.error) {
      return (
        <TrackerLoadError error={this.state.error} onBack={this.props.onBack} />
      );
    }
    return this.props.children;
  }
}

function TrackerLoadError({
  error,
  onBack,
}: {
  error: Error;
  onBack: () => void;
}) {
  const message =
    error.message === "NOT_FOUND"
      ? "Tracker not found"
      : "Failed to load tracker";
  return <TrackerPageMessage message={message} onBack={onBack} />;
}

function getListDisplayName(name: string | null): string {
  if (!name) return "Instances";
  return name.endsWith(".list") ? name.slice(0, -5) : name;
}

const trackerCache = new Map<string, Promise<TrackerEditPageResource>>();

function TrackerByIdEditLoadedContent({
  id,
  isNew,
  instanceId,
  onBack,
  conversationIdParam,
  initialResource,
}: {
  id: string;
  isNew: boolean;
  instanceId: string | null;
  onBack: () => void;
  conversationIdParam: string | null;
  initialResource: TrackerEditPageResource;
}) {
  const [state, setState] = useState<TrackerEditPageResource>(initialResource);

  useEffect(() => {
    setState(initialResource);
  }, [initialResource]);

  useEffect(() => {
    if (typeof sessionStorage === "undefined") return;
    const raw = sessionStorage.getItem(STORAGE_KEY_PREFIX + id);
    if (!raw) return;
    try {
      const fromStorage = JSON.parse(raw) as TrackerPageRecord;
      sessionStorage.removeItem(STORAGE_KEY_PREFIX + id);
      const next: TrackerEditPageResource = {
        tracker: fromStorage,
        schema: schemaWithTrackerName(fromStorage),
      };
      setState(next);
      const key = `${id}::${instanceId ?? ""}`;
      trackerCache.set(key, Promise.resolve(next));
    } catch {
      /* ignore */
    }
  }, [id, instanceId]);

  const [conversation, setConversation] = useState<ConversationState>({
    conversationId: null,
    messages: [],
  });

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    async function fetchConversation() {
      try {
        const url = conversationIdParam
          ? `/api/trackers/${id}/conversation?mode=BUILDER&conversationId=${conversationIdParam}`
          : `/api/trackers/${id}/conversation?mode=BUILDER`;
        const res = await fetch(url);
        if (res.status === 404) {
          if (!cancelled)
            setConversation({ conversationId: null, messages: [] });
          return;
        }
        if (!res.ok) {
          if (!cancelled)
            setConversation({ conversationId: null, messages: [] });
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setConversation({
            conversationId: data.conversation?.id ?? null,
            messages: Array.isArray(data.messages) ? data.messages : [],
          });
        }
      } catch {
        if (!cancelled) setConversation({ conversationId: null, messages: [] });
      }
    }
    void fetchConversation();
    return () => {
      cancelled = true;
    };
  }, [id, conversationIdParam]);

  const handleSaveTracker = useCallback(
    async (schema: TrackerResponse) => {
      if (!id) return;
      const res = await fetch(`/api/trackers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: schema.name ?? state.tracker?.name ?? "Untitled tracker",
          schema,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save tracker");
      }
      const data = await res.json();
      const key = `${id}::${instanceId ?? ""}`;
      trackerCache.set(
        key,
        Promise.resolve({
          tracker: data,
          schema: schemaWithTrackerName(data),
        }),
      );
    },
    [id, instanceId, state.tracker?.name],
  );

  const primaryNavAction = useMemo(
    () => ({ label: "Open Tracker", href: `/tracker/${id}` }),
    [id],
  );

  const schema = state.schema;
  const hasValidSchema =
    schema &&
    Array.isArray(schema.tabs) &&
    schema.tabs.length > 0 &&
    Array.isArray(schema.sections) &&
    Array.isArray(schema.grids) &&
    Array.isArray(schema.fields);

  if (!hasValidSchema) {
    return (
      <TrackerPageMessage message="Invalid tracker schema" onBack={onBack} />
    );
  }

  if (state.tracker?.listForSchemaId) {
    return (
      <TrackerInstanceListView
        listSchemaId={id}
        parentTrackerId={state.tracker.listForSchemaId}
        listName={getListDisplayName(state.tracker.name)}
      />
    );
  }

  return (
    <TrackerAIView
      initialSchema={schema}
      onSaveTracker={handleSaveTracker}
      initialEditMode
      initialChatOpen={isNew}
      trackerId={id}
      projectId={state.tracker?.projectId ?? null}
      moduleId={state.tracker?.moduleId ?? null}
      initialConversationId={conversation.conversationId}
      initialMessages={
        conversation.messages.length > 0 ? conversation.messages : undefined
      }
      pageMode="schema"
      showPanelUtilities={false}
      schemaAutoSave
      primaryNavAction={primaryNavAction}
      autoSave={state.tracker?.autoSave ?? true}
      ownerScopeSettingsBanner={ownerScopeSettingsBannerFromTracker(
        state.tracker,
      )}
    />
  );
}

export function TrackerByIdEditPageClient({
  id,
  isNew,
  instanceId,
  conversationIdParam,
  initialResource,
  initialLoadError,
}: {
  id: string;
  isNew: boolean;
  instanceId: string | null;
  conversationIdParam: string | null;
  initialResource: TrackerEditPageResource | null;
  initialLoadError: Error | null;
}) {
  const router = useRouter();

  const handleBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/dashboard");
    }
  }, [router]);

  if (initialLoadError) {
    return <TrackerLoadError error={initialLoadError} onBack={handleBack} />;
  }
  if (!initialResource) {
    return (
      <TrackerLoadError error={new Error("FAILED")} onBack={handleBack} />
    );
  }

  return (
    <TrackerErrorBoundary onBack={handleBack}>
      <TrackerByIdEditLoadedContent
        id={id}
        isNew={isNew}
        instanceId={instanceId}
        onBack={handleBack}
        conversationIdParam={conversationIdParam}
        initialResource={initialResource}
      />
    </TrackerErrorBoundary>
  );
}
