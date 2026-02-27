'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import ReactFlow, {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  Handle,
  MarkerType,
  Position,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type OnSelectionChangeParams,
  type ReactFlowInstance,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  ChevronDown, 
  Plus, 
  Trash2, 
  Play, 
  Database, 
  LayoutGrid, 
  Globe, 
  Filter, 
  Map as MapIcon, 
  Fingerprint, 
  ArrowUpDown, 
  ListFilter, 
  ChevronsUpDown, 
  Sparkles,
  CheckCircle2,
  Settings,
  FileJson,
  Layers
} from 'lucide-react'
import {
  compileDynamicOptionFunctionGraph,
  type DynamicConnectorDef,
  type DynamicFunctionGraphDef,
  type DynamicFunctionGraphNode,
  type DynamicFunctionNodeKind,
  type DynamicOptionGraphFunctionDef,
  type DynamicValueSelector,
} from '@/lib/dynamic-options'
import type { ExprNode } from '@/lib/functions/types'
import { normalizeExprNode } from '@/lib/schemas/expr'
import {
  DYNAMIC_NODE_PALETTE,
  nodeKindLabel,
  type DynamicNodePaletteItem,
} from './dynamic-function-graph'
import { ExprFlowBuilder } from '../expr/ExprFlowBuilder'
import type { AvailableField } from '../expr/expr-types'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FlowBuilderLayout } from '@/lib/flow-builder'
import { cn } from '@/lib/utils'

const DEFAULT_FILTER_EXPR: ExprNode = { op: 'const', value: true }

type SelectorType = 'path' | 'const' | 'fromArg' | 'fromContext'

function getSelectorTypeAndValue(sel: DynamicValueSelector | undefined): { type: SelectorType; value: string } {
  if (sel == null) return { type: 'path', value: '' }
  if (typeof sel === 'string') return { type: 'path', value: sel }
  if ('const' in sel) return { type: 'const', value: JSON.stringify(sel.const) }
  if ('fromArg' in sel) return { type: 'fromArg', value: String(sel.fromArg) }
  if ('fromContext' in sel) return { type: 'fromContext', value: String(sel.fromContext) }
  return { type: 'path', value: '' }
}

function selectorFromTypeAndValue(type: SelectorType, value: string): DynamicValueSelector {
  if (type === 'path') return value
  if (type === 'const') {
    try {
      return { const: JSON.parse(value || 'null') }
    } catch {
      return { const: value }
    }
  }
  if (type === 'fromArg') return { fromArg: value }
  if (type === 'fromContext') return { fromContext: value }
  return value
}

interface DynamicFunctionFlowBuilderProps {
  value: DynamicOptionGraphFunctionDef
  grids: Array<{ id: string; name: string }>
  connectors: Record<string, DynamicConnectorDef>
  onChange: (nextGraph: DynamicFunctionGraphDef) => void
  onValidationChange?: (state: { valid: boolean; errors: string[] }) => void
  /** Optional fields for the filter expression builder (e.g. from schema). */
  availableFields?: AvailableField[]
}

interface FlowNodeData {
  kind: DynamicFunctionNodeKind
  config: Record<string, unknown>
  locked?: boolean
}

type FlowNode = Node<FlowNodeData>

// Modern n8n-inspired node styling with color coding by category
const NODE_CATEGORY_STYLES: Record<string, { border: string; bg: string; icon: ReactNode; color: string }> = {
  'control.start': { 
    border: 'border-green-500/60', 
    bg: 'bg-green-500/10', 
    icon: <Play className="h-4 w-4 text-green-600" />,
    color: 'green'
  },
  'output.options': { 
    border: 'border-amber-500/60', 
    bg: 'bg-amber-500/10', 
    icon: <CheckCircle2 className="h-4 w-4 text-amber-600" />,
    color: 'amber'
  },
  'source.grid_rows': { 
    border: 'border-blue-500/60', 
    bg: 'bg-blue-500/10', 
    icon: <Database className="h-4 w-4 text-blue-600" />,
    color: 'blue'
  },
  'source.current_context': { 
    border: 'border-blue-500/60', 
    bg: 'bg-blue-500/10', 
    icon: <LayoutGrid className="h-4 w-4 text-blue-600" />,
    color: 'blue'
  },
  'source.layout_fields': { 
    border: 'border-blue-500/60', 
    bg: 'bg-blue-500/10', 
    icon: <Layers className="h-4 w-4 text-blue-600" />,
    color: 'blue'
  },
  'source.http_get': { 
    border: 'border-blue-500/60', 
    bg: 'bg-blue-500/10', 
    icon: <Globe className="h-4 w-4 text-blue-600" />,
    color: 'blue'
  },
  'transform.filter': { 
    border: 'border-violet-500/60', 
    bg: 'bg-violet-500/10', 
    icon: <Filter className="h-4 w-4 text-violet-600" />,
    color: 'violet'
  },
  'transform.map_fields': { 
    border: 'border-violet-500/60', 
    bg: 'bg-violet-500/10', 
    icon: <MapIcon className="h-4 w-4 text-violet-600" />,
    color: 'violet'
  },
  'transform.unique': { 
    border: 'border-violet-500/60', 
    bg: 'bg-violet-500/10', 
    icon: <Fingerprint className="h-4 w-4 text-violet-600" />,
    color: 'violet'
  },
  'transform.sort': { 
    border: 'border-violet-500/60', 
    bg: 'bg-violet-500/10', 
    icon: <ArrowUpDown className="h-4 w-4 text-violet-600" />,
    color: 'violet'
  },
  'transform.limit': { 
    border: 'border-violet-500/60', 
    bg: 'bg-violet-500/10', 
    icon: <ListFilter className="h-4 w-4 text-violet-600" />,
    color: 'violet'
  },
  'transform.flatten_path': { 
    border: 'border-violet-500/60', 
    bg: 'bg-violet-500/10', 
    icon: <ChevronsUpDown className="h-4 w-4 text-violet-600" />,
    color: 'violet'
  },
  'ai.extract_options': { 
    border: 'border-pink-500/60', 
    bg: 'bg-pink-500/10', 
    icon: <Sparkles className="h-4 w-4 text-pink-600" />,
    color: 'pink'
  },
}

const NODE_BASE_CLASSES = 'overflow-hidden rounded-xl border-2 shadow-sm transition-all duration-200 hover:shadow-md bg-background'
const NODE_HEADER_CLASSES = 'flex items-center gap-2 px-3 py-2.5 text-xs font-semibold'
const NODE_BODY_CLASSES = 'px-3 pb-3 pt-1'
const HANDLE_CLASSES = '!h-3 !w-3 !border-2 !bg-background !border-foreground/40 hover:!border-primary hover:!bg-primary transition-colors'

// Enhanced edge styling with animated connections
const EDGE_STYLE: CSSProperties = {
  stroke: 'hsl(var(--primary) / 0.5)',
  strokeWidth: 2.5,
  strokeLinecap: 'round',
}

const EDGE_MARKER = {
  type: MarkerType.ArrowClosed,
  color: 'hsl(var(--primary) / 0.6)',
  width: 18,
  height: 18,
}

const EDGE_DEFAULTS = {
  type: 'smoothstep' as const,
  style: EDGE_STYLE,
  markerEnd: EDGE_MARKER,
  animated: true,
}
function getNodeSummary(
  kind: DynamicFunctionNodeKind,
  config: Record<string, unknown>,
  grids: Array<{ id: string; name: string }>,
  connectors: Record<string, DynamicConnectorDef>
): string {
  switch (kind) {
    case 'source.grid_rows': {
      const gridId = String(config.gridId ?? '')
      const grid = grids.find((g) => g.id === gridId)
      return grid ? `Grid: ${grid.name}` : gridId ? `Grid: ${gridId}` : 'Grid'
    }
    case 'source.current_context':
      return 'Current row + fields'
    case 'source.layout_fields':
      return 'Layout fields'
    case 'source.http_get': {
      const connId = String(config.connectorId ?? '')
      const conn = connectors[connId]
      return conn ? `API: ${conn.name}` : connId ? `API: ${connId}` : 'External API'
    }
    case 'transform.filter': {
      const hasExpr = config.expr != null && typeof config.expr === 'object'
      const preds = Array.isArray(config.predicates) ? config.predicates.length : 0
      return hasExpr ? 'Expression' : preds ? `${preds} condition(s)` : 'Filter'
    }
    case 'transform.map_fields': {
      const mappings = config.mappings as Record<string, unknown> | undefined
      const n = mappings ? Object.keys(mappings).length : 0
      return `${n} field(s)`
    }
    case 'transform.unique':
      return `By: ${String(config.by || '—')}`
    case 'transform.sort':
      return `${String(config.by || '—')} ${String(config.direction ?? 'asc')}`
    case 'transform.limit':
      return `Limit: ${Number(config.count ?? 0)}`
    case 'transform.flatten_path':
      return `Path: ${String(config.path || '—')}`
    case 'ai.extract_options':
      return 'LLM extract'
    case 'output.options':
      return 'Return options'
    case 'control.start':
      return 'Start'
    default:
      return ''
  }
}

interface FlowBuilderContextValue {
  expandedNodeId: string | null
  setExpandedNodeId: (id: string | null) => void
  updateNodeConfig: (nodeId: string, updater: (config: Record<string, unknown>) => Record<string, unknown>) => void
  grids: Array<{ id: string; name: string }>
  connectors: Record<string, DynamicConnectorDef>
  availableFields: AvailableField[]
  openFilterExprDialog: (nodeId: string, expr: ExprNode) => void
}

const FlowBuilderContext = createContext<FlowBuilderContextValue | null>(null)

interface DynamicNodeCardInlineConfigProps {
  nodeId: string
  kind: DynamicFunctionNodeKind
  config: Record<string, unknown>
  onConfigChange: (nodeId: string, updater: (c: Record<string, unknown>) => Record<string, unknown>) => void
  grids: Array<{ id: string; name: string }>
  connectors: Record<string, DynamicConnectorDef>
  availableFields: AvailableField[]
  onOpenFilterExpr: (nodeId: string, expr: ExprNode) => void
}

function DynamicNodeCardInlineConfig({
  nodeId,
  kind,
  config,
  onConfigChange,
  grids,
  connectors,
  onOpenFilterExpr,
}: DynamicNodeCardInlineConfigProps) {
  const update = useCallback(
    (updater: (c: Record<string, unknown>) => Record<string, unknown>) => onConfigChange(nodeId, updater),
    [nodeId, onConfigChange]
  )
  const cl = 'h-7 text-xs'
  if (kind === 'source.grid_rows') {
    return (
      <Select value={String(config.gridId ?? '')} onValueChange={(v) => update((c) => ({ ...c, gridId: v }))}>
        <SelectTrigger className={cl}><SelectValue placeholder="Grid" /></SelectTrigger>
        <SelectContent>
          {grids.map((g) => (
            <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }
  if (kind === 'source.current_context') {
    return (
      <div className="space-y-1 flex flex-col">
        <label className="flex items-center gap-2 text-[11px]">
          <Checkbox
            checked={config.includeRowValues !== false}
            onCheckedChange={(v) => update((c) => ({ ...c, includeRowValues: Boolean(v) }))}
          />
          Row values
        </label>
        <label className="flex items-center gap-2 text-[11px]">
          <Checkbox
            checked={config.includeFieldMetadata !== false}
            onCheckedChange={(v) => update((c) => ({ ...c, includeFieldMetadata: Boolean(v) }))}
          />
          Field metadata
        </label>
      </div>
    )
  }
  if (kind === 'source.layout_fields') {
    return (
      <div className="space-y-1 flex flex-col">
        <label className="flex items-center gap-2 text-[11px]">
          <Checkbox
            checked={config.includeHidden === true}
            onCheckedChange={(v) => update((c) => ({ ...c, includeHidden: Boolean(v) }))}
          />
          Include hidden
        </label>
        <label className="flex items-center gap-2 text-[11px]">
          <Checkbox
            checked={config.excludeSharedTab !== false}
            onCheckedChange={(v) => update((c) => ({ ...c, excludeSharedTab: Boolean(v) }))}
          />
          Exclude shared tab
        </label>
      </div>
    )
  }
  if (kind === 'source.http_get') {
    return (
      <div className="space-y-1.5">
        <Select value={String(config.connectorId ?? '')} onValueChange={(v) => update((c) => ({ ...c, connectorId: v }))}>
          <SelectTrigger className={cl}><SelectValue placeholder="Connector" /></SelectTrigger>
          <SelectContent>
            {Object.values(connectors).map((conn) => (
              <SelectItem key={conn.id} value={conn.id}>{conn.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input value={String(config.path ?? '')} onChange={(e) => update((c) => ({ ...c, path: e.target.value }))} placeholder="/path" className={cl} />
      </div>
    )
  }
  if (kind === 'transform.filter') {
    const hasExpr = config.expr != null && typeof config.expr === 'object'
    return (
      <div className="space-y-1.5">
        {hasExpr ? (
          <Button type="button" variant="outline" size="sm" className="w-full h-7 text-xs" onClick={() => onOpenFilterExpr(nodeId, normalizeExprNode((config.expr as ExprNode) ?? DEFAULT_FILTER_EXPR))}>
            Edit expression
          </Button>
        ) : (
          <>
            <Input
              value={String((Array.isArray(config.predicates) && (config.predicates[0] as Record<string, unknown>)?.field) ?? '')}
              onChange={(e) =>
                update((c) => {
                  const preds = Array.isArray(c.predicates) ? [...c.predicates] : [{ field: '', op: 'eq', value: '' }]
                  const first = (preds[0] as Record<string, unknown>) ?? {}
                  preds[0] = { ...first, field: e.target.value }
                  return { ...c, predicates: preds }
                })
              }
              placeholder="Field"
              className={cl}
            />
            <Button type="button" variant="outline" size="sm" className="w-full h-7 text-xs" onClick={() => onOpenFilterExpr(nodeId, DEFAULT_FILTER_EXPR)}>
              Use expression
            </Button>
          </>
        )}
      </div>
    )
  }
  if (kind === 'transform.map_fields') {
    const mappings = (config.mappings as Record<string, DynamicValueSelector>) ?? {}
    return (
      <div className="space-y-1.5">
        {Object.entries(mappings).map(([key, sel]) => {
          const { type, value } = getSelectorTypeAndValue(sel)
          return (
            <div key={key} className="flex flex-wrap items-center gap-1 rounded border border-border/60 bg-muted/20 p-1.5">
              <Input
                value={key}
                onChange={(e) => {
                  const newKey = e.target.value
                  if (!newKey) return
                  const next = { ...mappings }
                  delete next[key]
                  next[newKey] = selectorFromTypeAndValue(type, value)
                  update((c) => ({ ...c, mappings: next }))
                }}
                placeholder="key"
                className={cn(cl, 'flex-1 min-w-0')}
              />
              <Select
                value={type}
                onValueChange={(nextType) => {
                  const next = { ...mappings }
                  next[key] = selectorFromTypeAndValue(nextType as SelectorType, value)
                  update((c) => ({ ...c, mappings: next }))
                }}
              >
                <SelectTrigger className={cn(cl, 'w-[90px]')}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="path">Path</SelectItem>
                  <SelectItem value="const">Const</SelectItem>
                  <SelectItem value="fromArg">Arg</SelectItem>
                  <SelectItem value="fromContext">Ctx</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={value}
                onChange={(e) => {
                  const next = { ...mappings }
                  next[key] = selectorFromTypeAndValue(type, e.target.value)
                  update((c) => ({ ...c, mappings: next }))
                }}
                placeholder={type === 'path' ? 'path' : type === 'const' ? 'value' : 'key'}
                className={cn(cl, 'flex-1 min-w-0')}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => {
                  const next = { ...mappings }
                  delete next[key]
                  update((c) => ({ ...c, mappings: next }))
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )
        })}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full h-7 text-xs"
          onClick={() => {
            const next = { ...mappings }
            let name = 'field'
            let i = 0
            while (next[name] !== undefined) name = `field_${++i}`
            next[name] = ''
            update((c) => ({ ...c, mappings: next }))
          }}
        >
          <Plus className="h-3 w-3 mr-1" />
          Add mapping
        </Button>
      </div>
    )
  }
  if (kind === 'transform.unique' || kind === 'transform.sort') {
    return (
      <Input
        value={String(config.by ?? '')}
        onChange={(e) => update((c) => ({ ...c, by: e.target.value }))}
        placeholder="Field path"
        className={cl}
      />
    )
  }
  if (kind === 'transform.limit') {
    return (
      <Input
        type="number"
        value={String(config.count ?? 100)}
        onChange={(e) => update((c) => ({ ...c, count: Number(e.target.value) || 0 }))}
        className={cl}
      />
    )
  }
  if (kind === 'transform.flatten_path') {
    return (
      <Input value={String(config.path ?? '')} onChange={(e) => update((c) => ({ ...c, path: e.target.value }))} placeholder="Path" className={cl} />
    )
  }
  if (kind === 'ai.extract_options') {
    return (
      <div className="space-y-1.5">
        <Input value={String(config.prompt ?? '')} onChange={(e) => update((c) => ({ ...c, prompt: e.target.value }))} placeholder="Prompt" className={cl} />
        <Input type="number" value={String(config.maxRows ?? 200)} onChange={(e) => update((c) => ({ ...c, maxRows: Number(e.target.value) || 200 }))} className={cl} />
      </div>
    )
  }
  if (kind === 'output.options') {
    const m = (config.mapping as Record<string, unknown>) ?? {}
    return (
      <div className="space-y-1">
        <Input value={String(m.label ?? '')} onChange={(e) => update((c) => ({ ...c, mapping: { ...(c.mapping as Record<string, unknown>), label: e.target.value } }))} placeholder="Label" className={cl} />
        <Input value={String(m.value ?? '')} onChange={(e) => update((c) => ({ ...c, mapping: { ...(c.mapping as Record<string, unknown>), value: e.target.value } }))} placeholder="Value" className={cl} />
      </div>
    )
  }
  return null
}

function DynamicNodeCard({ id, data }: { id: string; data: FlowNodeData }) {
  const ctx = useContext(FlowBuilderContext)
  const expanded = ctx?.expandedNodeId === id
  const summary =
    ctx &&
    getNodeSummary(data.kind, data.config ?? {}, ctx.grids, ctx.connectors)
  const onToggle =
    ctx &&
    (() => ctx.setExpandedNodeId(expanded ? null : id))
  
  const style = NODE_CATEGORY_STYLES[data.kind] || {
    border: 'border-gray-500/60',
    bg: 'bg-gray-500/10',
    icon: <Settings className="h-4 w-4 text-gray-600" />,
    color: 'gray'
  }

  return (
    <div className={cn(NODE_BASE_CLASSES, 'min-w-[190px] max-w-[300px]', style.border)}>
      <div className={cn(NODE_HEADER_CLASSES, style.bg)}>
        {style.icon}
        <span className="min-w-0 truncate text-foreground/80">{nodeKindLabel(data.kind)}</span>
        {ctx && data.kind !== 'control.start' && data.kind !== 'output.options' && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              onToggle?.()
            }}
            className="nodrag nopan ml-auto shrink-0 rounded-md p-1 hover:bg-background/80 transition-colors"
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            <ChevronDown
              className={cn('h-4 w-4 text-foreground/60 transition-transform duration-200', expanded && 'rotate-180')}
            />
          </button>
        )}
      </div>
      {summary ? (
        <div className="px-3 py-2 text-[11px] text-muted-foreground truncate border-t border-border/30" title={id}>
          {summary}
        </div>
      ) : null}
      {expanded && ctx && (
        <div className="border-t border-border/40 bg-muted/20 px-3 py-3 space-y-2 nodrag nopan">
          <DynamicNodeCardInlineConfig
            nodeId={id}
            kind={data.kind}
            config={data.config ?? {}}
            onConfigChange={ctx.updateNodeConfig}
            grids={ctx.grids}
            connectors={ctx.connectors}
            availableFields={ctx.availableFields}
            onOpenFilterExpr={ctx.openFilterExprDialog}
          />
        </div>
      )}
      <Handle type="target" position={Position.Left} className={cn(HANDLE_CLASSES, `!border-${style.color}-500`)} />
      <Handle type="source" position={Position.Right} className={cn(HANDLE_CLASSES, `!border-${style.color}-500`)} />
    </div>
  )
}

const nodeTypes = {
  dynamicNode: DynamicNodeCard,
} as const

function toFlowNode(node: DynamicFunctionGraphNode): FlowNode {
  return {
    id: node.id,
    type: 'dynamicNode',
    position: node.position,
    data: {
      kind: node.kind,
      config: (node.config as Record<string, unknown>) ?? {},
      locked: node.kind === 'control.start' || node.kind === 'output.options',
    },
    deletable: node.kind !== 'control.start' && node.kind !== 'output.options',
  }
}

function toGraphNode(node: FlowNode): DynamicFunctionGraphNode {
  return {
    id: node.id,
    kind: node.data.kind,
    position: node.position,
    config: node.data.config,
  } as DynamicFunctionGraphNode
}

function defaultConfigForKind(
  kind: DynamicFunctionNodeKind,
  grids: Array<{ id: string }>,
  connectors: Record<string, DynamicConnectorDef>,
): Record<string, unknown> {
  const firstGrid = grids[0]?.id ?? 'main_grid'
  const firstConnector = Object.keys(connectors)[0] ?? 'api_connector'
  if (kind === 'source.grid_rows') return { gridId: firstGrid }
  if (kind === 'source.current_context') {
    return { includeRowValues: true, includeFieldMetadata: true, includeLayoutMetadata: false }
  }
  if (kind === 'source.layout_fields') return { includeHidden: false, excludeSharedTab: true }
  if (kind === 'source.http_get') return { connectorId: firstConnector, path: '/', responsePath: 'items' }
  if (kind === 'transform.filter') return { mode: 'and', predicates: [{ field: '', op: 'eq', value: '' }] }
  if (kind === 'transform.map_fields') return { mappings: { label: 'name', value: 'value' } }
  if (kind === 'transform.unique') return { by: 'value' }
  if (kind === 'transform.sort') return { by: 'label', direction: 'asc', valueType: 'string' }
  if (kind === 'transform.limit') return { count: 100 }
  if (kind === 'transform.flatten_path') return { path: 'items' }
  if (kind === 'ai.extract_options') return { prompt: 'Extract option rows with label and value', maxRows: 200 }
  if (kind === 'output.options') return { mapping: { label: 'label', value: 'value', id: 'value' } }
  return {}
}

function groupPalette(items: DynamicNodePaletteItem[]): Record<string, DynamicNodePaletteItem[]> {
  return items.reduce<Record<string, DynamicNodePaletteItem[]>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = []
    acc[item.group].push(item)
    return acc
  }, {})
}

export function DynamicFunctionFlowBuilder({
  value,
  grids,
  connectors,
  onChange,
  onValidationChange,
  availableFields = [],
}: DynamicFunctionFlowBuilderProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null)
  const [filterExprDialogOpen, setFilterExprDialogOpen] = useState(false)
  const [filterExprNodeId, setFilterExprNodeId] = useState<string | null>(null)
  const [filterExprDraft, setFilterExprDraft] = useState<ExprNode>(DEFAULT_FILTER_EXPR)

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNodeData>(
    value.graph.nodes.map(toFlowNode)
  )
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    value.graph.edges.map((edge) => ({
      ...EDGE_DEFAULTS,
      ...edge,
      style: EDGE_STYLE,
      markerEnd: EDGE_MARKER,
    }))
  )

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([])
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null)
  const [isDraggingNode, setIsDraggingNode] = useState(false)
  const lastCompiledRef = useRef<ReturnType<typeof compileDynamicOptionFunctionGraph> | null>(null)

  const propGraphSignature = useMemo(() => JSON.stringify(value.graph), [value.graph])
  useEffect(() => {
    setNodes(value.graph.nodes.map(toFlowNode))
    setEdges(
      value.graph.edges.map((edge) => ({
        ...EDGE_DEFAULTS,
        ...edge,
        style: EDGE_STYLE,
        markerEnd: EDGE_MARKER,
      }))
    )
    setSelectedNodeId(null)
    setSelectedEdgeIds([])
    setExpandedNodeId(null)
  }, [propGraphSignature, setEdges, setNodes])

  const graphDraft = useMemo<DynamicFunctionGraphDef>(
    () => ({
      entryNodeId: value.graph.entryNodeId,
      returnNodeId: value.graph.returnNodeId,
      nodes: (nodes as FlowNode[]).map(toGraphNode),
      edges: edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle ?? undefined,
        targetHandle: edge.targetHandle ?? undefined,
      })),
    }),
    [edges, nodes, value.graph.entryNodeId, value.graph.returnNodeId]
  )
  const graphDraftSignature = useMemo(() => JSON.stringify(graphDraft), [graphDraft])

  const compiled = useMemo(
    () => {
      if (isDraggingNode && lastCompiledRef.current) {
        return lastCompiledRef.current
      }
      const next = compileDynamicOptionFunctionGraph(
        {
          ...value,
          graph: graphDraft,
        },
        Object.keys(connectors)
      )
      lastCompiledRef.current = next
      return next
    },
    [connectors, graphDraft, isDraggingNode, value]
  )

  const errorNodeIds = useMemo(
    () => new Set(compiled.errors.map((e) => e.nodeId).filter(Boolean) as string[]),
    [compiled.errors]
  )
  const errorEdgeIds = useMemo(
    () => new Set(compiled.errors.map((e) => e.edgeId).filter(Boolean) as string[]),
    [compiled.errors]
  )
  const nodesWithValidation = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        className: errorNodeIds.has(n.id) ? cn(n.className, '!ring-2 !ring-destructive') : n.className,
      })),
    [nodes, errorNodeIds]
  )
  const edgesWithValidation = useMemo(
    () =>
      edges.map((e) =>
        errorEdgeIds.has(e.id)
          ? { ...e, style: { ...(e.style ?? {}), stroke: 'hsl(var(--destructive))' }, className: 'stroke-destructive' }
          : e
      ),
    [edges, errorEdgeIds]
  )

  const [applyError, setApplyError] = useState<string | null>(null)

  useEffect(() => {
    onValidationChange?.({
      valid: compiled.ok,
      errors: compiled.errors.map((e) => e.message),
    })
  }, [compiled, onValidationChange])

  const handleApply = useCallback(() => {
    setApplyError(null)
    if (!compiled.ok) {
      const first = compiled.errors[0]?.message ?? 'Pipeline has errors.'
      setApplyError(first)
      return
    }
    onChange(graphDraft)
  }, [compiled, graphDraft, onChange])

  const deleteNode = useCallback(
    (nodeId: string) => {
      const targetNode = nodes.find((n) => n.id === nodeId)
      if (!targetNode || targetNode.data.locked) return
      setNodes((prev) => prev.filter((node) => node.id !== nodeId))
      setEdges((prev) => prev.filter((edge) => edge.source !== nodeId && edge.target !== nodeId))
      if (selectedNodeId === nodeId) setSelectedNodeId(null)
    },
    [nodes, selectedNodeId, setEdges, setNodes]
  )

  const onConnect = useCallback(
    (params: Connection) => setEdges((prev) => addEdge({ ...params, ...EDGE_DEFAULTS }, prev)),
    [setEdges]
  )

  const onSelectionChange = useCallback((selection: OnSelectionChangeParams) => {
    const nodeId = selection.nodes.length > 0 ? selection.nodes[0]!.id : null
    setSelectedNodeId(nodeId)
    setSelectedEdgeIds(selection.edges.map((edge) => edge.id))
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const payload = event.dataTransfer.getData('application/reactflow')
      if (!payload || !rfInstance) return
      let parsed: { kind?: DynamicFunctionNodeKind } = {}
      try {
        parsed = JSON.parse(payload)
      } catch {
        return
      }
      const kind = parsed.kind
      if (!kind) return
      setNodes((prev) => {
        const hasStart = prev.some((n) => (n.data as FlowNodeData).kind === 'control.start')
        const hasReturn = prev.some((n) => (n.data as FlowNodeData).kind === 'output.options')
        if (kind === 'control.start' && hasStart) return prev
        if (kind === 'output.options' && hasReturn) return prev
        const position = rfInstance.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        })
        const id = `dyn_node_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
        const node: FlowNode = {
          id,
          type: 'dynamicNode',
          position,
          data: {
            kind,
            config: defaultConfigForKind(kind, grids, connectors),
          },
        }
        return [...prev, node]
      })
    },
    [connectors, grids, rfInstance, setNodes]
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const updateNodeConfig = useCallback(
    (nodeId: string, updater: (config: Record<string, unknown>) => Record<string, unknown>) => {
      setNodes((prev) =>
        prev.map((node) =>
          node.id === nodeId
            ? {
              ...node,
              data: {
                ...node.data,
                config: updater(node.data.config ?? {}),
              },
            }
            : node
        )
      )
    },
    [setNodes]
  )

  const deleteSelection = useCallback(() => {
    if (selectedNodeId) {
      deleteNode(selectedNodeId)
      return
    }
    if (selectedEdgeIds.length > 0) {
      setEdges((prev) => prev.filter((edge) => !selectedEdgeIds.includes(edge.id)))
      setSelectedEdgeIds([])
    }
  }, [deleteNode, selectedEdgeIds, selectedNodeId, setEdges])

  const paletteByGroup = useMemo(() => groupPalette(DYNAMIC_NODE_PALETTE), [])
  const paletteGroupOrder = ['Control', 'Source', 'Transform', 'AI'] as const

  const openFilterExprDialog = useCallback((nodeId: string, expr: ExprNode) => {
    setFilterExprDraft(normalizeExprNode(expr))
    setFilterExprNodeId(nodeId)
    setFilterExprDialogOpen(true)
  }, [])

  const flowBuilderContextValue = useMemo<FlowBuilderContextValue>(
    () => ({
      expandedNodeId,
      setExpandedNodeId,
      updateNodeConfig,
      grids,
      connectors,
      availableFields,
      openFilterExprDialog,
    }),
    [expandedNodeId, updateNodeConfig, grids, connectors, availableFields, openFilterExprDialog]
  )

  const explainText = useMemo(() => {
    if (!compiled.ok || !compiled.plan) return 'Connect nodes from Start to Return Options.'
    const nodeById = new Map(graphDraft.nodes.map((node) => [node.id, node]))
    const labels = compiled.plan.executionOrder
      .map((nodeId) => {
        const node = nodeById.get(nodeId)
        return node ? nodeKindLabel(node.kind) : null
      })
      .filter((label): label is string => !!label)
    return labels.join(' -> ')
  }, [compiled, graphDraft.nodes])

  const getGroupIcon = (group: string) => {
    switch (group) {
      case 'Control': return <Settings className="h-3 w-3" />
      case 'Source': return <Database className="h-3 w-3" />
      case 'Transform': return <Filter className="h-3 w-3" />
      case 'AI': return <Sparkles className="h-3 w-3" />
      default: return <FileJson className="h-3 w-3" />
    }
  }

  const getGroupColor = (group: string) => {
    switch (group) {
      case 'Control': return 'border-green-200 bg-green-50/50 hover:bg-green-100/50 dark:border-green-500/30 dark:bg-green-500/10'
      case 'Source': return 'border-blue-200 bg-blue-50/50 hover:bg-blue-100/50 dark:border-blue-500/30 dark:bg-blue-500/10'
      case 'Transform': return 'border-violet-200 bg-violet-50/50 hover:bg-violet-100/50 dark:border-violet-500/30 dark:bg-violet-500/10'
      case 'AI': return 'border-pink-200 bg-pink-50/50 hover:bg-pink-100/50 dark:border-pink-500/30 dark:bg-pink-500/10'
      default: return 'border-border/60 bg-muted/30 hover:bg-muted/40'
    }
  }

  const paletteMinimal = (
    <div className="space-y-4">
      {paletteGroupOrder.filter((g) => paletteByGroup[g]?.length).map((group) => (
        <div key={group} className="space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
            {getGroupIcon(group)}
            {group}
          </p>
          <div className="space-y-1.5">
            {(paletteByGroup[group] ?? []).map((item) => (
              <div
                key={item.kind}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData('application/reactflow', JSON.stringify({ kind: item.kind }))
                  event.dataTransfer.effectAllowed = 'move'
                }}
                className={cn(
                  "cursor-grab rounded-lg border px-2.5 py-2 text-xs text-foreground/80 transition-all duration-150",
                  "active:cursor-grabbing active:scale-[0.98] hover:shadow-sm flex items-center gap-2",
                  getGroupColor(group)
                )}
                title={item.subtitle}
              >
                {NODE_CATEGORY_STYLES[item.kind]?.icon || <Settings className="h-3.5 w-3.5" />}
                <span className="font-medium truncate">{item.title}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <FlowBuilderContext.Provider value={flowBuilderContextValue}>
      <FlowBuilderLayout
        headerText="Drag nodes from the palette, connect them, then click Apply."
        headerRight={
          (selectedNodeId || selectedEdgeIds.length > 0) ? (
            <Button type="button" size="sm" variant="secondary" onClick={deleteSelection}>
              <Trash2 className="h-3.5 w-3.5" />
              Delete selected
            </Button>
          ) : undefined
        }
        palette={paletteMinimal}
        canvasMinHeight="420px"
        applyError={applyError ?? null}
        onApply={handleApply}
        applyLabel="Apply visual pipeline"
        canvasClassName="flex flex-col min-h-0"
        paletteClassName="w-[120px]"
      >
        <div ref={wrapperRef} className="h-full min-h-[380px] w-full">
          <ReactFlow
            nodes={nodesWithValidation}
            edges={edgesWithValidation}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={EDGE_DEFAULTS}
            connectionLineType={ConnectionLineType.SmoothStep}
            connectionLineStyle={EDGE_STYLE}
            fitView
            onInit={setRfInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeDragStart={() => setIsDraggingNode(true)}
            onNodeDragStop={() => setIsDraggingNode(false)}
            deleteKeyCode={['Backspace', 'Delete']}
            onSelectionChange={onSelectionChange}
            className="!bg-transparent h-full"
          >
            <Background
              gap={22}
              size={1}
              color="hsl(var(--foreground) / 0.14)"
              variant={BackgroundVariant.Dots}
            />
          </ReactFlow>
        </div>
      </FlowBuilderLayout>

      <Dialog open={filterExprDialogOpen} onOpenChange={setFilterExprDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Filter condition</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-auto">
            <ExprFlowBuilder
              expr={filterExprDraft}
              availableFields={availableFields}
              onChange={setFilterExprDraft}
              flowHeightClassName="h-[360px]"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setFilterExprDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (filterExprNodeId) {
                  updateNodeConfig(filterExprNodeId, (config) => ({
                    ...config,
                    expr: filterExprDraft,
                  }))
                }
                setFilterExprDialogOpen(false)
              }}
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FlowBuilderContext.Provider>
  )
}
