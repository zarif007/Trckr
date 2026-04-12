"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TrackerPageMessage } from "../_components/TrackerPageMessage";
import { TrackerAIView } from "../page";
import { TrackerInstanceListView } from "../views/TrackerInstanceListView";
import type { TrackerResponse, Message } from "../hooks/useTrackerChat";
import { ownerScopeSettingsBannerFromTracker } from "../utils/ownerScopeSettingsBanner";
import { loadLatestTrackerSnapshot } from "@/lib/tracker-page/load-latest-tracker-snapshot";
import {
  schemaWithTrackerName,
  type TrackerPageRecord,
} from "@/lib/tracker-page/schema-with-tracker-name";
import type { TrackerDataPageResource } from "@/lib/tracker-page/tracker-page-resource-types";

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

const trackerCache = new Map<string, Promise<TrackerDataPageResource>>();

function TrackerByIdLoadedContent({
  id,
  instanceId,
  initialBranchName,
  onBranchChange,
  onBack,
  conversationIdParam,
  initialResource,
}: {
  id: string;
  instanceId: string | null;
  initialBranchName: string | null;
  onBranchChange: (branchName: string) => void;
  onBack: () => void;
  conversationIdParam: string | null;
  initialResource: TrackerDataPageResource;
}) {
  const [state, setState] = useState<TrackerDataPageResource>(initialResource);
  const [conversation, setConversation] = useState<ConversationState>({
    conversationId: null,
    messages: [],
  });

  useEffect(() => {
    setState(initialResource);
  }, [initialResource]);

  useEffect(() => {
    if (typeof sessionStorage === "undefined") return;
    const raw = sessionStorage.getItem(STORAGE_KEY_PREFIX + id);
    if (!raw) return;
    let fromStorage: TrackerPageRecord;
    try {
      fromStorage = JSON.parse(raw) as TrackerPageRecord;
      sessionStorage.removeItem(STORAGE_KEY_PREFIX + id);
    } catch {
      return;
    }
    let cancelled = false;
    void (async () => {
      const schema = schemaWithTrackerName(fromStorage);
      const latestSnapshot = await loadLatestTrackerSnapshot(
        (path) => fetch(path),
        {
          trackerId: id,
          instanceId,
          tracker: fromStorage,
          schema,
        },
      );
      if (cancelled) return;
      const next: TrackerDataPageResource = {
        tracker: fromStorage,
        schema,
        latestSnapshot,
      };
      setState(next);
      const key = `${id}::${instanceId ?? ""}`;
      trackerCache.set(key, Promise.resolve(next));
    })();
    return () => {
      cancelled = true;
    };
  }, [id, instanceId]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    async function fetchConversation() {
      try {
        const url = conversationIdParam
          ? `/api/trackers/${id}/conversation?mode=ANALYST&conversationId=${conversationIdParam}`
          : `/api/trackers/${id}/conversation?mode=ANALYST`;
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
  }, [id, state.tracker, conversationIdParam]);

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
      const next: TrackerDataPageResource = {
        tracker: data,
        schema: schemaWithTrackerName(data),
        latestSnapshot: state.latestSnapshot,
      };
      setState(next);
      const key = `${id}::${instanceId ?? ""}`;
      trackerCache.set(key, Promise.resolve(next));
    },
    [id, instanceId, state.tracker?.name, state.latestSnapshot],
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
      initialGridData={state.latestSnapshot?.data ?? null}
      initialFormStatus={state.latestSnapshot?.formStatus ?? null}
      onSaveTracker={handleSaveTracker}
      initialEditMode={false}
      initialChatOpen={false}
      trackerId={id}
      projectId={state.tracker?.projectId ?? null}
      moduleId={state.tracker?.moduleId ?? null}
      instanceType={state.tracker?.instance === "MULTI" ? "MULTI" : "SINGLE"}
      instanceId={instanceId}
      autoSave={state.tracker?.autoSave ?? true}
      initialConversationId={conversation.conversationId}
      initialMessages={
        conversation.messages.length > 0 ? conversation.messages : undefined
      }
      versionControl={state.tracker?.versionControl ?? false}
      initialBranchName={initialBranchName}
      onBranchChange={onBranchChange}
      pageMode="data"
      ownerScopeSettingsBanner={ownerScopeSettingsBannerFromTracker(
        state.tracker,
      )}
    />
  );
}

export function TrackerByIdPageClient({
  id,
  instanceId,
  initialBranchName,
  conversationIdParam,
  initialResource,
  initialLoadError,
}: {
  id: string;
  instanceId: string | null;
  initialBranchName: string | null;
  conversationIdParam: string | null;
  initialResource: TrackerDataPageResource | null;
  initialLoadError: Error | null;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const handleBranchChange = useCallback(
    (branchName: string) => {
      const next = new URLSearchParams(searchParams.toString());
      if (branchName) {
        next.set("branch", branchName);
      } else {
        next.delete("branch");
      }
      const qs = next.toString();
      router.replace(`/tracker/${id}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [id, router, searchParams],
  );

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
      <TrackerByIdLoadedContent
        id={id}
        instanceId={instanceId}
        initialBranchName={initialBranchName}
        onBranchChange={handleBranchChange}
        onBack={handleBack}
        conversationIdParam={conversationIdParam}
        initialResource={initialResource}
      />
    </TrackerErrorBoundary>
  );
}
