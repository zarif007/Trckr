import { describe, expect, it } from 'vitest'
import {
 applyCalculationsForRow,
 applyCompiledCalculationsForRow,
 buildAccumulateDepsBySourceGrid,
 compileCalculationsForGrid,
 extractExprFieldRefs,
 getGridIdsThatDependOnGridViaAccumulate,
} from '@/lib/field-calculation'
import { buildValidationContext } from '@/lib/validate-tracker/context'
import { validateCalculations } from '@/lib/validate-tracker/validators/calculations'
import { applyTrackerPatch } from '@/app/tracker/utils/mergeTracker'
import type { TrackerDisplayProps } from '@/app/components/tracker-display/types'
import type { ExprNode, FieldCalculationRule } from '@/lib/functions/types'
import type { TrackerLike } from '@/lib/validate-tracker/types'

describe('field calculations', () => {
 it('extractExprFieldRefs includes sourceFieldId for accumulate', () => {
 const expr: ExprNode = {
 op: 'accumulate',
 sourceFieldId: 'amounts_grid.amount',
 action: 'add',
 }
 const refs = extractExprFieldRefs(expr)
 expect(refs.has('amounts_grid.amount')).toBe(true)
 })

 it('extractExprFieldRefs includes sourceFieldId for sum and count', () => {
 const sumRefs = extractExprFieldRefs({
 op: 'sum',
 sourceFieldId: 'items_grid.amount',
 } as ExprNode)
 expect(sumRefs.has('items_grid.amount')).toBe(true)
 const countRefs = extractExprFieldRefs({
 op: 'count',
 sourceFieldId: 'items_grid.id',
 } as ExprNode)
 expect(countRefs.has('items_grid.id')).toBe(true)
 })

 it('computes amount = rate * quantity with numeric strings and numbers', () => {
 const result = applyCalculationsForRow({
 gridId: 'sales_grid',
 row: { rate: '12.5', quantity: 4 },
 calculations: {
 'sales_grid.amount': {
 expr: {
 op: 'mul',
 args: [
 { op: 'field', fieldId: 'sales_grid.rate' },
 { op: 'field', fieldId: 'sales_grid.quantity' },
 ],
 },
 },
 },
 changedFieldIds: ['rate', 'quantity'],
 })

 expect(result.row.amount).toBe(50)
 expect(result.updatedFieldIds).toContain('amount')
 })

 it('evaluates chained calculations in dependency order', () => {
 const result = applyCalculationsForRow({
 gridId: 'invoice_grid',
 row: { price: 20, qty: 3, tax_rate: 0.1 },
 calculations: {
 'invoice_grid.subtotal': {
 expr: {
 op: 'mul',
 args: [
 { op: 'field', fieldId: 'invoice_grid.price' },
 { op: 'field', fieldId: 'invoice_grid.qty' },
 ],
 },
 },
 'invoice_grid.tax': {
 expr: {
 op: 'mul',
 args: [
 { op: 'field', fieldId: 'invoice_grid.subtotal' },
 { op: 'field', fieldId: 'invoice_grid.tax_rate' },
 ],
 },
 },
 'invoice_grid.total': {
 expr: {
 op: 'add',
 args: [
 { op: 'field', fieldId: 'invoice_grid.subtotal' },
 { op: 'field', fieldId: 'invoice_grid.tax' },
 ],
 },
 },
 },
 changedFieldIds: ['price'],
 })

 expect(result.row.subtotal).toBe(60)
 expect(result.row.tax).toBe(6)
 expect(result.row.total).toBe(66)
 })

 it('skips cyclic targets and still computes non-cyclic targets', () => {
 const result = applyCalculationsForRow({
 gridId: 'calc_grid',
 row: { x: 2, z: 5 },
 calculations: {
 'calc_grid.a': {
 expr: {
 op: 'add',
 args: [
 { op: 'field', fieldId: 'calc_grid.b' },
 { op: 'const', value: 1 },
 ],
 },
 },
 'calc_grid.b': {
 expr: {
 op: 'add',
 args: [
 { op: 'field', fieldId: 'calc_grid.a' },
 { op: 'const', value: 1 },
 ],
 },
 },
 'calc_grid.c': {
 expr: {
 op: 'mul',
 args: [
 { op: 'field', fieldId: 'calc_grid.z' },
 { op: 'const', value: 2 },
 ],
 },
 },
 },
 })

 expect(result.row.c).toBe(10)
 expect(result.row.a).toBeUndefined()
 expect(result.row.b).toBeUndefined()
 expect(result.skippedCyclicTargets).toEqual(expect.arrayContaining(['a', 'b']))
 })

 it('getGridIdsThatDependOnGridViaAccumulate returns target grids that accumulate over source', () => {
 const calcs = {
 'main_grid.total_amount': {
 expr: {
 op: 'accumulate',
 sourceFieldId: 'amounts_grid.amount',
 action: 'add',
 },
 },
 'other_grid.x': {
 expr: { op: 'field', fieldId: 'other_grid.y' },
 },
 } satisfies Record<string, FieldCalculationRule>
 expect(getGridIdsThatDependOnGridViaAccumulate(calcs, 'amounts_grid')).toEqual(['main_grid'])
 expect(getGridIdsThatDependOnGridViaAccumulate(calcs, 'other_grid')).toEqual([])
 expect(getGridIdsThatDependOnGridViaAccumulate(undefined, 'amounts_grid')).toEqual([])
 })

 it('buildAccumulateDepsBySourceGrid builds map in one pass', () => {
 const calcs = {
 'main_grid.total_amount': {
 expr: {
 op: 'accumulate',
 sourceFieldId: 'amounts_grid.amount',
 action: 'add',
 },
 },
 'main_grid.other': {
 expr: {
 op: 'accumulate',
 sourceFieldId: 'amounts_grid.qty',
 action: 'add',
 },
 },
 } satisfies Record<string, FieldCalculationRule>
 const map = buildAccumulateDepsBySourceGrid(calcs)
 expect(map.get('amounts_grid')).toEqual(['main_grid'])
 expect(map.size).toBe(1)
 expect(buildAccumulateDepsBySourceGrid(undefined).size).toBe(0)
 })

 it('evaluates accumulate (sum table column) when gridData is provided', () => {
 const gridData = {
 amounts_grid: [
 { amount: 10 },
 { amount: 20 },
 { amount: 30 },
 ],
 main_grid: [{}],
 }
 const result = applyCompiledCalculationsForRow({
 plan: compileCalculationsForGrid('main_grid', {
 'main_grid.total_amount': {
 expr: {
 op: 'accumulate',
 sourceFieldId: 'amounts_grid.amount',
 action: 'add',
 },
 },
 }),
 row: {},
 gridData,
 })
 expect(result.row.total_amount).toBe(60)
 expect(result.updatedFieldIds).toContain('total_amount')
 })

 it('evaluates count and sum when gridData is provided', () => {
 const gridData = {
 items_grid: [
 { id: 'a', amount: 10 },
 { id: 'b', amount: 20 },
 { id: 'c', amount: 30 },
 ],
 overview_grid: [{}],
 }
 const result = applyCompiledCalculationsForRow({
 plan: compileCalculationsForGrid('overview_grid', {
 'overview_grid.total_items': {
 expr: { op: 'count', sourceFieldId: 'items_grid.id' },
 },
 'overview_grid.total_amount': {
 expr: { op: 'sum', sourceFieldId: 'items_grid.amount' },
 },
 }),
 row: {},
 gridData,
 })
 expect(result.row.total_items).toBe(3)
 expect(result.row.total_amount).toBe(60)
 expect(result.updatedFieldIds).toContain('total_items')
 expect(result.updatedFieldIds).toContain('total_amount')
 })

 it('compiled plan produces same output as wrapper API', () => {
 const calculations = {
 'sales_grid.amount': {
 expr: {
 op: 'mul' as const,
 args: [
 { op: 'field' as const, fieldId: 'sales_grid.rate' },
 { op: 'field' as const, fieldId: 'sales_grid.qty' },
 ],
 },
 },
 'sales_grid.discounted': {
 expr: {
 op: 'sub' as const,
 left: { op: 'field' as const, fieldId: 'sales_grid.amount' },
 right: { op: 'const' as const, value: 5 },
 },
 },
 }
 const row = { rate: 9, qty: 3 }

 const wrapped = applyCalculationsForRow({
 gridId: 'sales_grid',
 row,
 calculations,
 changedFieldIds: ['sales_grid.rate'],
 })

 const compiled = compileCalculationsForGrid('sales_grid', calculations)
 const fromCompiled = applyCompiledCalculationsForRow({
 plan: compiled,
 row,
 changedFieldIds: ['sales_grid.rate'],
 })

 expect(fromCompiled.row).toEqual(wrapped.row)
 expect(fromCompiled.updatedFieldIds).toEqual(wrapped.updatedFieldIds)
 expect(fromCompiled.skippedCyclicTargets).toEqual(wrapped.skippedCyclicTargets)
 })
})

describe('calculation validation', () => {
 it('rejects cross-grid field references in calculation expressions', () => {
 const tracker = {
 tabs: [{ id: 'main_tab' }],
 sections: [{ id: 'main_section', tabId: 'main_tab' }],
 grids: [{ id: 'sales_grid', sectionId: 'main_section' }, { id: 'other_grid', sectionId: 'main_section' }],
 fields: [{ id: 'amount', dataType: 'number' }, { id: 'rate', dataType: 'number' }, { id: 'qty', dataType: 'number' }],
 layoutNodes: [
 { gridId: 'sales_grid', fieldId: 'amount', order: 0 },
 { gridId: 'sales_grid', fieldId: 'rate', order: 1 },
 { gridId: 'other_grid', fieldId: 'qty', order: 0 },
 ],
 calculations: {
 'sales_grid.amount': {
 expr: {
 op: 'mul',
 args: [
 { op: 'field', fieldId: 'sales_grid.rate' },
 { op: 'field', fieldId: 'other_grid.qty' },
 ],
 },
 },
 },
 }

 const ctx = buildValidationContext(tracker as unknown as TrackerLike)
 const result = validateCalculations(ctx)
 expect((result.errors ?? []).some((e) => e.includes('must stay within target grid'))).toBe(true)
 })

 it('allows cross-grid sourceFieldId for accumulate', () => {
 const tracker = {
 tabs: [{ id: 'main_tab' }],
 sections: [{ id: 'main_section', tabId: 'main_tab' }],
 grids: [
 { id: 'main_grid', sectionId: 'main_section' },
 { id: 'amounts_grid', sectionId: 'main_section' },
 ],
 fields: [
 { id: 'total_amount', dataType: 'number' },
 { id: 'amount', dataType: 'number' },
 ],
 layoutNodes: [
 { gridId: 'main_grid', fieldId: 'total_amount', order: 0 },
 { gridId: 'amounts_grid', fieldId: 'amount', order: 0 },
 ],
 calculations: {
 'main_grid.total_amount': {
 expr: {
 op: 'accumulate',
 sourceFieldId: 'amounts_grid.amount',
 action: 'add',
 },
 },
 },
 }
 const ctx = buildValidationContext(tracker as unknown as TrackerLike)
 const result = validateCalculations(ctx)
 expect(result.errors ?? []).toHaveLength(0)
 })

 it('allows count and sum in calculations', () => {
 const tracker = {
 tabs: [{ id: 'main_tab' }],
 sections: [{ id: 'main_section', tabId: 'main_tab' }],
 grids: [
 { id: 'overview_grid', sectionId: 'main_section' },
 { id: 'items_grid', sectionId: 'main_section' },
 ],
 fields: [
 { id: 'total_items', dataType: 'number' },
 { id: 'low_stock_items', dataType: 'number' },
 { id: 'id', dataType: 'text' },
 { id: 'amount', dataType: 'number' },
 { id: 'total_amount', dataType: 'number' },
 ],
 layoutNodes: [
 { gridId: 'overview_grid', fieldId: 'total_items', order: 0 },
 { gridId: 'overview_grid', fieldId: 'low_stock_items', order: 1 },
 { gridId: 'items_grid', fieldId: 'id', order: 0 },
 { gridId: 'items_grid', fieldId: 'amount', order: 1 },
 { gridId: 'items_grid', fieldId: 'total_amount', order: 2 },
 ],
 calculations: {
 'overview_grid.total_items': {
 expr: { op: 'count', sourceFieldId: 'items_grid.id' },
 },
 'overview_grid.low_stock_items': {
 expr: { op: 'count', sourceFieldId: 'items_grid.id' },
 },
 'items_grid.total_amount': {
 expr: { op: 'sum', sourceFieldId: 'items_grid.amount' },
 },
 },
 }
 const ctx = buildValidationContext(tracker as unknown as TrackerLike)
 const result = validateCalculations(ctx)
 expect(result.errors ?? []).toHaveLength(0)
 })

 it('rejects invalid accumulate params (increment)', () => {
 const tracker = {
 tabs: [{ id: 'main_tab' }],
 sections: [{ id: 'main_section', tabId: 'main_tab' }],
 grids: [
 { id: 'main_grid', sectionId: 'main_section' },
 { id: 'amounts_grid', sectionId: 'main_section' },
 ],
 fields: [
 { id: 'total_amount', dataType: 'number' },
 { id: 'amount', dataType: 'number' },
 ],
 layoutNodes: [
 { gridId: 'main_grid', fieldId: 'total_amount', order: 0 },
 { gridId: 'amounts_grid', fieldId: 'amount', order: 0 },
 ],
 calculations: {
 'main_grid.total_amount': {
 expr: {
 op: 'accumulate',
 sourceFieldId: 'amounts_grid.amount',
 action: 'add',
 increment: 0,
 } as ExprNode,
 },
 },
 }
 const ctx = buildValidationContext(tracker as unknown as TrackerLike)
 const result = validateCalculations(ctx)
 expect((result.errors ?? []).some((e) => e.includes('increment'))).toBe(true)
 })

 it('rejects invalid keys, missing targets, malformed expr, and dependency cycles', () => {
 const tracker = {
 tabs: [{ id: 'main_tab' }],
 sections: [{ id: 'main_section', tabId: 'main_tab' }],
 grids: [{ id: 'sales_grid', sectionId: 'main_section' }],
 fields: [{ id: 'amount', dataType: 'number' }, { id: 'subtotal', dataType: 'number' }, { id: 'tax', dataType: 'number' }],
 layoutNodes: [
 { gridId: 'sales_grid', fieldId: 'amount', order: 0 },
 { gridId: 'sales_grid', fieldId: 'subtotal', order: 1 },
 { gridId: 'sales_grid', fieldId: 'tax', order: 2 },
 ],
 calculations: {
 amount: { expr: { op: 'const', value: 0 } },
 'sales_grid.missing_field': { expr: { op: 'const', value: 0 } },
 'sales_grid.amount': { expr: { bad: true } as unknown as ExprNode },
 'sales_grid.subtotal': { expr: { op: 'field', fieldId: 'sales_grid.tax' } },
 'sales_grid.tax': { expr: { op: 'field', fieldId: 'sales_grid.subtotal' } },
 },
 }

 const ctx = buildValidationContext(tracker as unknown as TrackerLike)
 const result = validateCalculations(ctx)
 expect(result.errors?.length).toBeGreaterThan(0)
 expect((result.errors ?? []).some((e) => e.includes('must be "gridId.fieldId"'))).toBe(true)
 expect((result.errors ?? []).some((e) => e.includes('field path'))).toBe(true)
 expect((result.errors ?? []).some((e) => e.includes('.expr must be a valid expression node'))).toBe(true)
 expect((result.errors ?? []).some((e) => e.includes('dependency cycle'))).toBe(true)
 })
})

describe('tracker patch merge for calculations', () => {
 const base: TrackerDisplayProps = {
 tabs: [{ id: 'main_tab', name: 'Main', placeId: 0 }],
 sections: [{ id: 'main_section', name: 'Main', tabId: 'main_tab', placeId: 0 }],
 grids: [{ id: 'sales_grid', name: 'Sales', sectionId: 'main_section', placeId: 0 }],
 fields: [
 { id: 'rate', dataType: 'number', ui: { label: 'Rate' }, config: {} },
 { id: 'qty', dataType: 'number', ui: { label: 'Qty' }, config: {} },
 { id: 'amount', dataType: 'number', ui: { label: 'Amount' }, config: {} },
 ],
 layoutNodes: [
 { gridId: 'sales_grid', fieldId: 'rate', order: 0 },
 { gridId: 'sales_grid', fieldId: 'qty', order: 1 },
 { gridId: 'sales_grid', fieldId: 'amount', order: 2 },
 ],
 bindings: {},
 validations: {},
 calculations: {},
 }

 it('adds and removes calculations via patch', () => {
 const added = applyTrackerPatch(base, {
 calculations: {
 'sales_grid.amount': {
 expr: {
 op: 'mul',
 args: [
 { op: 'field', fieldId: 'sales_grid.rate' },
 { op: 'field', fieldId: 'sales_grid.qty' },
 ],
 },
 },
 },
 })
 expect(added.calculations?.['sales_grid.amount']).toBeTruthy()

 const removed = applyTrackerPatch(added, {
 calculationsRemove: ['sales_grid.amount'],
 })
 expect(removed.calculations?.['sales_grid.amount']).toBeUndefined()
 })
})
