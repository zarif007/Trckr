"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface NewBoardDialogProps {
  projectId: string;
  moduleId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onError?: (msg: string) => void;
  onCreated?: () => void | Promise<void>;
}

export function NewBoardDialog(props: NewBoardDialogProps) {
  const {
    projectId,
    moduleId,
    open,
    onOpenChange,
    onError,
    onCreated,
  } = props;
  const router = useRouter();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setName("");
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
    if (open) reset();
  }, [open, reset]);

  const handleCreate = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          projectId,
          moduleId: moduleId ?? null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (data as { error?: string }).error || "Failed to create dashboard",
        );
      }
      const id = (data as { id?: string }).id;
      if (!id) throw new Error("Invalid response");
      handleOpenChange(false);
      await onCreated?.();
      router.push(`/board/${id}/edit?new=true`);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Failed to create dashboard";
      setError(msg);
      onError?.(msg);
    } finally {
      setCreating(false);
    }
  }, [name, projectId, moduleId, router, handleOpenChange, onError, onCreated]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            New dashboard
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-1">
          <div className="space-y-1.5">
            <label
              className="text-xs font-medium text-muted-foreground"
              htmlFor="board-name"
            >
              Name
            </label>
            <Input
              id="board-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sales overview"
              autoFocus
            />
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
              disabled={creating}
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
