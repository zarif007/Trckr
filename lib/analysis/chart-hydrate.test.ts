import { describe, expect, it } from 'vitest'

import { hydrateChartDataForBlocks } from './chart-hydrate'

describe('hydrateChartDataForBlocks', () => {
 it('hydrates pie rows with numeric values', () => {
 const blocks = [
 {
 sectionId: 's1',
 markdown: 'm',
 sources: 'src',
 chartSpec: { type: 'pie' as const, nameKey: 'n', valueKey: 'v' },
 },
 ]
 const rows = [
 { n: 'A', v: 10 },
 { n: 'B', v: 20 },
 ]
 const out = hydrateChartDataForBlocks(blocks, rows)
 expect(out[0].chartData).toEqual([
 { n: 'A', v: 10 },
 { n: 'B', v: 20 },
 ])
 })

 it('hydrates gantt as pad/span from ISO dates', () => {
 const blocks = [
 {
 sectionId: 'g1',
 markdown: 'm',
 sources: 'src',
 chartSpec: {
 type: 'gantt' as const,
 labelKey: 'task',
 startKey: 'start',
 endKey: 'end',
 },
 },
 ]
 const rows = [
 { task: 'One', start: '2024-01-01T00:00:00.000Z', end: '2024-01-03T00:00:00.000Z' },
 { task: 'Two', start: '2024-01-02T00:00:00.000Z', end: '2024-01-05T00:00:00.000Z' },
 ]
 const out = hydrateChartDataForBlocks(blocks, rows)
 const data = out[0].chartData!
 expect(data).toHaveLength(2)
 expect(data[0]).toMatchObject({ label: 'One', pad: 0 })
 expect(typeof (data[0] as { span: number }).span).toBe('number')
 expect((data[0] as { span: number }).span).toBeGreaterThan(0)
 expect(data[0]).toHaveProperty('__ganttMinStart')
 })

 it('strips chartSpec when gantt has no valid intervals', () => {
 const blocks = [
 {
 sectionId: 'g1',
 markdown: 'm',
 sources: 'src',
 chartSpec: {
 type: 'gantt' as const,
 labelKey: 'task',
 startKey: 'start',
 endKey: 'end',
 },
 },
 ]
 const out = hydrateChartDataForBlocks(blocks, [{ task: 'x', start: 'bad', end: 'bad' }])
 expect(out[0].chartSpec).toBeUndefined()
 })
})
