import { createEmptyTrackerSchema } from '@/app/components/tracker-display/tracker-editor/constants'
import { MASTER_DATA_VIEW_ID } from './constants'
import { createMasterDataGridId, createMasterDataSectionId, titleCase } from './utils'

type Grid = { id?: string; sectionId?: string; name?: string }
type Field = { id?: string; dataType?: string; ui?: { label?: string } }
type LayoutNode = { gridId?: string; fieldId?: string; order?: number }

function readSchemaArrays(schema: Record<string, unknown>) {
 const grids = Array.isArray(schema.grids) ? (schema.grids as Grid[]) : []
 const fields = Array.isArray(schema.fields) ? (schema.fields as Field[]) : []
 const layoutNodes = Array.isArray(schema.layoutNodes) ? (schema.layoutNodes as LayoutNode[]) : []
 return { grids, fields, layoutNodes }
}

export function findLabelFieldPathForOptionsBinding(
 schema: Record<string, unknown>,
 selectFieldId: string
): { gridId: string; labelFieldId: string } | null {
 const { grids, fields, layoutNodes } = readSchemaArrays(schema)
 if (!grids.length || !fields.length || !layoutNodes.length) return null

 const fieldIds = new Set(fields.map((f) => f.id).filter((id): id is string => typeof id === 'string'))
 const layoutByGrid = new Map<string, string[]>()
 for (const node of layoutNodes) {
 if (!node?.gridId || !node?.fieldId) continue
 if (!layoutByGrid.has(node.gridId)) layoutByGrid.set(node.gridId, [])
 layoutByGrid.get(node.gridId)!.push(node.fieldId)
 }

 const preferred = fieldIds.has('name') ? 'name' : null
 if (preferred && preferred !== selectFieldId) {
 for (const [gridId, fieldIdsInGrid] of layoutByGrid.entries()) {
 if (fieldIdsInGrid.includes(preferred)) return { gridId, labelFieldId: preferred }
 }
 }

 for (const [gridId, fieldIdsInGrid] of layoutByGrid.entries()) {
 const candidate = fieldIdsInGrid.find((id) => id && id !== selectFieldId)
 if (candidate) return { gridId, labelFieldId: candidate }
 }

 return null
}

export function buildMasterDataSchema(entityName: string): Record<string, unknown> {
 const base = createEmptyTrackerSchema()
 const tabId = base.tabs?.[0]?.id ?? 'overview_tab'
 const tabName = base.tabs?.[0]?.name ?? 'Overview'
 const sectionId = createMasterDataSectionId(entityName)
 const gridId = createMasterDataGridId(entityName)
 const sectionName = `${titleCase(entityName)} Master Data`

 return {
 ...base,
 name: undefined,
 masterDataScope: 'tracker',
 tabs: [{ id: tabId, name: tabName, placeId: base.tabs?.[0]?.placeId ?? 0, config: {} }],
 sections: [{ id: sectionId, name: sectionName, tabId, placeId: 1, config: {} }],
 grids: [
 {
 id: gridId,
 name: titleCase(entityName),
 sectionId,
 placeId: 1,
 config: {},
 views: [{ id: MASTER_DATA_VIEW_ID, name: 'Table', type: 'table', config: {} }],
 },
 ],
 fields: [
 {
 id: 'value',
 dataType: 'string',
 ui: { label: titleCase(entityName) || 'Value' },
 config: { isRequired: true },
 },
 ],
 layoutNodes: [{ gridId, fieldId: 'value', order: 1 }],
 bindings: {},
 validations: {},
 calculations: {},
 fieldRules: [],
 }
}
