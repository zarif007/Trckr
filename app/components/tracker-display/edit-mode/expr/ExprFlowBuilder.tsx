'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
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
  type ReactFlowInstance,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Trash2, 
  Database, 
  Type, 
  Plus, 
  Minus, 
  X, 
  Divide,
  Calculator,
  GitBranch,
  CheckCircle2,
  Equal,
  ChevronRight,
  ChevronLeft
} from 'lucide-react'
import { compileExprFromGraph, exprToGraph, FLOW_CONSTANTS, type ExprFlowNodeData } from './expr-graph'
import type { ExprNode } from '@/lib/functions/types'
import { normalizeExprNode } from '@/lib/schemas/expr'
import { FlowBuilderLayout } from '@/lib/flow-builder'
import { cn } from '@/lib/utils'
import type { AvailableField, ExprFlowOperator, ExprFlowNodeType } from './expr-types'

const OPERATOR_LABELS: Record<ExprFlowOperator, string> = {
  add: 'Add',
  sub: 'Subtract',
  mul: 'Multiply',
  div: 'Divide',
  eq: 'Equals',
  neq: 'Not equal',
  gt: 'Greater than',
  gte: 'Greater or equal',
  lt: 'Less than',
  lte: 'Less or equal',
}

const OPERATOR_ICONS: Record<ExprFlowOperator, ReactNode> = {
  add: <Plus className="h-3.5 w-3.5" />,
  sub: <Minus className="h-3.5 w-3.5" />,
  mul: <X className="h-3.5 w-3.5" />,
  div: <Divide className="h-3.5 w-3.5" />,
  eq: <Equal className="h-3.5 w-3.5" />,
  neq: <span className="text-[10px] font-bold">≠</span>,
  gt: <span className="text-[10px] font-bold">&gt;</span>,
  gte: <span className="text-[10px] font-bold">≥</span>,
  lt: <span className="text-[10px] font-bold">&lt;</span>,
  lte: <span className="text-[10px] font-bold">≤</span>,
}

type NodeUpdater = (id: string, partial: Partial<ExprFlowNodeData>) => void

interface FlowNodeData extends ExprFlowNodeData {
  onChange?: NodeUpdater
  onDelete?: (id: string) => void
  availableFields?: AvailableField[]
}

type FlowNode = Node<FlowNodeData>

interface ExprFlowBuilderProps {
  expr: ExprNode
  availableFields: AvailableField[]
  onChange: (expr: ExprNode) => void
  headerAction?: ReactNode
  flowHeightClassName?: string
}

// Modern n8n-inspired node styling with color coding
const NODE_STYLES = {
  field: {
    border: 'border-blue-500/60',
    bg: 'bg-blue-500/10',
    icon: <Database className="h-3.5 w-3.5 text-blue-600" />,
    label: 'Field',
  },
  const: {
    border: 'border-emerald-500/60',
    bg: 'bg-emerald-500/10',
    icon: <Type className="h-3.5 w-3.5 text-emerald-600" />,
    label: 'Value',
  },
  op: {
    border: 'border-violet-500/60',
    bg: 'bg-violet-500/10',
    icon: <Calculator className="h-3.5 w-3.5 text-violet-600" />,
    label: 'Operation',
  },
  result: {
    border: 'border-amber-500/60',
    bg: 'bg-amber-500/10',
    icon: <CheckCircle2 className="h-3.5 w-3.5 text-amber-600" />,
    label: 'Result',
  },
} as const

const NODE_BASE_CLASSES = 'overflow-hidden rounded-xl border-2 shadow-sm transition-all duration-200 hover:shadow-md'
const NODE_HEADER_CLASSES = 'flex items-center gap-2 px-3 py-2 text-xs font-semibold'
const NODE_BODY_CLASSES = 'px-3 pb-3 pt-1'
const NODE_DELETE_BUTTON_CLASSES =
  'nodrag inline-flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground/70 hover:text-destructive hover:bg-destructive/10 transition-colors'
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

function FieldNode({ id, data }: { id: string; data: FlowNodeData }) {
  const value = data.fieldId ?? ''
  const options = data.availableFields ?? []
  const style = NODE_STYLES.field
  return (
    <div className={cn(NODE_BASE_CLASSES, 'w-[200px] border-blue-500/40 bg-background', style.border)}>
      <div className={cn(NODE_HEADER_CLASSES, style.bg)}>
        {style.icon}
        <span className="text-foreground/80">{style.label}</span>
        <button
          type="button"
          onClick={() => data.onDelete?.(id)}
          className={cn(NODE_DELETE_BUTTON_CLASSES, 'ml-auto')}
          aria-label="Delete node"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      <div className={NODE_BODY_CLASSES}>
        <select
          className="w-full rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs text-foreground/90 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
          value={value}
          onChange={(e) => data.onChange?.(id, { fieldId: e.target.value })}
        >
          <option value="">Select field...</option>
          {options.map((field) => (
            <option key={field.fieldId} value={field.fieldId}>
              {field.label}
            </option>
          ))}
        </select>
      </div>
      <Handle type="source" position={Position.Right} id="out" className={cn(HANDLE_CLASSES, '!border-blue-500')} />
    </div>
  )
}

function ConstNode({ id, data }: { id: string; data: FlowNodeData }) {
  const style = NODE_STYLES.const
  return (
    <div className={cn(NODE_BASE_CLASSES, 'w-[180px] border-emerald-500/40 bg-background', style.border)}>
      <div className={cn(NODE_HEADER_CLASSES, style.bg)}>
        {style.icon}
        <span className="text-foreground/80">{style.label}</span>
        <button
          type="button"
          onClick={() => data.onDelete?.(id)}
          className={cn(NODE_DELETE_BUTTON_CLASSES, 'ml-auto')}
          aria-label="Delete node"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      <div className={NODE_BODY_CLASSES}>
        <Input
          value={data.value ?? ''}
          onChange={(e) => data.onChange?.(id, { value: e.target.value })}
          className="h-9 border-border/60 bg-muted/30 text-xs text-foreground/90 focus:ring-2 focus:ring-emerald-500/30 rounded-lg"
          placeholder="Enter value (e.g., 10, true, text)"
        />
      </div>
      <Handle type="source" position={Position.Right} id="out" className={cn(HANDLE_CLASSES, '!border-emerald-500')} />
    </div>
  )
}

function OpNode({ id, data }: { id: string; data: FlowNodeData }) {
  const label = data.op ? OPERATOR_LABELS[data.op] : 'Operator'
  const icon = data.op ? OPERATOR_ICONS[data.op] : <Calculator className="h-3.5 w-3.5" />
  const style = NODE_STYLES.op
  return (
    <div className={cn(NODE_BASE_CLASSES, 'w-[180px] border-violet-500/40 bg-background', style.border)}>
      <div className={cn(NODE_HEADER_CLASSES, style.bg)}>
        {icon}
        <span className="text-foreground/80">{label}</span>
        <button
          type="button"
          onClick={() => data.onDelete?.(id)}
          className={cn(NODE_DELETE_BUTTON_CLASSES, 'ml-auto')}
          aria-label="Delete node"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      <div className={cn(NODE_BODY_CLASSES, 'flex items-center gap-3 text-[11px] text-muted-foreground')}>
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-violet-400" />
          <span>Input A</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-violet-400" />
          <span>Input B</span>
        </div>
      </div>
      <Handle
        type="target"
        position={Position.Left}
        id={FLOW_CONSTANTS.INPUT_HANDLES[0]}
        style={{ top: 40 }}
        className={cn(HANDLE_CLASSES, '!border-violet-500')}
      />
      <Handle
        type="target"
        position={Position.Left}
        id={FLOW_CONSTANTS.INPUT_HANDLES[1]}
        style={{ top: 58 }}
        className={cn(HANDLE_CLASSES, '!border-violet-500')}
      />
      <Handle type="source" position={Position.Right} id="out" className={cn(HANDLE_CLASSES, '!border-violet-500')} />
    </div>
  )
}

function ResultNode() {
  const style = NODE_STYLES.result
  return (
    <div className={cn(NODE_BASE_CLASSES, 'w-[160px] border-amber-500/40 bg-background', style.border)}>
      <div className={cn(NODE_HEADER_CLASSES, style.bg)}>
        {style.icon}
        <span className="text-foreground/80">{style.label}</span>
      </div>
      <div className={cn(NODE_BODY_CLASSES, 'text-[11px] text-muted-foreground')}>
        Final expression output
      </div>
      <Handle
        type="target"
        position={Position.Left}
        id={FLOW_CONSTANTS.RESULT_HANDLE_ID}
        className={cn(HANDLE_CLASSES, '!border-amber-500')}
      />
    </div>
  )
}

const nodeTypes = {
  field: FieldNode,
  const: ConstNode,
  op: OpNode,
  result: ResultNode,
} as const

export function ExprFlowBuilder({
  expr,
  availableFields,
  onChange,
  headerAction,
  flowHeightClassName,
}: ExprFlowBuilderProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null)
  const [compileError, setCompileError] = useState<string | null>(null)
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([])
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([])

  const initialGraph = useMemo(() => exprToGraph(normalizeExprNode(expr)), [expr])
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNodeData>(
    initialGraph.nodes as Node<FlowNodeData>[]
  )
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    initialGraph.edges.map((edge) => ({
      ...EDGE_DEFAULTS,
      ...edge,
      style: { ...EDGE_STYLE, ...(edge.style ?? {}) } as CSSProperties,
      markerEnd: edge.markerEnd ?? EDGE_MARKER,
    }))
  )

  const updateNodeData = useCallback(
    (id: string, partial: Partial<ExprFlowNodeData>) => {
      setNodes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...partial } } : n))
      )
    },
    [setNodes]
  )

  const deleteNode = useCallback(
    (id: string) => {
      setNodes((prev) => prev.filter((node) => node.id !== id))
      setEdges((prev) => prev.filter((edge) => edge.source !== id && edge.target !== id))
      setSelectedNodeIds((prev) => prev.filter((nodeId) => nodeId !== id))
      setSelectedEdgeIds([])
    },
    [setEdges, setNodes]
  )

  const deleteSelection = useCallback(() => {
    if (selectedNodeIds.length === 0 && selectedEdgeIds.length === 0) return
    const nodeIdsToDelete = new Set(
      selectedNodeIds.filter((id) => nodes.find((node) => node.id === id)?.type !== 'result')
    )
    setEdges((prev) =>
      prev.filter(
        (edge) =>
          !selectedEdgeIds.includes(edge.id) &&
          !nodeIdsToDelete.has(edge.source) &&
          !nodeIdsToDelete.has(edge.target)
      )
    )
    setNodes((prev) => prev.filter((node) => !nodeIdsToDelete.has(node.id)))
    setSelectedNodeIds([])
    setSelectedEdgeIds([])
  }, [nodes, selectedEdgeIds, selectedNodeIds, setEdges, setNodes])

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        deleteSelection()
      }
    },
    [deleteSelection]
  )

  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault()
      setEdges((prev) => prev.filter((e) => e.id !== edge.id))
    },
    [setEdges]
  )

  const enrichNode = useCallback(
    (node: FlowNode): FlowNode => ({
      ...node,
      data: {
        ...node.data,
        onChange: updateNodeData,
        onDelete: deleteNode,
        availableFields,
      },
    }),
    [availableFields, deleteNode, updateNodeData]
  )

  useEffect(() => {
    const nextGraph = exprToGraph(normalizeExprNode(expr))
    setNodes(nextGraph.nodes.map(enrichNode))
    setEdges(
      nextGraph.edges.map((edge) => ({
        ...EDGE_DEFAULTS,
        ...edge,
        style: { ...EDGE_STYLE, ...(edge.style ?? {}) } as CSSProperties,
        markerEnd: edge.markerEnd ?? EDGE_MARKER,
      }))
    )
  }, [expr, enrichNode, setEdges, setNodes])

  // When availableFields content changes, patch node data only (avoid replacing all nodes
  // which would trigger onSelectionChange and cause an infinite loop).
  const availableFieldsKey = useMemo(
    () => availableFields.map((f) => f.fieldId).join(','),
    [availableFields]
  )
  useEffect(() => {
    setNodes((prev) =>
      prev.map((n) => ({ ...n, data: { ...n.data, availableFields } }))
    )
  }, [availableFieldsKey, setNodes])

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, ...EDGE_DEFAULTS }, eds)),
    [setEdges]
  )

  const onSelectionChange = useCallback(
    (selection: { nodes: Node[]; edges: Edge[] }) => {
      setSelectedNodeIds(selection.nodes.map((node) => node.id))
      setSelectedEdgeIds(selection.edges.map((edge) => edge.id))
    },
    []
  )

  const createNode = useCallback(
    (type: ExprFlowNodeType, position: { x: number; y: number }, op?: ExprFlowOperator) => {
      const id = `expr_ui_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const data: FlowNodeData = { op, onChange: undefined, availableFields }
      if (type === 'field') data.fieldId = ''
      if (type === 'const') data.value = ''
      setNodes((nds) => [...nds, enrichNode({ id, type, position, data })])
    },
    [availableFields, enrichNode, setNodes]
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const data = event.dataTransfer.getData('application/reactflow')
      if (!data || !rfInstance) return
      let parsed: { type?: ExprFlowNodeType; op?: ExprFlowOperator } = {}
      try {
        parsed = JSON.parse(data)
      } catch {
        return
      }
      if (!parsed.type) return
      const position = rfInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })
      createNode(parsed.type, position, parsed.op)
    },
    [createNode, rfInstance]
  )

  const handleCompile = () => {
    const result = compileExprFromGraph(nodes as FlowNode[], edges)
    if (result.error || !result.expr) {
      setCompileError(result.error ?? 'Unable to compile expression.')
      return
    }
    setCompileError(null)
    onChange(result.expr)
  }

  const paletteItems = useMemo(
    () => [
      { label: 'Field', type: 'field' as const, icon: <Database className="h-3.5 w-3.5 text-blue-500" />, color: 'blue' },
      { label: 'Value', type: 'const' as const, icon: <Type className="h-3.5 w-3.5 text-emerald-500" />, color: 'emerald' },
      { label: 'Add', type: 'op' as const, op: 'add' as const, icon: <Plus className="h-3.5 w-3.5 text-violet-500" />, color: 'violet' },
      { label: 'Subtract', type: 'op' as const, op: 'sub' as const, icon: <Minus className="h-3.5 w-3.5 text-violet-500" />, color: 'violet' },
      { label: 'Multiply', type: 'op' as const, op: 'mul' as const, icon: <X className="h-3.5 w-3.5 text-violet-500" />, color: 'violet' },
      { label: 'Divide', type: 'op' as const, op: 'div' as const, icon: <Divide className="h-3.5 w-3.5 text-violet-500" />, color: 'violet' },
      { label: 'Equal', type: 'op' as const, op: 'eq' as const, icon: <Equal className="h-3.5 w-3.5 text-violet-500" />, color: 'violet' },
      { label: 'Not equal', type: 'op' as const, op: 'neq' as const, icon: <span className="text-[10px] font-bold text-violet-500">≠</span>, color: 'violet' },
      { label: 'Greater than', type: 'op' as const, op: 'gt' as const, icon: <span className="text-[10px] font-bold text-violet-500">&gt;</span>, color: 'violet' },
      { label: 'Greater or equal', type: 'op' as const, op: 'gte' as const, icon: <span className="text-[10px] font-bold text-violet-500">≥</span>, color: 'violet' },
      { label: 'Less than', type: 'op' as const, op: 'lt' as const, icon: <span className="text-[10px] font-bold text-violet-500">&lt;</span>, color: 'violet' },
      { label: 'Less or equal', type: 'op' as const, op: 'lte' as const, icon: <span className="text-[10px] font-bold text-violet-500">≤</span>, color: 'violet' },
    ],
    []
  )

  const palette = (
    <div className="space-y-4">
      {/* Data Sources Section */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
          <Database className="h-3 w-3" />
          Data
        </p>
        <div className="space-y-1.5">
          {paletteItems.filter(i => i.type === 'field' || i.type === 'const').map((item) => (
            <div
              key={`${item.type}-${item.op ?? item.label}`}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData(
                  'application/reactflow',
                  JSON.stringify({ type: item.type, op: item.op })
                )
                event.dataTransfer.effectAllowed = 'move'
              }}
              className={cn(
                "cursor-grab rounded-lg border px-2.5 py-2 text-xs text-foreground/80 transition-all duration-150",
                "active:cursor-grabbing active:scale-[0.98] hover:shadow-sm flex items-center gap-2",
                item.color === 'blue' && "border-blue-200 bg-blue-50/50 hover:bg-blue-100/50 dark:border-blue-500/30 dark:bg-blue-500/10",
                item.color === 'emerald' && "border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/50 dark:border-emerald-500/30 dark:bg-emerald-500/10"
              )}
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Operations Section */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
          <Calculator className="h-3 w-3" />
          Operations
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {paletteItems.filter(i => i.type === 'op').map((item) => (
            <div
              key={`${item.type}-${item.op}`}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData(
                  'application/reactflow',
                  JSON.stringify({ type: item.type, op: item.op })
                )
                event.dataTransfer.effectAllowed = 'move'
              }}
              className={cn(
                "cursor-grab rounded-lg border border-violet-200 bg-violet-50/50 px-2 py-1.5 text-[11px] text-foreground/80 transition-all duration-150",
                "active:cursor-grabbing active:scale-[0.98] hover:bg-violet-100/50 hover:shadow-sm flex items-center justify-center gap-1",
                "dark:border-violet-500/30 dark:bg-violet-500/10 dark:hover:bg-violet-500/20"
              )}
              title={item.label}
            >
              {item.icon}
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <FlowBuilderLayout
      headerText="Drag nodes from the palette, connect them, then click Apply."
      headerRight={
        headerAction ||
        ((selectedNodeIds.length > 0 || selectedEdgeIds.length > 0) ? (
          <Button type="button" size="sm" variant="secondary" onClick={deleteSelection}>
            <Trash2 className="h-3.5 w-3.5" />
            Delete selected
          </Button>
        ) : undefined)
      }
      palette={palette}
      canvasMinHeight="360px"
      applyError={compileError}
      onApply={handleCompile}
      applyLabel="Apply visual expression"
      paletteClassName="w-[140px]"
      canvasClassName="flex flex-col min-h-0"
    >
      <div ref={wrapperRef} className={cn('w-full h-full min-h-[320px]', flowHeightClassName ?? 'h-[360px]')}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgeContextMenu={onEdgeContextMenu}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={EDGE_DEFAULTS}
          connectionLineType={ConnectionLineType.SmoothStep}
          connectionLineStyle={EDGE_STYLE}
          fitView
          onInit={setRfInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onSelectionChange={onSelectionChange}
          onKeyDown={onKeyDown}
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
  )
}
