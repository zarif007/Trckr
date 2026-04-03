import { describe, expect, it } from 'vitest'
import {
 isUntouchedFirstRunScaffold,
 normalizeValidationAndCalculations,
 trackerHasAnyData,
} from './normalization'

describe('tracker normalization helpers', () => {
 it('detects untouched first-run scaffold', () => {
 const result = isUntouchedFirstRunScaffold({
 tabs: [
 { id: 'overview_tab', name: 'Overview', config: { isHidden: false } },
 { id: 'shared_tab', name: 'Shared', config: { isHidden: false } },
 ],
 sections: [],
 grids: [],
 fields: [],
 layoutNodes: [],
 bindings: {},
 validations: {},
 calculations: {},
 fieldRules: [],
 } as never)

 expect(result).toBe(true)
 })

 it('reports tracker data presence when tabs exist', () => {
 const result = trackerHasAnyData({
 tabs: [{ id: 'overview_tab', name: 'Overview', placeId: 1, config: {} }],
 sections: [],
 grids: [],
 fields: [],
 } as never)

 expect(result).toBe(true)
 })

 it('normalizes legacy validation/calculation keys to grid.field', () => {
 const normalized = normalizeValidationAndCalculations({
 tabs: [],
 sections: [],
 grids: [{ id: 'tasks_grid', name: 'Tasks', sectionId: 'main_section', placeId: 1, config: {}, views: [] }],
 fields: [{ id: 'status', dataType: 'string', ui: { label: 'Status' }, config: {} }],
 layoutNodes: [{ gridId: 'tasks_grid', fieldId: 'status', order: 1 }],
 validations: {
 status: [{ type: 'required' }],
 },
 calculations: {
 status: { expr: { op: 'const', value: 'open' } },
 },
 bindings: {},
 fieldRules: [],
 } as never)

 expect(normalized.validations).toHaveProperty('tasks_grid.status')
 expect(normalized.calculations).toHaveProperty('tasks_grid.status')
 })
})

