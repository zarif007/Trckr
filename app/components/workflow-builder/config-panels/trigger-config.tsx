"use client";

import type { TriggerNode, WorkflowTriggerEvent } from "@/lib/workflows/types";

const EVENTS: { value: WorkflowTriggerEvent; label: string }[] = [
  { value: "row_create", label: "Row created" },
  { value: "row_update", label: "Row updated" },
  { value: "row_delete", label: "Row deleted" },
  { value: "field_change", label: "Field changed" },
];

interface TriggerConfigProps {
  node: TriggerNode;
  availableTrackers: { schemaId: string; name: string }[];
  availableGrids: { gridId: string; label: string }[];
  onChange: (node: TriggerNode) => void;
}

export function TriggerConfig({
  node,
  availableTrackers,
  availableGrids,
  onChange,
}: TriggerConfigProps) {
  const updateConfig = <K extends keyof TriggerNode["config"]>(
    key: K,
    value: TriggerNode["config"][K],
  ) => {
    onChange({ ...node, config: { ...node.config, [key]: value } });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-foreground/70">Tracker</label>
        <select
          value={node.config.trackerSchemaId}
          onChange={(e) => updateConfig("trackerSchemaId", e.target.value)}
          className="mt-1 w-full rounded-sm border border-input bg-transparent px-3 py-2 text-sm focus:border-ring focus:outline-none"
        >
          <option value="">Select tracker...</option>
          {availableTrackers.map((t) => (
            <option key={t.schemaId} value={t.schemaId}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-foreground/70">Grid</label>
        <select
          value={node.config.gridId}
          onChange={(e) => updateConfig("gridId", e.target.value)}
          className="mt-1 w-full rounded-sm border border-input bg-transparent px-3 py-2 text-sm focus:border-ring focus:outline-none"
        >
          <option value="">Select grid...</option>
          {availableGrids.map((g) => (
            <option key={g.gridId} value={g.gridId}>
              {g.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-foreground/70">Event</label>
        <div className="mt-1 grid grid-cols-2 gap-1.5">
          {EVENTS.map((ev) => (
            <button
              key={ev.value}
              type="button"
              onClick={() => updateConfig("event", ev.value)}
              className={`rounded-sm border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                node.config.event === ev.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted/60"
              }`}
            >
              {ev.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
