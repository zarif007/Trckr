'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactFlow, {
  Background,
  Controls,
  Handle,
  MiniMap,
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
import { compileExprFromGraph, exprToGraph, FLOW_CONSTANTS, type ExprFlowNodeData } from './expr-graph'
import type { ExprNode } from '@/lib/functions/types'
import { normalizeExprNode } from '@/lib/schemas/expr'
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
  availableFields?: AvailableField[]
}

type FlowNode = Node<FlowNodeData>

interface ExprFlowBuilderProps {
  expr: ExprNode
  availableFields: AvailableField[]
  onChange: (expr: ExprNode) => void
}

function FieldNode({ id, data }: { id: string; data: FlowNodeData }) {
  const value = data.fieldId ?? ''
  const options = data.availableFields ?? []
  return (
    <div className="rounded-md border border-border/60 bg-background px-2 py-2 text-xs w-[170px]">
      <div className="font-medium text-muted-foreground mb-1">Field</div>
      <select
        className="w-full rounded border border-border/50 bg-background px-2 py-1 text-xs"
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
      <Handle type="source" position={Position.Right} id="out" />
    </div>
  )
}

function ConstNode({ id, data }: { id: string; data: FlowNodeData }) {
  return (
    <div className="rounded-md border border-border/60 bg-background px-2 py-2 text-xs w-[150px]">
      <div className="font-medium text-muted-foreground mb-1">Const</div>
      <Input
        value={data.value ?? ''}
        onChange={(e) => data.onChange?.(id, { value: e.target.value })}
        className="h-7 text-xs"
        placeholder="10, true, text"
      />
      <Handle type="source" position={Position.Right} id="out" />
    </div>
  )
}

function OpNode({ data }: { data: FlowNodeData }) {
  const label = data.op ? OPERATOR_LABELS[data.op] : 'Operator'
  return (
    <div className="rounded-md border border-border/60 bg-background px-2 py-2 text-xs w-[150px]">
      <div className="font-medium text-muted-foreground mb-1">{label}</div>
      <div className="text-[11px] text-muted-foreground">Inputs: A, B</div>
      <Handle type="target" position={Position.Left} id={FLOW_CONSTANTS.INPUT_HANDLES[0]} style={{ top: 36 }} />
      <Handle type="target" position={Position.Left} id={FLOW_CONSTANTS.INPUT_HANDLES[1]} style={{ top: 64 }} />
      <Handle type="source" position={Position.Right} id="out" />
    </div>
  )
}

function ResultNode() {
  return (
    <div className="rounded-md border border-border/60 bg-background px-2 py-2 text-xs w-[130px]">
      <div className="font-medium text-muted-foreground mb-1">Result</div>
      <div className="text-[11px] text-muted-foreground">Root expression</div>
      <Handle type="target" position={Position.Right} id={FLOW_CONSTANTS.RESULT_HANDLE_ID} />
    </div>
  )
}

const nodeTypes = {
  field: FieldNode,
  const: ConstNode,
  op: OpNode,
  result: ResultNode,
} as const

export function ExprFlowBuilder({ expr, availableFields, onChange }: ExprFlowBuilderProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null)
  const [compileError, setCompileError] = useState<string | null>(null)

  const initialGraph = useMemo(() => exprToGraph(normalizeExprNode(expr)), [expr])
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(
    initialGraph.nodes as FlowNode[]
  )
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialGraph.edges)

  const updateNodeData = useCallback(
    (id: string, partial: Partial<ExprFlowNodeData>) => {
      setNodes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...partial } } : n))
      )
    },
    [setNodes]
  )

  const enrichNode = useCallback(
    (node: FlowNode): FlowNode => ({
      ...node,
      data: {
        ...node.data,
        onChange: updateNodeData,
        availableFields,
      },
    }),
    [availableFields, updateNodeData]
  )

  useEffect(() => {
    const nextGraph = exprToGraph(normalizeExprNode(expr))
    setNodes(nextGraph.nodes.map(enrichNode))
    setEdges(nextGraph.edges)
  }, [expr, enrichNode, setEdges, setNodes])

  useEffect(() => {
    setNodes((prev) => prev.map(enrichNode))
  }, [enrichNode, setNodes])

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params }, eds)),
    [setEdges]
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
      const bounds = wrapperRef.current?.getBoundingClientRect()
      const data = event.dataTransfer.getData('application/reactflow')
      if (!data || !rfInstance || !bounds) return
      let parsed: { type?: ExprFlowNodeType; op?: ExprFlowOperator } = {}
      try {
        parsed = JSON.parse(data)
      } catch {
        return
      }
      if (!parsed.type) return
      const position = rfInstance.screenToFlowPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
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

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>Drag nodes from the palette, connect them, then click Apply.</span>
      </div>
      <div className="flex gap-3">
        <div className="w-[170px] shrink-0 space-y-2">
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
              className="cursor-grab rounded-md border border-border/60 bg-muted/30 px-2 py-1 text-xs text-foreground/80 hover:bg-muted/40"
            >
              {item.label}
            </div>
          ))}
        </div>
        <div className="flex-1 h-[360px] rounded-lg border border-border/60 bg-muted/10" ref={wrapperRef}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            onInit={setRfInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
          >
            <Background gap={18} color="hsl(var(--border))" />
            <MiniMap />
            <Controls />
          </ReactFlow>
        </div>
      </div>
      {compileError && <p className="text-xs text-destructive">{compileError}</p>}
      <div className="flex justify-end">
        <Button type="button" size="sm" variant="secondary" onClick={handleCompile}>
          Apply visual expression
        </Button>
      </div>
    </div>
  )
}
