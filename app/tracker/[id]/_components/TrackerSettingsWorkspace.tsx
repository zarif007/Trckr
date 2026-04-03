"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Pencil,
  Plus,
  Save,
  Search,
  Settings2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldSettingsDialog } from "@/app/components/tracker-display/edit-mode/field-settings";
import { cn } from "@/lib/utils";
import { theme } from "@/lib/theme";
import type {
  TrackerDisplayProps,
  TrackerField,
} from "@/app/components/tracker-display/types";

type WorkspaceMode = "bindings" | "validations" | "calculations" | "fieldRules";

type TrackerRecord = {
  id: string;
  name: string | null;
  schema: TrackerDisplayProps;
};

type EditableTarget = {
  key: string;
  gridId: string;
  gridName: string;
  fieldId: string;
  fieldLabel: string;
  dataType: string;
  count: number;
};

function pageTitle(mode: WorkspaceMode): string {
  if (mode === "bindings") return "Bindings";
  if (mode === "validations") return "Validations";
  if (mode === "fieldRules") return "Field Rules";
  return "Calculations";
}

function isBindable(field: TrackerField): boolean {
  return field.dataType === "options" || field.dataType === "multiselect";
}

function modeTab(mode: WorkspaceMode) {
  if (mode === "bindings") return "bindings" as const;
  if (mode === "validations") return "validations" as const;
  if (mode === "fieldRules") return "fieldRules" as const;
  return "calculations" as const;
}

function modeCountLabel(mode: WorkspaceMode) {
  if (mode === "bindings") return "Links";
  if (mode === "validations" || mode === "fieldRules") return "Rules";
  return "Formulas";
}

function modeSingularTitle(mode: WorkspaceMode) {
  if (mode === "bindings") return "Binding";
  if (mode === "validations") return "Validation";
  if (mode === "fieldRules") return "Field rule";
  return "Calculation";
}

export function TrackerSettingsWorkspace({ mode }: { mode: WorkspaceMode }) {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("Untitled tracker");
  const [schema, setSchema] = useState<TrackerDisplayProps | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [selected, setSelected] = useState<{
    fieldId: string;
    gridId: string;
  } | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addSelection, setAddSelection] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<EditableTarget | null>(null);

  useEffect(() => {
    if (!id) {
      setError("Invalid tracker");
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function run() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/trackers/${id}`);
        if (!res.ok) {
          setError(
            res.status === 404 ? "Tracker not found" : "Failed to load tracker",
          );
          return;
        }
        const data = (await res.json()) as TrackerRecord;
        if (cancelled) return;
        setName(data.name ?? "Untitled tracker");
        setSchema(data.schema ?? ({} as TrackerDisplayProps));
        setDirty(false);
      } catch {
        if (!cancelled) setError("Failed to load tracker");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const targets = useMemo<EditableTarget[]>(() => {
    if (!schema) return [];
    const fields = schema.fields ?? [];
    const fieldById = new Map(fields.map((f) => [f.id, f]));
    const gridById = new Map((schema.grids ?? []).map((g) => [g.id, g]));
    const validations = schema.validations ?? {};
    const calculations = schema.calculations ?? {};
    const bindings = schema.bindings ?? {};
    const fieldRulesV2 = schema.fieldRulesV2 ?? {};

    const seen = new Set<string>();
    const rows: EditableTarget[] = [];

    for (const node of schema.layoutNodes ?? []) {
      const key = `${node.gridId}.${node.fieldId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const field = fieldById.get(node.fieldId);
      if (!field) continue;
      if (mode === "bindings" && !isBindable(field)) continue;
      const count =
        mode === "bindings"
          ? bindings[key]
            ? 1
            : 0
          : mode === "validations"
            ? (validations[key]?.length ?? 0)
            : mode === "fieldRules"
              ? (fieldRulesV2[key]?.length ?? 0)
              : calculations[key]
                ? 1
                : 0;
      rows.push({
        key,
        gridId: node.gridId,
        gridName: gridById.get(node.gridId)?.name ?? node.gridId,
        fieldId: field.id,
        fieldLabel: field.ui?.label ?? field.id,
        dataType: field.dataType,
        count,
      });
    }

    return rows.sort(
      (a, b) =>
        a.gridName.localeCompare(b.gridName) ||
        a.fieldLabel.localeCompare(b.fieldLabel),
    );
  }, [schema, mode]);

  const configuredTargets = useMemo(
    () => targets.filter((target) => target.count > 0),
    [targets],
  );
  const availableTargets = useMemo(
    () => targets.filter((target) => target.count === 0),
    [targets],
  );

  const persistSchema = useCallback(
    async (nextSchema?: TrackerDisplayProps) => {
      if (!id) return;
      const schemaToSave = nextSchema ?? schema;
      if (!schemaToSave) return;
      setSaving(true);
      setSaveError(null);
      try {
        const res = await fetch(`/api/trackers/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, schema: schemaToSave }),
        });
        if (!res.ok) throw new Error("Failed to save tracker");
        setDirty(false);
      } catch {
        setSaveError("Failed to save tracker");
      } finally {
        setSaving(false);
      }
    },
    [id, name, schema],
  );

  const onSchemaChange = useCallback(
    (next: TrackerDisplayProps) => {
      setSchema(next);
      setDirty(true);
      void persistSchema(next);
    },
    [persistSchema],
  );

  const handleSave = useCallback(async () => {
    await persistSchema();
  }, [persistSchema]);

  const title = pageTitle(mode);
  const configuredCount = configuredTargets.length;
  const normalizedQuery = query.trim().toLowerCase();
  const filteredConfiguredTargets = useMemo(() => {
    if (!normalizedQuery) return configuredTargets;
    return configuredTargets.filter((target) => {
      const haystack =
        `${target.fieldLabel} ${target.gridName} ${target.dataType}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [configuredTargets, normalizedQuery]);

  const groupedConfiguredTargets = useMemo(() => {
    const map = new Map<string, EditableTarget[]>();
    for (const target of filteredConfiguredTargets) {
      const items = map.get(target.gridName) ?? [];
      items.push(target);
      map.set(target.gridName, items);
    }
    return Array.from(map.entries()).map(([gridName, items]) => ({
      gridName,
      items,
    }));
  }, [filteredConfiguredTargets]);

  const handleRemoveTarget = useCallback(
    (target: EditableTarget) => {
      if (!schema) return;
      const key = target.key;
      let nextSchema: TrackerDisplayProps = schema;

      if (mode === "bindings") {
        const nextBindings = { ...(schema.bindings ?? {}) };
        delete nextBindings[key];
        nextSchema = {
          ...schema,
          bindings:
            Object.keys(nextBindings).length > 0 ? nextBindings : undefined,
        };
      } else if (mode === "validations") {
        const nextValidations = { ...(schema.validations ?? {}) };
        delete nextValidations[key];
        nextSchema = {
          ...schema,
          validations:
            Object.keys(nextValidations).length > 0
              ? nextValidations
              : undefined,
        };
      } else if (mode === "fieldRules") {
        const nextFieldRulesV2 = { ...(schema.fieldRulesV2 ?? {}) };
        delete nextFieldRulesV2[key];
        nextSchema = {
          ...schema,
          fieldRulesV2:
            Object.keys(nextFieldRulesV2).length > 0
              ? nextFieldRulesV2
              : undefined,
        };
      } else {
        const nextCalculations = { ...(schema.calculations ?? {}) };
        delete nextCalculations[key];
        nextSchema = {
          ...schema,
          calculations:
            Object.keys(nextCalculations).length > 0
              ? nextCalculations
              : undefined,
        };
      }

      setSchema(nextSchema);
      setDirty(true);
      void persistSchema(nextSchema);
      setDeleteTarget(null);
      if (
        selected?.fieldId === target.fieldId &&
        selected.gridId === target.gridId
      ) {
        setSelected(null);
      }
    },
    [mode, persistSchema, schema, selected],
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  if (error || !id || !schema) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center gap-4 px-4">
        <p className="text-muted-foreground">
          {error ?? "Failed to load tracker"}
        </p>
        <Button variant="outline" onClick={() => router.push("/dashboard")}>
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header
        className={cn(
          "sticky top-0 z-40 h-12 border-b bg-background/90 backdrop-blur-md",
          theme.border.verySubtle,
        )}
      >
        <nav className="flex h-full items-center justify-between px-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => router.push(`/tracker/${id}`)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Back to tracker"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <Settings2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-semibold truncate">{name}</span>
              <span className="text-xs text-muted-foreground">/</span>
              <span className="text-sm text-muted-foreground">{title}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              asChild
            >
              <Link href={`/tracker/${id}`}>
                <FileText className="h-3.5 w-3.5" /> Tracker
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              asChild
            >
              <Link href={`/tracker/${id}/edit`}>
                <Pencil className="h-3.5 w-3.5" /> Full editor
              </Link>
            </Button>
            <Button
              size="sm"
              className="h-8 gap-1.5 text-xs"
              disabled={!dirty || saving}
              onClick={handleSave}
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-5 space-y-3">
          {saveError && (
            <div className="rounded-sm border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {saveError}
            </div>
          )}
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">{title} Workspace</h1>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="tabular-nums text-[11px]">
                {configuredCount} configured
              </Badge>
              <Badge variant="outline" className="tabular-nums text-[11px]">
                {availableTargets.length} available
              </Badge>
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 text-xs"
                onClick={() => {
                  setAddSelection(availableTargets[0]?.key ?? null);
                  setAddDialogOpen(true);
                }}
                disabled={availableTargets.length === 0}
              >
                <Plus className="h-3.5 w-3.5" />
                Add another
              </Button>
            </div>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/80" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${title.toLowerCase()} by field, grid, or type`}
              className="h-9 pl-8 text-sm"
            />
          </div>
        </div>
        {filteredConfiguredTargets.length === 0 ? (
          configuredCount === 0 ? (
            <div
              className={cn(
                "border px-3 py-10 text-center text-sm text-muted-foreground",
                theme.radius.md,
                theme.border.subtle,
              )}
            >
              No configured {title.toLowerCase()} yet. Use{" "}
              <span className="font-medium">Add another</span> to start.
            </div>
          ) : (
            <div
              className={cn(
                "border px-3 py-10 text-center text-sm text-muted-foreground",
                theme.radius.md,
                theme.border.subtle,
              )}
            >
              No matches for &ldquo;{query.trim()}&rdquo;. Try a different
              search.
            </div>
          )
        ) : (
          <div className="space-y-4">
            {groupedConfiguredTargets.map((group) => (
              <section
                key={group.gridName}
                className={cn(
                  "overflow-hidden border bg-card/40 ",
                  theme.radius.md,
                  theme.border.subtle,
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-between border-b bg-muted/25 px-4 py-2.5",
                    theme.border.subtle,
                  )}
                >
                  <h2 className="truncate text-sm font-semibold text-foreground">
                    {group.gridName}
                  </h2>
                  <Badge variant="outline" className="text-[11px] tabular-nums">
                    {group.items.length} configured
                  </Badge>
                </div>
                <div className={cn("divide-y", theme.border.divideSubtle)}>
                  {group.items.map((target) => (
                    <div
                      key={target.key}
                      className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/20"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium text-foreground">
                            {target.fieldLabel}
                          </p>
                          <Badge
                            variant="secondary"
                            className="text-[11px] tabular-nums"
                          >
                            {target.count} {modeCountLabel(mode).toLowerCase()}
                          </Badge>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="capitalize">
                            {target.dataType.replace(/_/g, " ")}
                          </span>
                          <span>•</span>
                          <span className="truncate">{target.key}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 min-w-20 text-xs"
                          onClick={() =>
                            setSelected({
                              fieldId: target.fieldId,
                              gridId: target.gridId,
                            })
                          }
                        >
                          Configure
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          aria-label={`Remove ${target.fieldLabel}`}
                          onClick={() => setDeleteTarget(target)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      <FieldSettingsDialog
        open={selected != null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        fieldId={selected?.fieldId ?? null}
        gridId={selected?.gridId ?? null}
        defaultTab={modeTab(mode)}
        allowedTabs={[modeTab(mode)]}
        schema={schema}
        onSchemaChange={onSchemaChange}
        trackerSchemaId={id}
      />

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Add {title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Pick a field to configure. After selecting, the focused editor
              will open directly.
            </p>
            <Select
              value={addSelection ?? undefined}
              onValueChange={(value) => setAddSelection(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select field" />
              </SelectTrigger>
              <SelectContent>
                {availableTargets.map((target) => (
                  <SelectItem key={target.key} value={target.key}>
                    {target.gridName} / {target.fieldLabel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!addSelection) return;
                const target = availableTargets.find(
                  (item) => item.key === addSelection,
                );
                if (!target) return;
                setSelected({ fieldId: target.fieldId, gridId: target.gridId });
                setAddDialogOpen(false);
              }}
              disabled={!addSelection}
            >
              Open editor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Remove {modeSingularTitle(mode)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              This removes the configured {title.toLowerCase()} for this field.
              You can add it again later.
            </p>
            {deleteTarget && (
              <div
                className={cn(
                  "border bg-muted/25 px-3 py-2 text-xs",
                  theme.radius.md,
                  theme.border.subtle,
                )}
              >
                <div>
                  <span className="font-medium text-foreground">Field:</span>{" "}
                  {deleteTarget.fieldLabel}
                </div>
                <div>
                  <span className="font-medium text-foreground">Grid:</span>{" "}
                  {deleteTarget.gridName}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!deleteTarget) return;
                handleRemoveTarget(deleteTarget);
              }}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
