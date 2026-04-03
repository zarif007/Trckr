import { describe, expect, it } from 'vitest'
import { masterDataBuildAuditSchema, parseMasterDataBuildAuditFromUnknown } from '../schema'

describe('parseMasterDataBuildAuditFromUnknown', () => {
 it('returns undefined for non-objects and empty actions', () => {
 expect(parseMasterDataBuildAuditFromUnknown(null)).toBeUndefined()
 expect(parseMasterDataBuildAuditFromUnknown([])).toBeUndefined()
 expect(parseMasterDataBuildAuditFromUnknown({ actions: [], createdTrackerIds: [] })).toBeUndefined()
 })

 it('parses valid audit and trims keys', () => {
 const out = parseMasterDataBuildAuditFromUnknown({
 actions: [
 { type: 'reuse', name: 'Students', trackerId: 't1', key: ' student ' },
 { type: 'create', name: 'Courses', trackerId: 't2', key: '' },
 ],
 createdTrackerIds: ['t2'],
 })
 expect(out).toEqual({
 actions: [
 { type: 'reuse', name: 'Students', trackerId: 't1', key: 'student' },
 { type: 'create', name: 'Courses', trackerId: 't2', key: undefined },
 ],
 createdTrackerIds: ['t2'],
 })
 })

 it('defaults createdTrackerIds to empty array when missing', () => {
 const out = parseMasterDataBuildAuditFromUnknown({
 actions: [{ type: 'reuse', name: 'A', trackerId: 'x' }],
 })
 expect(out?.createdTrackerIds).toEqual([])
 })

 it('rejects invalid rows via schema', () => {
 const bad = masterDataBuildAuditSchema.safeParse({
 actions: [{ type: 'reuse', name: '', trackerId: 'x' }],
 createdTrackerIds: [],
 })
 expect(bad.success).toBe(false)
 })

 it('transforms audit to normalized actions', () => {
 const ok = masterDataBuildAuditSchema.safeParse({
 actions: [{ type: 'reuse', name: 'A', trackerId: 'id1' }],
 createdTrackerIds: [],
 })
 expect(ok.success).toBe(true)
 if (ok.success) {
 expect(ok.data.actions[0]).toEqual({ type: 'reuse', name: 'A', trackerId: 'id1' })
 expect('key' in ok.data.actions[0]).toBe(false)
 }
 })
})
