"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  getRegisteredDynamicOptionsIds,
  resolveDynamicOptions,
  type DynamicOptionFunctionDef,
  type DynamicOptionsDefinitions,
  type DynamicOptionsResolveInput,
  type DynamicOptionsResolveResult,
} from "@/lib/dynamic-options";
import type { TrackerDisplayProps } from "../../types";
import { ensureGraphFunction } from "./dynamic-function-graph";

interface DynamicOptionsBuilderProps {
  schema: TrackerDisplayProps;
  fieldId: string;
  functionId: string;
  onFunctionIdChange: (next: string) => void;
  argsText: string;
  onArgsTextChange: (next: string) => void;
  cacheTtlText: string;
  onCacheTtlTextChange: (next: string) => void;
  dynamicOptionsDraft: DynamicOptionsDefinitions;
  onDynamicOptionsDraftChange: (next: DynamicOptionsDefinitions) => void;
  onValidationStateChange?: (state: {
    canSave: boolean;
    compileErrors: string[];
    previewError: string | null;
  }) => void;
  trackerSchemaId?: string | null;
}

function parseJsonObject(input: string): Record<string, unknown> | null {
  if (!input.trim()) return {};
  try {
    const parsed = JSON.parse(input);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function DynamicOptionsBuilder({
  schema,
  fieldId,
  functionId,
  onFunctionIdChange,
  argsText,
  cacheTtlText,
  dynamicOptionsDraft,
  onDynamicOptionsDraftChange,
  onValidationStateChange,
  trackerSchemaId,
}: DynamicOptionsBuilderProps) {
  const remoteResolve = useCallback<
    NonNullable<DynamicOptionsResolveInput["remoteResolver"]>
  >(
    async (payload): Promise<DynamicOptionsResolveResult> => {
      const response = await fetch("/api/dynamic-options/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          ...(trackerSchemaId ? { trackerSchemaId } : {}),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          data?.error ?? "Failed to resolve dynamic options preview",
        );
      }
      return data as DynamicOptionsResolveResult;
    },
    [trackerSchemaId],
  );

  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [preview, setPreview] = useState<DynamicOptionsResolveResult | null>(
    null,
  );

  const functions = useMemo(
    () => dynamicOptionsDraft.functions ?? {},
    [dynamicOptionsDraft.functions],
  );
  const connectors = useMemo(
    () => dynamicOptionsDraft.connectors ?? {},
    [dynamicOptionsDraft.connectors],
  );

  const builtInIds = useMemo(() => getRegisteredDynamicOptionsIds(), []);

  const isBuiltIn = Boolean(functionId && builtInIds.includes(functionId));
  const currentFunction = useMemo(
    () =>
      functionId && functions[functionId] ? functions[functionId] : undefined,
    [functions, functionId],
  );
  const isMyFunction = Boolean(currentFunction);

  const updateDraft = useCallback(
    (next: DynamicOptionsDefinitions) => {
      onDynamicOptionsDraftChange({
        functions: next.functions ?? {},
        connectors: next.connectors ?? {},
      });
    },
    [onDynamicOptionsDraftChange],
  );

  const upsertFunction = useCallback(
    (nextFn: DynamicOptionFunctionDef, previousId?: string) => {
      const nextFunctions = { ...(dynamicOptionsDraft.functions ?? {}) };
      if (previousId && previousId !== nextFn.id) {
        delete nextFunctions[previousId];
      }
      nextFunctions[nextFn.id] = nextFn;
      updateDraft({
        ...dynamicOptionsDraft,
        functions: nextFunctions,
      });
      onFunctionIdChange(nextFn.id);
      setPreview(null);
      setPreviewError(null);
    },
    [dynamicOptionsDraft, onFunctionIdChange, updateDraft],
  );

  const canSave = Boolean(
    !functionId || isBuiltIn || (isMyFunction && preview && !previewError),
  );

  useEffect(() => {
    onValidationStateChange?.({
      canSave,
      compileErrors: [],
      previewError,
    });
  }, [canSave, onValidationStateChange, previewError]);

  useEffect(() => {
    if (!currentFunction || currentFunction.engine === "graph_v1") return;
    const converted = ensureGraphFunction(currentFunction, schema, connectors);
    upsertFunction(converted, currentFunction.id);
  }, [connectors, currentFunction, schema, upsertFunction]);

  const refreshPreview = async (forceRefresh = false) => {
    if (!functionId) {
      setPreviewError("Choose or create a function first.");
      return;
    }

    let parsedArgs: Record<string, unknown> = {};
    if (argsText.trim()) {
      const parsed = parseJsonObject(argsText);
      if (!parsed) {
        setPreviewError("Args must be a valid JSON object.");
        return;
      }
      parsedArgs = parsed;
    }

    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const ttlOverride = cacheTtlText.trim()
        ? Number(cacheTtlText)
        : undefined;
      const result = await resolveDynamicOptions({
        functionId,
        context: {
          grids: schema.grids,
          fields: schema.fields,
          layoutNodes: schema.layoutNodes,
          sections: schema.sections,
          dynamicOptions: dynamicOptionsDraft,
          gridData: schema.initialGridData,
        },
        runtime: {
          currentGridId: schema.grids[0]?.id,
          currentFieldId: fieldId,
          rowIndex: 0,
          currentRow:
            schema.initialGridData?.[schema.grids[0]?.id ?? ""]?.[0] ?? {},
        },
        args: parsedArgs,
        forceRefresh,
        cacheTtlSecondsOverride: Number.isFinite(ttlOverride)
          ? ttlOverride
          : undefined,
        remoteResolver: remoteResolve,
      });
      setPreview(result);
    } catch (error) {
      setPreviewError(
        error instanceof Error ? error.message : "Failed to refresh preview",
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-sm border border-border/60 bg-muted/20 p-4 space-y-3">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
          Option source
        </p>
        <p className="text-xs text-muted-foreground">
          Choose a built-in source, one of your functions, or add a new
          function. The selected source supplies options for this field.
        </p>

        <div className="space-y-2">
          <span className="text-xs font-medium text-foreground/80">
            Built-in
          </span>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={!functionId ? "default" : "outline"}
              size="sm"
              onClick={() => {
                onFunctionIdChange("");
                setPreview(null);
                setPreviewError(null);
              }}
            >
              None
            </Button>
            {builtInIds.map((id) => (
              <Button
                key={id}
                type="button"
                variant={functionId === id ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  onFunctionIdChange(id);
                  setPreview(null);
                  setPreviewError(null);
                }}
              >
                {id.replace(/_/g, " ")}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-sm border border-border/60 bg-muted/20 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
            Live preview
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => refreshPreview(false)}
              disabled={previewLoading}
            >
              Refresh
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => refreshPreview(true)}
              disabled={previewLoading}
            >
              Force refresh
            </Button>
          </div>
        </div>

        {!preview && !previewError && (
          <p className="text-xs text-muted-foreground">
            Run preview at least once before saving.
          </p>
        )}
        {previewError && (
          <p className="text-xs text-destructive">{previewError}</p>
        )}

        {preview && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              fromCache: {String(preview.meta.fromCache)} · fetchedAt:{" "}
              {preview.meta.fetchedAt} · duration: {preview.meta.durationMs}ms
            </p>
            {preview.warnings && preview.warnings.length > 0 && (
              <div className="space-y-1">
                {preview.warnings.map((warning, index) => (
                  <p key={index} className="text-xs text-amber-600">
                    • {warning}
                  </p>
                ))}
              </div>
            )}
            <div className="rounded-sm border border-border/50 bg-background/70 p-2 max-h-[180px] overflow-auto">
              <pre className="text-xs font-mono whitespace-pre-wrap">
                {JSON.stringify(preview.options.slice(0, 20), null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>

      {!canSave && isMyFunction && (
        <p className="text-xs text-amber-600">
          Save is blocked until preview resolves successfully.
        </p>
      )}
    </div>
  );
}
