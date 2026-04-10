"use client";

import type { MapFieldsNode, FieldMappingEntry } from "@/lib/workflows/types";
import type { AvailableField } from "@/app/components/tracker-display/edit-mode/expr/expr-types";
import { ExprRuleEditor } from "@/app/components/tracker-display/edit-mode/expr/ExprRuleEditor";
import { Plus, Trash2 } from "lucide-react";

export interface TargetFieldOption {
  trackerSchemaId: string;
  gridId: string;
  fieldId: string;
  label: string;
}

interface SourceField {
  sourceFieldId: string;
  label: string;
}

interface MapFieldsConfigProps {
  node: MapFieldsNode;
  sourceFields: SourceField[];
  targetFieldOptions: TargetFieldOption[];
  availableFields: AvailableField[];
  isV2?: boolean;
  onChange: (node: MapFieldsNode) => void;
  onAutoSuggest?: () => void;
}

function optionKey(t: TargetFieldOption) {
  return `${t.trackerSchemaId}::${t.gridId}::${t.fieldId}`;
}

export function MapFieldsConfig({
  node,
  sourceFields,
  targetFieldOptions,
  availableFields,
  isV2 = false,
  onChange,
  onAutoSuggest,
}: MapFieldsConfigProps) {
  const addMapping = () => {
    const firstTarget = targetFieldOptions[0];
    const entry: FieldMappingEntry = {
      id: `mapping-${crypto.randomUUID()}`,
      source: { type: "field", path: "" },
      target: firstTarget
        ? {
            trackerSchemaId: firstTarget.trackerSchemaId,
            fieldId: firstTarget.fieldId,
            ...(isV2 ? {} : { gridId: firstTarget.gridId }),
          }
        : isV2
          ? { trackerSchemaId: "", fieldId: "" }
          : { trackerSchemaId: "", gridId: "", fieldId: "" },
    };
    onChange({
      ...node,
      config: { ...node.config, mappings: [...node.config.mappings, entry] },
    });
  };

  const removeMapping = (id: string) => {
    onChange({
      ...node,
      config: {
        ...node.config,
        mappings: node.config.mappings.filter((m) => m.id !== id),
      },
    });
  };

  const updateMapping = (id: string, updates: Partial<FieldMappingEntry>) => {
    onChange({
      ...node,
      config: {
        ...node.config,
        mappings: node.config.mappings.map((m) =>
          m.id === id ? { ...m, ...updates } : m,
        ),
      },
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-medium text-foreground/70">
          Field mappings
        </label>
        <div className="flex gap-1.5">
          {onAutoSuggest && (
            <button
              type="button"
              onClick={onAutoSuggest}
              className="rounded-sm border border-input bg-muted/30 px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted/60"
            >
              Auto-suggest
            </button>
          )}
          <button
            type="button"
            onClick={addMapping}
            className="flex items-center gap-1 rounded-sm border border-input bg-muted/30 px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted/60"
          >
            <Plus className="h-3 w-3" />
            Add
          </button>
        </div>
      </div>

      {node.config.mappings.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Map trigger row values into target tracker fields.
        </p>
      ) : (
        <div className="space-y-3">
          {node.config.mappings.map((mapping) => (
            <div
              key={mapping.id}
              className="space-y-2 rounded-sm border border-input bg-muted/10 p-2"
            >
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex gap-2 text-[11px]">
                    <label className="flex items-center gap-1">
                      <input
                        type="radio"
                        checked={mapping.source.type === "field"}
                        onChange={() =>
                          updateMapping(mapping.id, {
                            source: { type: "field", path: "" },
                          })
                        }
                      />
                      Field
                    </label>
                    <label className="flex items-center gap-1">
                      <input
                        type="radio"
                        checked={mapping.source.type === "expression"}
                        onChange={() =>
                          updateMapping(mapping.id, {
                            source: {
                              type: "expression",
                              expr: {
                                op: "const",
                                value: "",
                              },
                            },
                          })
                        }
                      />
                      Expression
                    </label>
                  </div>

                  {mapping.source.type === "field" ? (
                    <select
                      value={mapping.source.path ?? ""}
                      onChange={(e) =>
                        updateMapping(mapping.id, {
                          source: {
                            type: "field",
                            path: e.target.value,
                          },
                        })
                      }
                      className="w-full rounded-sm border border-input bg-transparent px-2 py-1.5 text-xs focus:border-ring focus:outline-none"
                    >
                      <option value="">Source field...</option>
                      {sourceFields.map((f) => (
                        <option key={f.sourceFieldId} value={f.sourceFieldId}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="max-h-64 overflow-y-auto rounded-sm border border-input p-2">
                      <ExprRuleEditor
                        expr={
                          mapping.source.expr ?? {
                            op: "const",
                            value: "",
                          }
                        }
                        gridId="workflow"
                        fieldId={`map_${mapping.id}`}
                        availableFields={availableFields}
                        mode="calculation"
                        onChange={(expr) =>
                          updateMapping(mapping.id, {
                            source: { type: "expression", expr },
                          })
                        }
                      />
                    </div>
                  )}

                  <select
                    value={
                      targetFieldOptions.find(
                        (o) =>
                          o.trackerSchemaId === mapping.target.trackerSchemaId &&
                          o.fieldId === mapping.target.fieldId &&
                          (isV2 || o.gridId === mapping.target.gridId),
                      )
                        ? optionKey(
                            targetFieldOptions.find(
                              (o) =>
                                o.trackerSchemaId ===
                                  mapping.target.trackerSchemaId &&
                                o.fieldId === mapping.target.fieldId &&
                                (isV2 || o.gridId === mapping.target.gridId),
                            )!,
                          )
                        : ""
                    }
                    onChange={(e) => {
                      const opt = targetFieldOptions.find(
                        (o) => optionKey(o) === e.target.value,
                      );
                      if (!opt) return;
                      updateMapping(mapping.id, {
                        target: {
                          trackerSchemaId: opt.trackerSchemaId,
                          fieldId: opt.fieldId,
                          ...(isV2 ? {} : { gridId: opt.gridId }),
                        },
                      });
                    }}
                    className="w-full rounded-sm border border-input bg-transparent px-2 py-1.5 text-xs focus:border-ring focus:outline-none"
                  >
                    <option value="">Target field...</option>
                    {targetFieldOptions.map((o) => (
                      <option key={optionKey(o)} value={optionKey(o)}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => removeMapping(mapping.id)}
                  className="rounded-sm p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  title="Remove mapping"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
