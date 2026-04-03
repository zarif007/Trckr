/**
 * Generates a human-readable summary string for each node kind.
 */

import type { DynamicConnectorDef, DynamicFunctionNodeKind } from "@/lib/dynamic-options";

export function getNodeSummary(
  kind: DynamicFunctionNodeKind,
  config: Record<string, unknown>,
  grids: Array<{ id: string; name: string }>,
  connectors: Record<string, DynamicConnectorDef>,
): string {
  switch (kind) {
    case "source.grid_rows": {
      const gridId = String(config.gridId ?? "");
      const grid = grids.find((g) => g.id === gridId);
      return grid ? `Grid: ${grid.name}` : gridId ? `Grid: ${gridId}` : "Grid";
    }
    case "source.current_context":
      return "Current row + fields";
    case "source.layout_fields":
      return "Layout fields";
    case "source.http_get": {
      const connId = String(config.connectorId ?? "");
      const conn = connectors[connId];
      return conn
        ? `API: ${conn.name}`
        : connId
          ? `API: ${connId}`
          : "External API";
    }
    case "transform.filter": {
      const hasExpr = config.expr != null && typeof config.expr === "object";
      const preds = Array.isArray(config.predicates)
        ? config.predicates.length
        : 0;
      return hasExpr
        ? "Expression"
        : preds
          ? `${preds} condition(s)`
          : "Filter";
    }
    case "transform.map_fields": {
      const mappings = config.mappings as Record<string, unknown> | undefined;
      const n = mappings ? Object.keys(mappings).length : 0;
      return `${n} field(s)`;
    }
    case "transform.unique":
      return `By: ${String(config.by || "—")}`;
    case "transform.sort":
      return `${String(config.by || "—")} ${String(config.direction ?? "asc")}`;
    case "transform.limit":
      return `Limit: ${Number(config.count ?? 0)}`;
    case "transform.flatten_path":
      return `Path: ${String(config.path || "—")}`;
    case "ai.extract_options":
      return "LLM extract";
    case "output.options":
      return "Return options";
    case "control.start":
      return "Start";
    default:
      return "";
  }
}
