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
  /** V2: tracker-wide events; grid selector hidden. */
  isV2?: boolean;
  /** Fields on the trigger’s tracker (for optional watch list). */
  watchFieldOptions?: { fieldId: string; label: string }[];
  onChange: (node: TriggerNode) => void;
}

export function TriggerConfig({
  node,
  availableTrackers,
  availableGrids,
  isV2 = false,
  watchFieldOptions = [],
  onChange,
}: TriggerConfigProps) {
  const updateConfig = <K extends keyof TriggerNode["config"]>(
    key: K,
    value: TriggerNode["config"][K],
  ) => {
    onChange({ ...node, config: { ...node.config, [key]: value } });
  };

  const toggleWatchField = (fieldId: string) => {
    const cur = node.config.watchFields ?? [];
    const next = cur.includes(fieldId)
      ? cur.filter((f) => f !== fieldId)
      : [...cur, fieldId];
    updateConfig("watchFields", next.length ? next : undefined);
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

      {!isV2 && (
        <div>
          <label className="text-xs font-medium text-foreground/70">Grid</label>
          <select
            value={node.config.gridId ?? ""}
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
      )}

      {isV2 && (
        <p className="text-xs text-muted-foreground">
          V2 listens on all grids for this tracker. Row identity still includes grid
          context at runtime.
        </p>
      )}

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

      {(isV2 || node.config.event === "field_change") &&
        watchFieldOptions.length > 0 && (
          <div>
            <label className="text-xs font-medium text-foreground/70">
              Watch fields (optional)
            </label>
            <p className="mt-0.5 text-[11px] text-muted-foreground mb-2">
              For updates, only run when one of these fields changed.
            </p>
            <ul className="max-h-36 space-y-1 overflow-y-auto rounded-sm border border-input p-2">
              {watchFieldOptions.map((f) => (
                <li key={f.fieldId}>
                  <label className="flex cursor-pointer items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={(node.config.watchFields ?? []).includes(f.fieldId)}
                      onChange={() => toggleWatchField(f.fieldId)}
                    />
                    <span>{f.label}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}
    </div>
  );
}
