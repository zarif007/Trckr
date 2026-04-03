"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Plus,
  ArrowLeft,
  FileText,
  RefreshCw,
  Layers,
  Trash2,
  Search,
  X,
  ChevronRight,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface Author {
  id: string;
  name: string | null;
  email: string | null;
}

interface Instance {
  id: string;
  label: string | null;
  data: Record<string, Array<Record<string, unknown>>>;
  branchName: string;
  author: Author | null;
  authorId: string | null;
  createdAt: string;
  updatedAt: string;
}

function formatRelative(dateStr: string): string {
  const date = new Date(dateStr);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getDataPreview(data: Instance["data"]): string {
  const grids = Object.values(data);
  if (!grids.length) return "Empty";
  const firstGrid = grids[0];
  if (!firstGrid.length) return "No rows";
  const row = firstGrid[0];
  const entries = Object.entries(row)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .slice(0, 3);
  if (!entries.length) return "Empty row";
  return entries.map(([, v]) => String(v)).join(" · ");
}

function InstanceRow({
  instance,
  index,
  onOpen,
  onDelete,
  isDeleting,
}: {
  instance: Instance;
  index: number;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const preview = getDataPreview(instance.data);
  const rowCount = Object.values(instance.data).reduce(
    (acc, rows) => acc + rows.length,
    0,
  );
  const authorName = instance.author?.name || instance.author?.email || "—";

  return (
    <tr
      className={cn(
        "group cursor-pointer border-b border-border/40 hover:bg-muted/40 transition-colors",
        isDeleting && "opacity-50 pointer-events-none",
      )}
      onClick={() => onOpen(instance.id)}
    >
      <td className="px-3 py-2 text-[11px] sm:text-xs text-muted-foreground/70 tabular-nums w-[52px] text-right align-middle">
        {index + 1}
      </td>
      <td className="px-3 py-2 align-middle">
        <div className="text-[12px] sm:text-[13px] font-medium text-foreground truncate">
          {instance.label || `Instance ${index + 1}`}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
          <span className="truncate max-w-[220px] sm:max-w-[320px]">
            {preview}
          </span>
          <span className="hidden sm:inline-flex flex-shrink-0 text-muted-foreground/40">
            ·
          </span>
          <span className="hidden sm:inline-flex flex-shrink-0 tabular-nums">
            {rowCount} row{rowCount !== 1 ? "s" : ""}
          </span>
        </div>
      </td>
      <td className="px-3 py-2 text-[11px] sm:text-xs text-muted-foreground/80 tabular-nums align-middle hidden md:table-cell">
        {rowCount}
      </td>
      <td className="px-3 py-2 text-[11px] sm:text-xs text-muted-foreground/80 align-middle hidden lg:table-cell">
        {instance.branchName || "main"}
      </td>
      <td className="px-3 py-2 text-[11px] sm:text-xs text-muted-foreground/80 align-middle hidden md:table-cell">
        {authorName}
      </td>
      <td className="px-3 py-2 text-[11px] sm:text-xs text-muted-foreground/70 tabular-nums align-middle hidden sm:table-cell">
        {formatRelative(instance.createdAt)}
      </td>
      <td className="px-3 py-2 text-right align-middle w-[72px]">
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(instance.id);
            }}
            disabled={isDeleting}
            className={cn(
              "h-7 w-7 rounded-sm flex items-center justify-center text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 transition-colors",
              isDeleting && "cursor-wait",
            )}
            title="Delete"
          >
            {isDeleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </button>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 flex-shrink-0" />
        </div>
      </td>
    </tr>
  );
}

interface TrackerInstanceListViewProps {
  listSchemaId: string;
  parentTrackerId: string;
  listName: string;
}

export function TrackerInstanceListView({
  listSchemaId,
  parentTrackerId,
  listName,
}: TrackerInstanceListViewProps) {
  void listSchemaId;
  const router = useRouter();
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showBranchColumn, setShowBranchColumn] = useState(true);
  const [showAuthorColumn, setShowAuthorColumn] = useState(true);
  const [showCreatedColumn, setShowCreatedColumn] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const PAGE_SIZE = 50;

  const fetchInstances = useCallback(
    async (pageNum: number = 0) => {
      setLoading(true);
      setError(null);
      try {
        const offset = pageNum * PAGE_SIZE;
        const res = await fetch(
          `/api/trackers/${parentTrackerId}/data?limit=${PAGE_SIZE}&offset=${offset}`,
        );
        if (!res.ok) throw new Error("Failed to load instances");
        const data = await res.json();
        const items: Instance[] = data.items ?? [];
        setInstances(items);
        setTotal(data.total ?? items.length);
        setPage(pageNum);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load instances",
        );
      } finally {
        setLoading(false);
      }
    },
    [parentTrackerId],
  );

  useEffect(() => {
    fetchInstances(0);
  }, [fetchInstances]);

  const filteredInstances = useMemo(() => {
    if (!searchQuery.trim()) return instances;
    const q = searchQuery.toLowerCase();
    return instances.filter((inst) => {
      const label = (inst.label || "").toLowerCase();
      const authorName = (inst.author?.name || "").toLowerCase();
      const preview = getDataPreview(inst.data).toLowerCase();
      return label.includes(q) || authorName.includes(q) || preview.includes(q);
    });
  }, [instances, searchQuery]);

  const handleOpenInstance = useCallback(
    (instanceId: string) => {
      router.push(`/tracker/${parentTrackerId}?instanceId=${instanceId}`);
    },
    [router, parentTrackerId],
  );

  const handleNewInstance = useCallback(() => {
    router.push(`/tracker/${parentTrackerId}?instanceId=new`);
  }, [router, parentTrackerId]);

  const handleOpenTracker = useCallback(() => {
    router.push(`/tracker/${parentTrackerId}`);
  }, [router, parentTrackerId]);

  const handleDeleteInstance = useCallback(
    async (id: string) => {
      setDeletingId(id);
      setDeleteConfirm(null);
      try {
        const res = await fetch(`/api/trackers/${parentTrackerId}/data/${id}`, {
          method: "DELETE",
        });
        if (res.ok) {
          setInstances((prev) => prev.filter((inst) => inst.id !== id));
          setTotal((prev) => Math.max(0, prev - 1));
        }
      } finally {
        setDeletingId(null);
      }
    },
    [parentTrackerId],
  );

  const handleRequestDelete = useCallback(
    (id: string) => {
      const inst = instances.find((i) => i.id === id);
      setDeleteConfirm({ id, label: inst?.label || "this instance" });
    },
    [instances],
  );

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      {/* Header */}
      <div className="flex-shrink-0 h-12 border-b border-border/40 flex items-center justify-between px-3 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={handleOpenTracker}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
            title="Back to tracker"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <FileText className="h-3.5 w-3.5" />
          </button>
          <span className="text-muted-foreground/30 text-sm">/</span>
          <span className="text-sm font-semibold truncate">{listName}</span>
          {!loading && (
            <span className="text-[11px] text-muted-foreground/50 tabular-nums flex-shrink-0">
              ({total})
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {instances.length > 0 && (
            <button
              type="button"
              onClick={() => setSettingsOpen(!settingsOpen)}
              className={cn(
                "h-7 w-7 rounded-sm flex items-center justify-center transition-colors",
                settingsOpen
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground/60 hover:text-foreground hover:bg-muted/50",
              )}
              title="List settings"
            >
              <Settings2 className="h-3.5 w-3.5" />
            </button>
          )}
          {instances.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setSearchOpen(!searchOpen);
                if (searchOpen) setSearchQuery("");
              }}
              className={cn(
                "h-7 w-7 rounded-sm flex items-center justify-center transition-colors",
                searchOpen
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground/60 hover:text-foreground hover:bg-muted/50",
              )}
            >
              <Search className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => fetchInstances(page)}
            disabled={loading}
            className="h-7 w-7 rounded-sm flex items-center justify-center text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", loading && "animate-spin")}
            />
          </button>
          <Button
            size="sm"
            className="h-7 gap-1.5 text-xs rounded-sm ml-1"
            onClick={handleNewInstance}
          >
            <Plus className="h-3.5 w-3.5" />
            New
          </Button>
        </div>
      </div>

      {/* Search bar (collapsible) */}
      {searchOpen && (
        <div className="flex-shrink-0 px-3 py-1.5 border-b border-border/30">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search instances..."
              className="h-8 text-xs pl-8 pr-8"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Settings panel (collapsible) */}
      {settingsOpen && (
        <div className="flex-shrink-0 px-3 py-1.5 border-b border-border/30 bg-muted/10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground/80">
                List settings
              </p>
              <p className="text-[11px] text-muted-foreground/60">
                Configure which columns are visible in the table.
              </p>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                className="h-3 w-3 rounded-sm border-border/70"
                checked={showBranchColumn}
                onChange={(e) => setShowBranchColumn(e.target.checked)}
              />
              <span>Branch column</span>
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                className="h-3 w-3 rounded-sm border-border/70"
                checked={showAuthorColumn}
                onChange={(e) => setShowAuthorColumn(e.target.checked)}
              />
              <span>Author column</span>
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                className="h-3 w-3 rounded-sm border-border/70"
                checked={showCreatedColumn}
                onChange={(e) => setShowCreatedColumn(e.target.checked)}
              />
              <span>Created column</span>
            </label>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto min-h-0">
        {loading && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin opacity-30" />
            <p className="text-xs text-muted-foreground/60">Loading...</p>
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <p className="text-sm text-destructive">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchInstances(page)}
            >
              Retry
            </Button>
          </div>
        )}

        {!loading && !error && instances.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
            <div className="w-12 h-12 rounded-sm bg-muted/40 flex items-center justify-center">
              <Layers className="h-5 w-5 text-muted-foreground/30" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-foreground">
                No instances yet
              </p>
              <p className="text-xs text-muted-foreground/60">
                Create your first instance to get started.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={handleNewInstance}
            >
              <Plus className="h-3.5 w-3.5" />
              New Instance
            </Button>
          </div>
        )}

        {!loading && !error && instances.length > 0 && (
          <div className="py-1.5 px-2">
            {filteredInstances.length === 0 && searchQuery && (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                <Search className="h-5 w-5 opacity-20" />
                <p className="text-xs text-muted-foreground/60">
                  No results for &quot;{searchQuery}&quot;
                </p>
              </div>
            )}

            {filteredInstances.length > 0 && (
              <div className="rounded-sm border border-border/60 bg-card/40 overflow-hidden ">
                <div className="max-h-[calc(100vh-220px)] overflow-auto">
                  <table className="w-full border-collapse text-[12px] sm:text-xs">
                    <thead className="bg-muted/60 text-muted-foreground/80">
                      <tr className="border-b border-border/60">
                        <th className="px-3 py-2 text-[11px] sm:text-xs font-medium text-right w-[52px] align-middle">
                          #
                        </th>
                        <th className="px-3 py-2 text-left text-[11px] sm:text-xs font-medium align-middle">
                          Instance
                        </th>
                        <th className="px-3 py-2 text-right text-[11px] sm:text-xs font-medium align-middle hidden md:table-cell">
                          Rows
                        </th>
                        {showBranchColumn && (
                          <th className="px-3 py-2 text-left text-[11px] sm:text-xs font-medium align-middle hidden lg:table-cell">
                            Branch
                          </th>
                        )}
                        {showAuthorColumn && (
                          <th className="px-3 py-2 text-left text-[11px] sm:text-xs font-medium align-middle hidden md:table-cell">
                            Author
                          </th>
                        )}
                        {showCreatedColumn && (
                          <th className="px-3 py-2 text-left text-[11px] sm:text-xs font-medium align-middle hidden sm:table-cell">
                            Created
                          </th>
                        )}
                        <th className="px-3 py-2 text-right text-[11px] sm:text-xs font-medium align-middle w-[72px]">
                          {/* Actions */}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInstances.map((instance, i) => (
                        <InstanceRow
                          key={instance.id}
                          instance={instance}
                          index={i + page * PAGE_SIZE}
                          onOpen={handleOpenInstance}
                          onDelete={handleRequestDelete}
                          isDeleting={deletingId === instance.id}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {total > PAGE_SIZE && (
              <div className="flex items-center justify-center gap-2 px-1 py-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchInstances(page - 1)}
                  disabled={page === 0 || loading}
                  className="h-7 text-xs"
                >
                  Previous
                </Button>
                <span className="text-[11px] text-muted-foreground/50 tabular-nums">
                  {page + 1} / {Math.ceil(total / PAGE_SIZE)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchInstances(page + 1)}
                  disabled={(page + 1) * PAGE_SIZE >= total || loading}
                  className="h-7 text-xs"
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <Dialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Trash2 className="h-4 w-4 text-destructive" />
              Delete instance
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {deleteConfirm?.label}
              </span>
              ? This cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="gap-1.5"
                onClick={() =>
                  deleteConfirm && handleDeleteInstance(deleteConfirm.id)
                }
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
