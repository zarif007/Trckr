"use client";

import type { MapFieldsNode, FieldMappingEntry } from "@/lib/workflows/types";
import { Plus, Trash2 } from "lucide-react";

interface SourceField {
  sourceFieldId: string;
  label: string;
}

interface TargetField {
  targetFieldId: string;
  label: string;
}

interface MapFieldsConfigProps {
  node: MapFieldsNode;
  sourceFields: SourceField[];
  targetFields: TargetField[];
  onChange: (node: MapFieldsNode) => void;
  onAutoSuggest?: () => void;
}

export function MapFieldsConfig({
  node,
  sourceFields,
  targetFields,
  onChange,
  onAutoSuggest,
}: MapFieldsConfigProps) {
  const addMapping = () => {
    const entry: FieldMappingEntry = {
      id: `mapping-${crypto.randomUUID()}`,
      source: { type: "field", path: "" },
      target: {
        trackerSchemaId: node.config.mappings[0]?.target.trackerSchemaId ?? "",
        gridId: node.config.mappings[0]?.target.gridId ?? "",
        fieldId: "",
      },
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
              className="rounded-sm border border-border/40 bg-muted/30 px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted/60"
            >
              Auto-suggest
            </button>
          )}
          <button
            type="button"
            onClick={addMapping}
            className="flex items-center gap-1 rounded-sm border border-border/40 bg-muted/30 px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted/60"
          >
            <Plus className="h-3 w-3" />
            Add
          </button>
        </div>
      </div>

      {node.config.mappings.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Add field mappings to pass data from trigger to target.
        </p>
      ) : (
        <div className="space-y-2">
          {node.config.mappings.map((mapping, i) => (
            <div
              key={mapping.id}
              className="flex items-start gap-2 rounded-sm border border-border/30 bg-muted/10 p-2"
            >
              <div className="flex-1 space-y-1.5">
                <SourceTargetSelect
                  sourceFields={sourceFields}
                  value={mapping}
                  onChange={(up) => updateMapping(mapping.id, up)}
                />
                <select
                  value={mapping.target.fieldId}
                  onChange={(e) =>
                    updateMapping(mapping.id, {
                      target: { ...mapping.target, fieldId: e.target.value },
                    })
                  }
                  className="w-full rounded-sm border border-input bg-transparent px-2 py-1.5 text-xs focus:border-ring focus:outline-none"
                >
                  <option value="">Target field...</option>
                  {targetFields.map((f) => (
                    <option key={f.targetFieldId} value={f.targetFieldId}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => removeMapping(mapping.id)}
                className="mt-0.5 rounded-sm p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SourceTargetSelect({
  sourceFields,
  value,
  onChange,
}: {
  sourceFields: SourceField[];
  value: FieldMappingEntry;
  onChange: (updates: Partial<FieldMappingEntry>) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <select
        value={value.source.type === "field" ? value.source.path ?? "" : ""}
        onChange={(e) =>
          onChange({
            source: { type: "field" as const, path: e.target.value },
          })
        }
        className="flex-1 rounded-sm border border-input bg-transparent px-2 py-1.5 text-xs focus:border-ring focus:outline-none"
      >
        <option value="">Source...</option>
        {sourceFields.map((f) => (
          <option key={f.sourceFieldId} value={f.sourceFieldId}>
            {f.label}
          </option>
        ))}
      </select>
    </div>
  );
}
