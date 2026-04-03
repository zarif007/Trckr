import { describe, expect, it } from 'vitest'

import {
 analysisDocumentFromModelSchema,
 analysisDocumentSchema,
 analysisOutlineOnlySchema,
 analysisOutlinePayloadSchema,
 parseAnalysisDocument,
 parseAnalysisOutlineOnly,
} from './analysis-schemas'

describe('analysisOutlineOnlySchema', () => {
 it('accepts minimal valid outline (no query plan)', () => {
 const data = {
 narrative: 'Test',
 sections: [
 {
 id: 's1',
 title: 'Overview',
 kind: 'narrative' as const,
 focus: 'High-level',
 },
 ],
 }
 const parsed = parseAnalysisOutlineOnly(data)
 expect(parsed).not.toBeNull()
 expect(parsed?.narrative).toBe('Test')
 expect(analysisOutlineOnlySchema.safeParse(data).success).toBe(true)
 })

 it('rejects invalid payload', () => {
 expect(parseAnalysisOutlineOnly({})).toBeNull()
 })
})

describe('analysisDocumentSchema', () => {
 it('parses persisted document with chartData', () => {
 const doc = {
 version: 1 as const,
 blocks: [
 {
 sectionId: 's1',
 markdown: 'Hello',
 sources: '42 rows',
 chartSpec: { type: 'bar' as const, xKey: 'a', yKeys: ['b'] },
 chartData: [{ a: 'x', b: 1 }],
 },
 ],
 }
 expect(parseAnalysisDocument(doc)).toEqual(doc)
 })

 it('accepts area, pie, and gantt chart specs', () => {
 const area = {
 version: 1 as const,
 blocks: [
 {
 sectionId: 'a',
 markdown: 'm',
 sources: 's',
 chartSpec: { type: 'area' as const, xKey: 't', yKeys: ['v'] },
 chartData: [{ t: 'Jan', v: 2 }],
 },
 ],
 }
 const pie = {
 version: 1 as const,
 blocks: [
 {
 sectionId: 'p',
 markdown: 'm',
 sources: 's',
 chartSpec: { type: 'pie' as const, nameKey: 'n', valueKey: 'v' },
 chartData: [{ n: 'A', v: 10 }],
 },
 ],
 }
 const gantt = {
 version: 1 as const,
 blocks: [
 {
 sectionId: 'g',
 markdown: 'm',
 sources: 's',
 chartSpec: {
 type: 'gantt' as const,
 labelKey: 'task',
 startKey: 'start',
 endKey: 'end',
 },
 chartData: [{ task: 'A', pad: 0, span: 86400000, startMs: 0, endMs: 86400000 }],
 },
 ],
 }
 expect(parseAnalysisDocument(area)).toEqual(area)
 expect(parseAnalysisDocument(pie)).toEqual(pie)
 expect(parseAnalysisDocument(gantt)).toEqual(gantt)
 })
})

describe('analysisDocumentFromModelSchema', () => {
 it('strips unknown keys such as chartData', () => {
 const bad = {
 version: 1,
 blocks: [
 {
 sectionId: 's1',
 markdown: 'Hi',
 sources: 'src',
 chartData: [{ a: 1 }],
 },
 ],
 }
 const r = analysisDocumentFromModelSchema.safeParse(bad)
 expect(r.success).toBe(true)
 expect(r.data?.blocks[0]).not.toHaveProperty('chartData')
 })
})

describe('analysisOutlinePayloadSchema', () => {
 it('parses outline only', () => {
 const o = {
 version: 1 as const,
 narrative: 'N',
 sections: [{ id: 'a', title: 'T', kind: 'callout' as const, focus: 'f' }],
 }
 expect(analysisOutlinePayloadSchema.safeParse(o).success).toBe(true)
 })
})
