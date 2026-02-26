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
import { Trash2 } from 'lucide-react'
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

const NODE_BASE_CLASSES =
  'overflow-hidden rounded-xl border border-border/70 border-l-4 border-l-primary/70 bg-muted/30 text-xs text-foreground/90'
const NODE_HEADER_CLASSES =
  'flex items-center gap-2 border-b border-border/60 bg-muted/50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-foreground/70'
const NODE_BODY_CLASSES = 'px-3 pb-2 pt-2'
const NODE_DELETE_BUTTON_CLASSES =
  'nodrag inline-flex h-5 w-5 items-center justify-center rounded border border-border/60 text-muted-foreground hover:text-destructive hover:border-destructive/60 hover:bg-destructive/10'
const HANDLE_CLASSES = '!h-2.5 !w-2.5 !border-2 !bg-primary !border-foreground/30'
const EDGE_STYLE: CSSProperties = {
  stroke: 'hsl(var(--foreground) / 0.35)',
  strokeWidth: 2,
  strokeLinecap: 'round',
}
const EDGE_MARKER = {
  type: MarkerType.ArrowClosed,
  color: 'hsl(var(--foreground) / 0.45)',
  width: 16,
  height: 16,
}
const EDGE_DEFAULTS = {
  type: 'smoothstep' as const,
  style: EDGE_STYLE,
  markerEnd: EDGE_MARKER,
}

function FieldNode({ id, data }: { id: string; data: FlowNodeData }) {
  const value = data.fieldId ?? ''
  const options = data.availableFields ?? []
  return (
    <div className={cn(NODE_BASE_CLASSES, 'w-[180px]')}>
      <div className={NODE_HEADER_CLASSES}>
        <button
          type="button"
          onClick={() => data.onDelete?.(id)}
          className={NODE_DELETE_BUTTON_CLASSES}
          aria-label="Delete node"
        >
          <Trash2 className="h-3 w-3" />
        </button>
        <span className="h-2 w-2 rounded-full bg-primary/70" />
        Field
      </div>
      <div className={NODE_BODY_CLASSES}>
        <select
          className="w-full rounded-md border border-border/70 bg-muted/20 px-2 py-1 text-xs text-foreground/90 focus:outline-none focus:ring-2 focus:ring-primary/20"
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
      <Handle type="source" position={Position.Right} id="out" className={HANDLE_CLASSES} />
    </div>
  )
}

function ConstNode({ id, data }: { id: string; data: FlowNodeData }) {
  return (
    <div className={cn(NODE_BASE_CLASSES, 'w-[160px]')}>
      <div className={NODE_HEADER_CLASSES}>
        <button
          type="button"
          onClick={() => data.onDelete?.(id)}
          className={NODE_DELETE_BUTTON_CLASSES}
          aria-label="Delete node"
        >
          <Trash2 className="h-3 w-3" />
        </button>
        <span className="h-2 w-2 rounded-full bg-primary/70" />
        Const
      </div>
      <div className={NODE_BODY_CLASSES}>
        <Input
          value={data.value ?? ''}
          onChange={(e) => data.onChange?.(id, { value: e.target.value })}
          className="h-7 border-border/70 bg-muted/20 text-xs text-foreground/90"
          placeholder="10, true, text"
        />
      </div>
      <Handle type="source" position={Position.Right} id="out" className={HANDLE_CLASSES} />
    </div>
  )
}

function OpNode({ id, data }: { id: string; data: FlowNodeData }) {
  const label = data.op ? OPERATOR_LABELS[data.op] : 'Operator'
  return (
    <div className={cn(NODE_BASE_CLASSES, 'w-[170px]')}>
      <div className={NODE_HEADER_CLASSES}>
        <button
          type="button"
          onClick={() => data.onDelete?.(id)}
          className={NODE_DELETE_BUTTON_CLASSES}
          aria-label="Delete node"
        >
          <Trash2 className="h-3 w-3" />
        </button>
        <span className="h-2 w-2 rounded-full bg-primary/70" />
        {label}
      </div>
      <div className={cn(NODE_BODY_CLASSES, 'text-[11px] text-foreground/60')}>Inputs: A, B</div>
      <Handle
        type="target"
        position={Position.Left}
        id={FLOW_CONSTANTS.INPUT_HANDLES[0]}
        style={{ top: 36 }}
        className={HANDLE_CLASSES}
      />
      <Handle
        type="target"
        position={Position.Left}
        id={FLOW_CONSTANTS.INPUT_HANDLES[1]}
        style={{ top: 64 }}
        className={HANDLE_CLASSES}
      />
      <Handle type="source" position={Position.Right} id="out" className={HANDLE_CLASSES} />
    </div>
  )
}

function ResultNode() {
  return (
    <div className={cn(NODE_BASE_CLASSES, 'w-[140px]')}>
      <div className={NODE_HEADER_CLASSES}>
        <span className="h-2 w-2 rounded-full bg-foreground/50" />
        Result
      </div>
      <div className={cn(NODE_BODY_CLASSES, 'text-[11px] text-foreground/60')}>Root expression</div>
      <Handle
        type="target"
        position={Position.Left}
        id={FLOW_CONSTANTS.RESULT_HANDLE_ID}
        className={HANDLE_CLASSES}
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
      { label: 'Field', type: 'field' as const },
      { label: 'Const', type: 'const' as const },
      { label: 'Add', type: 'op' as const, op: 'add' as const },
      { label: 'Subtract', type: 'op' as const, op: 'sub' as const },
      { label: 'Multiply', type: 'op' as const, op: 'mul' as const },
      { label: 'Divide', type: 'op' as const, op: 'div' as const },
      { label: 'Equal', type: 'op' as const, op: 'eq' as const },
      { label: 'Not equal', type: 'op' as const, op: 'neq' as const },
      { label: 'Greater than', type: 'op' as const, op: 'gt' as const },
      { label: 'Greater or equal', type: 'op' as const, op: 'gte' as const },
      { label: 'Less than', type: 'op' as const, op: 'lt' as const },
      { label: 'Less or equal', type: 'op' as const, op: 'lte' as const },
    ],
    []
  )

  const palette = (
    <div className="space-y-2">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Nodes</p>
      {paletteItems.map((item) => (
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
          className="cursor-grab rounded-lg border border-border/70 bg-muted/30 px-2 py-1 text-xs text-foreground/80 transition active:cursor-grabbing active:scale-[0.98] hover:bg-muted/40"
        >
          {item.label}
        </div>
      ))}
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
          nodeTypes={nodeTypes}
          defaultEdgeOptions={EDGE_DEFAULTS}
          connectionLineType={ConnectionLineType.SmoothStep}
          connectionLineStyle={EDGE_STYLE}
          fitView
          onInit={setRfInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
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
  )
}
