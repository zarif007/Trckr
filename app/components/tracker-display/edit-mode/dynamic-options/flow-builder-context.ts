/**
 * Shared context value and provider for the flow builder.
 * Decoupled from the node card so it can be shared across files.
 */

import { createContext } from "react";
import type { DynamicConnectorDef } from "@/lib/dynamic-options";
import type { ExprNode } from "@/lib/functions/types";
import type { AvailableField } from "../expr/expr-types";

export interface FlowBuilderContextValue {
  expandedNodeId: string | null;
  setExpandedNodeId: (id: string | null) => void;
  updateNodeConfig: (
    nodeId: string,
    updater: (config: Record<string, unknown>) => Record<string, unknown>,
  ) => void;
  grids: Array<{ id: string; name: string }>;
  connectors: Record<string, DynamicConnectorDef>;
  availableFields: AvailableField[];
  openFilterExprDialog: (nodeId: string, expr: ExprNode) => void;
  deleteNode: (id: string) => void;
}

export const FlowBuilderContext = createContext<FlowBuilderContextValue | null>(null);
