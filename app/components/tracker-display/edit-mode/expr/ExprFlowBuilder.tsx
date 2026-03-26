'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import ReactFlow, {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  MarkerType,
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
import { Trash2 } from 'lucide-react'
import { compileExprFromGraph, exprToGraph, type ExprFlowNodeData } from './expr-graph'
import type { ExprNode } from '@/lib/functions/types'
import { normalizeExprNode } from '@/lib/schemas/expr'
import { FlowBuilderLayout } from '@/lib/flow-builder'
import { cn } from '@/lib/utils'
import type { AvailableField, ExprFlowNodeType, ExprFlowOperator, LogicOp, MathOp, StringOp } from './expr-types'
import { nodeTypes, type FlowNode, type FlowNodeData } from './ExprFlowNodes'
import { ExprFlowPalette } from './ExprFlowPalette'

interface ExprFlowBuilderProps {
  expr: ExprNode
  availableFields: AvailableField[]
  onChange: (expr: ExprNode) => void
  resultFieldId?: string
  resultFieldLabel?: string
  headerAction?: ReactNode
  flowHeightClassName?: string
}

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

export function ExprFlowBuilder({
  expr,
  availableFields,
  onChange,
  resultFieldId,
  resultFieldLabel,
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
        ...(node.type === 'result'
          ? { resultFieldId, resultFieldLabel }
          : {}),
      },
    }),
    [availableFields, deleteNode, updateNodeData, resultFieldId, resultFieldLabel]
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
  }, [availableFields, availableFieldsKey, setNodes])

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
    (
      type: ExprFlowNodeType,
      position: { x: number; y: number },
      op?: ExprFlowOperator,
      logicOp?: LogicOp,
      mathOp?: MathOp,
      stringOp?: StringOp,
    ) => {
      const id = `expr_ui_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const data: FlowNodeData = { onChange: undefined, availableFields }
      if (type === 'field') data.fieldId = ''
      if (type === 'const') data.value = ''
      if (type === 'op') data.op = op
      if (type === 'accumulator') { data.action = 'add'; data.increment = 1 }
      if (type === 'logic') {
        data.logicOp = logicOp ?? 'and'
        if (logicOp === 'and' || logicOp === 'or') data.inputCount = 2
      }
      if (type === 'math') {
        data.mathOp = mathOp ?? 'abs'
        if (mathOp === 'min' || mathOp === 'max') data.inputCount = 2
      }
      if (type === 'string') {
        data.stringOp = stringOp ?? 'concat'
        if (stringOp === 'concat') data.inputCount = 2
      }
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
      const raw = event.dataTransfer.getData('application/reactflow')
      if (!raw || !rfInstance) return
      let parsed: {
        type?: ExprFlowNodeType
        op?: ExprFlowOperator
        logicOp?: LogicOp
        mathOp?: MathOp
        stringOp?: StringOp
      } = {}
      try { parsed = JSON.parse(raw) } catch { return }
      if (!parsed.type) return
      const position = rfInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY })
      createNode(parsed.type, position, parsed.op, parsed.logicOp, parsed.mathOp, parsed.stringOp)
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

  const makeDragStart = useCallback((payload: object) => (event: React.DragEvent) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(payload))
    event.dataTransfer.effectAllowed = 'move'
  }, [])

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
      palette={<ExprFlowPalette makeDragStart={makeDragStart} />}
      canvasMinHeight="360px"
      applyError={compileError}
      onApply={handleCompile}
      applyLabel="Apply visual expression"
      paletteClassName="w-[148px]"
      canvasClassName="min-h-0"
    >
      <div
        ref={wrapperRef}
        className={cn(
          'flex min-h-0 min-w-0 w-full flex-1 flex-col min-h-[320px]',
          flowHeightClassName ?? 'h-[360px]'
        )}
      >
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
          className="!bg-transparent h-full min-h-0 w-full min-w-0"
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
