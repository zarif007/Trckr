/**
 * Shared constants — CSS classes, edge styles, node category icon/color map.
 */

import type { CSSProperties, ReactNode } from "react";
import {
  ArrowUpDown,
  CheckCircle2,
  ChevronsUpDown,
  Database,
  Fingerprint,
  Filter,
  Globe,
  Layers,
  LayoutGrid,
  ListFilter,
  Map as MapIcon,
  Play,
  Sparkles,
  Settings,
} from "lucide-react";
import { MarkerType } from "reactflow";

// ---------------------------------------------------------------------------
// Node category visual styles
// ---------------------------------------------------------------------------

export const NODE_CATEGORY_STYLES: Record<
  string,
  { accent: string; iconBg: string; icon: ReactNode }
> = {
  "control.start": {
    accent: "bg-green-500",
    iconBg: "bg-green-500/15",
    icon: <Play className="h-3.5 w-3.5 text-green-600" />,
  },
  "output.options": {
    accent: "bg-amber-500",
    iconBg: "bg-amber-500/15",
    icon: <CheckCircle2 className="h-3.5 w-3.5 text-amber-600" />,
  },
  "source.grid_rows": {
    accent: "bg-blue-500",
    iconBg: "bg-blue-500/15",
    icon: <Database className="h-3.5 w-3.5 text-blue-600" />,
  },
  "source.current_context": {
    accent: "bg-blue-500",
    iconBg: "bg-blue-500/15",
    icon: <LayoutGrid className="h-3.5 w-3.5 text-blue-600" />,
  },
  "source.layout_fields": {
    accent: "bg-blue-500",
    iconBg: "bg-blue-500/15",
    icon: <Layers className="h-3.5 w-3.5 text-blue-600" />,
  },
  "source.http_get": {
    accent: "bg-blue-500",
    iconBg: "bg-blue-500/15",
    icon: <Globe className="h-3.5 w-3.5 text-blue-600" />,
  },
  "transform.filter": {
    accent: "bg-violet-500",
    iconBg: "bg-violet-500/15",
    icon: <Filter className="h-3.5 w-3.5 text-violet-600" />,
  },
  "transform.map_fields": {
    accent: "bg-violet-500",
    iconBg: "bg-violet-500/15",
    icon: <MapIcon className="h-3.5 w-3.5 text-violet-600" />,
  },
  "transform.unique": {
    accent: "bg-violet-500",
    iconBg: "bg-violet-500/15",
    icon: <Fingerprint className="h-3.5 w-3.5 text-violet-600" />,
  },
  "transform.sort": {
    accent: "bg-violet-500",
    iconBg: "bg-violet-500/15",
    icon: <ArrowUpDown className="h-3.5 w-3.5 text-violet-600" />,
  },
  "transform.limit": {
    accent: "bg-violet-500",
    iconBg: "bg-violet-500/15",
    icon: <ListFilter className="h-3.5 w-3.5 text-violet-600" />,
  },
  "transform.flatten_path": {
    accent: "bg-violet-500",
    iconBg: "bg-violet-500/15",
    icon: <ChevronsUpDown className="h-3.5 w-3.5 text-violet-600" />,
  },
  "ai.extract_options": {
    accent: "bg-pink-500",
    iconBg: "bg-pink-500/15",
    icon: <Sparkles className="h-3.5 w-3.5 text-pink-600" />,
  },
};

// ---------------------------------------------------------------------------
// CSS class tokens
// ---------------------------------------------------------------------------

export const NODE_BASE_CLASSES =
  "overflow-hidden rounded-sm border border-border/50 bg-background transition-all duration-200 hover:hover:-translate-y-px";

export const NODE_HEADER_CLASSES =
  "flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold";

export const NODE_ICON_CLASSES =
  "h-[22px] w-[22px] rounded-sm flex items-center justify-center flex-shrink-0";

export const NODE_DELETE_BUTTON_CLASSES =
  "nodrag nopan inline-flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground/70 hover:text-destructive hover:bg-destructive/10 transition-colors";

export const HANDLE_CLASSES =
  "!h-3.5 !w-3.5 !rounded-full !border-2 !bg-background !border-muted-foreground/30 hover:!border-primary hover:!bg-primary/20 transition-all duration-150";

// ---------------------------------------------------------------------------
// Edge defaults
// ---------------------------------------------------------------------------

export const EDGE_STYLE: CSSProperties = {
  stroke: "hsl(var(--primary) / 0.6)",
  strokeWidth: 1.5,
  strokeLinecap: "round",
};

export const EDGE_MARKER = {
  type: MarkerType.ArrowClosed,
  color: "hsl(var(--primary) / 0.7)",
  width: 14,
  height: 14,
};

export const EDGE_DEFAULTS = {
  type: "smoothstep" as const,
  style: EDGE_STYLE,
  markerEnd: EDGE_MARKER,
  animated: false,
  pathOptions: { borderRadius: 8 },
};

// ---------------------------------------------------------------------------
// Default fallback icon
// ---------------------------------------------------------------------------

export const NODE_FALLBACK_STYLE = {
  accent: "bg-gray-500",
  iconBg: "bg-gray-500/15",
  icon: <Settings className="h-3.5 w-3.5 text-gray-600" />,
};
