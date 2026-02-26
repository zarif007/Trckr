import type { TrackerLayoutNode } from '../../types'

export function splitRow(nodes: TrackerLayoutNode[], maxCols: number): TrackerLayoutNode[][] {
  const rows: TrackerLayoutNode[][] = []
  for (let i = 0; i < nodes.length; i += maxCols) {
    rows.push(nodes.slice(i, i + maxCols))
  }
  return rows
}

export function buildRowsFromNodes(
  nodes: TrackerLayoutNode[],
  maxCols: number
): TrackerLayoutNode[][] {
  if (nodes.length === 0) return []
  const hasFullPos = nodes.every((n) => n.row != null && n.col != null)
  if (!hasFullPos) {
    const ordered = [...nodes].sort((a, b) => a.order - b.order)
    return splitRow(ordered, maxCols)
  }
  const byRow = new Map<number, TrackerLayoutNode[]>()
  nodes.forEach((node) => {
    const rowKey = node.row ?? 0
    const list = byRow.get(rowKey)
    if (list) {
      list.push(node)
    } else {
      byRow.set(rowKey, [node])
    }
  })
  const rowKeys = [...byRow.keys()].sort((a, b) => a - b)
  const rows: TrackerLayoutNode[][] = []
  rowKeys.forEach((rowKey) => {
    const rowNodes = (byRow.get(rowKey) ?? []).sort((a, b) => (a.col ?? 0) - (b.col ?? 0))
    rows.push(...splitRow(rowNodes, maxCols))
  })
  return rows
}

export function rebuildNodesFromRows(
  rows: TrackerLayoutNode[][],
  gridId: string,
  existingByField: Map<string, TrackerLayoutNode>
): TrackerLayoutNode[] {
  const next: TrackerLayoutNode[] = []
  let order = 0
  rows.forEach((rowNodes, rowIndex) => {
    rowNodes.forEach((node, colIndex) => {
      const existing = existingByField.get(node.fieldId) ?? node
      next.push({
        ...existing,
        gridId,
        fieldId: node.fieldId,
        order,
        row: rowIndex,
        col: colIndex,
      })
      order += 1
    })
  })
  return next
}

export function findRowIndex(
  rows: TrackerLayoutNode[][],
  fieldId: string
): { rowIndex: number; colIndex: number } | null {
  for (let r = 0; r < rows.length; r += 1) {
    const row = rows[r]
    const c = row.findIndex((n) => n.fieldId === fieldId)
    if (c >= 0) return { rowIndex: r, colIndex: c }
  }
  return null
}
