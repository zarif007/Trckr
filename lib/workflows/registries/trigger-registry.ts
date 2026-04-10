/**
 * Trigger definitions for workflow builder palette and future dispatch expansion.
 * Core IDs match persisted trigger node `config.event` values where applicable.
 */

export interface TriggerDefinition {
  id: string;
  label: string;
  description: string;
  /** When false, UI may show as disabled; dispatch does not run this kind yet. */
  supported: boolean;
}

const CORE: TriggerDefinition[] = [
  {
    id: "row_create",
    label: "Row created",
    description: "When a new row is created on the source tracker",
    supported: true,
  },
  {
    id: "row_update",
    label: "Row updated",
    description: "When a row is updated on the source tracker",
    supported: true,
  },
  {
    id: "row_delete",
    label: "Row deleted",
    description: "When a row is deleted on the source tracker",
    supported: true,
  },
  {
    id: "field_change",
    label: "Field changed",
    description: "When watched fields change (requires diff support)",
    supported: false,
  },
];

const STUBS: TriggerDefinition[] = [
  {
    id: "status_transition",
    label: "Status transition",
    description: "When a status field moves between defined states",
    supported: false,
  },
  {
    id: "scheduled",
    label: "Scheduled",
    description: "Time-based trigger",
    supported: false,
  },
  {
    id: "webhook",
    label: "Webhook",
    description: "Inbound HTTP trigger",
    supported: false,
  },
  {
    id: "related_tracker_change",
    label: "Related tracker change",
    description: "When a linked tracker row changes",
    supported: false,
  },
];

const registry = new Map<string, TriggerDefinition>();

function register(def: TriggerDefinition) {
  registry.set(def.id, def);
}

for (const d of [...CORE, ...STUBS]) {
  register(d);
}

export function listTriggerDefinitions(): TriggerDefinition[] {
  return [...registry.values()];
}

export function getTriggerDefinition(id: string): TriggerDefinition | undefined {
  return registry.get(id);
}
