"use client";

import { useState, useCallback, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TrackerOption = {
  id: string;
  name: string | null;
  instance: string;
  moduleId: string | null;
};

export type TrackerBackedResource = "report" | "analysis";

function apiCollection(resource: TrackerBackedResource) {
  return resource === "report" ? "reports" : "analyses";
}

export type NewTrackerBackedItemDialogProps = {
  resource: TrackerBackedResource;
  projectId: string;
  moduleId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onError?: (msg: string) => void;
  onCreated?: () => void | Promise<void>;
  title: ReactNode;
  nameInputId: string;
  namePlaceholder: string;
  createFailedMessage: string;
};

export function NewTrackerBackedItemDialog({
  resource,
  projectId,
  moduleId,
  open,
  onOpenChange,
  onError,
  onCreated,
  title,
  nameInputId,
  namePlaceholder,
  createFailedMessage,
}: NewTrackerBackedItemDialogProps) {
  const router = useRouter();
  const collection = apiCollection(resource);
  const [name, setName] = useState("");
  const [trackerId, setTrackerId] = useState<string>("");
  const [trackers, setTrackers] = useState<TrackerOption[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setName("");
    setTrackerId("");
    setError(null);
    setCreating(false);
  }, []);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      onOpenChange(next);
      if (!next) reset();
    },
    [onOpenChange, reset],
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingList(true);
    const q = new URLSearchParams({ projectId });
    if (moduleId) q.set("moduleId", moduleId);
    fetch(`/api/${collection}/trackers?${q.toString()}`)
      .then(async (res) => {
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(
            (j as { error?: string }).error || "Failed to load trackers",
          );
        }
        return res.json() as Promise<{ trackers: TrackerOption[] }>;
      })
      .then((data) => {
        if (!cancelled) {
          setTrackers(data.trackers);
          if (data.trackers.length === 1) {
            setTrackerId(data.trackers[0]!.id);
          }
        }
      })
      .catch((e) => {
        if (!cancelled) {
          const msg =
            e instanceof Error ? e.message : "Failed to load trackers";
          setError(msg);
          onError?.(msg);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingList(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, projectId, moduleId, onError, collection]);

  const handleCreate = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required.");
      return;
    }
    if (!trackerId) {
      setError("Select a tracker.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const res = await fetch(`/api/${collection}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          projectId,
          moduleId: moduleId ?? null,
          trackerSchemaId: trackerId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (data as { error?: string }).error || createFailedMessage,
        );
      }
      const id = (data as { id?: string }).id;
      if (!id) throw new Error("Invalid response");
      handleOpenChange(false);
      await onCreated?.();
      router.push(resource === "report" ? `/report/${id}` : `/analysis/${id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : createFailedMessage;
      setError(msg);
      onError?.(msg);
    } finally {
      setCreating(false);
    }
  }, [
    name,
    trackerId,
    projectId,
    moduleId,
    router,
    handleOpenChange,
    onError,
    onCreated,
    collection,
    resource,
    createFailedMessage,
  ]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">{title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-1">
          <div className="space-y-1.5">
            <label
              className="text-xs font-medium text-muted-foreground"
              htmlFor={nameInputId}
            >
              Name
            </label>
            <Input
              id={nameInputId}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={namePlaceholder}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Tracker
            </span>
            {loadingList ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading trackers…
              </div>
            ) : trackers.length === 0 ? (
              <p className="text-xs text-muted-foreground py-1">
                No trackers in this scope. Create a tracker first.
              </p>
            ) : (
              <Select value={trackerId} onValueChange={setTrackerId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose tracker" />
                </SelectTrigger>
                <SelectContent>
                  {trackers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name?.trim() || "Untitled tracker"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={creating || loadingList || trackers.length === 0}
              onClick={handleCreate}
            >
              {creating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Creating…
                </>
              ) : (
                "Create"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
