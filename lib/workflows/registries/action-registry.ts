/**
 * Action definitions for workflow builder palette and executor expansion.
 */

export interface ActionDefinition {
  id: string;
  label: string;
  description: string;
  supported: boolean;
}

const CORE: ActionDefinition[] = [
  {
    id: "create_row",
    label: "Create row",
    description: "Create a row on the target tracker (primary grid)",
    supported: true,
  },
  {
    id: "update_row",
    label: "Update row",
    description: "Update rows matching a where expression",
    supported: true,
  },
  {
    id: "delete_row",
    label: "Delete row",
    description: "Soft-delete rows matching a where expression",
    supported: true,
  },
  {
    id: "redirect",
    label: "Redirect",
    description: "Emit an inline redirect URL (interactive saves only)",
    supported: true,
  },
];

const STUBS: ActionDefinition[] = [
  {
    id: "upsert_by_key",
    label: "Upsert by key",
    description: "Create or update using a natural key",
    supported: false,
  },
  {
    id: "notification",
    label: "Notification",
    description: "Send in-app or email notification",
    supported: false,
  },
  {
    id: "assignment",
    label: "Assignment",
    description: "Assign row to a user or role",
    supported: false,
  },
  {
    id: "webhook_call",
    label: "Webhook call",
    description: "Outbound HTTP request",
    supported: false,
  },
  {
    id: "approval_gate",
    label: "Approval gate",
    description: "Pause until approval",
    supported: false,
  },
];

const registry = new Map<string, ActionDefinition>();

function register(def: ActionDefinition) {
  registry.set(def.id, def);
}

for (const d of [...CORE, ...STUBS]) {
  register(d);
}

export function listActionDefinitions(): ActionDefinition[] {
  return [...registry.values()];
}

export function getActionDefinition(id: string): ActionDefinition | undefined {
  return registry.get(id);
}
