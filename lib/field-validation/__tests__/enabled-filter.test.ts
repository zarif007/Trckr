import { beforeEach, describe, expect, it } from 'vitest'
import { clearValidationCache, getValidationError } from '../index'

describe('FieldValidationRule enabled filter', () => {
 beforeEach(() => {
 clearValidationCache()
 })

 it('skips a rule with enabled: false', () => {
 const error = getValidationError({
 value: 5,
 fieldId: 'qty',
 fieldType: 'number',
 rules: [{ type: 'min', value: 10, enabled: false }],
 })
 expect(error).toBeNull()
 })

 it('applies a rule with enabled: true', () => {
 const error = getValidationError({
 value: 5,
 fieldId: 'qty',
 fieldType: 'number',
 rules: [{ type: 'min', value: 10, enabled: true }],
 })
 expect(error).toBe('Must be at least 10')
 })

 it('applies a rule with enabled undefined (default active)', () => {
 const error = getValidationError({
 value: 5,
 fieldId: 'qty',
 fieldType: 'number',
 rules: [{ type: 'min', value: 10 }],
 })
 expect(error).toBe('Must be at least 10')
 })

 it('only skips the disabled rule when mixed enabled states', () => {
 const error = getValidationError({
 value: 200,
 fieldId: 'qty',
 fieldType: 'number',
 rules: [
 { type: 'min', value: 10, enabled: true },
 { type: 'max', value: 100, enabled: false },
 ],
 })
 // min passes (200 >= 10), max is skipped
 expect(error).toBeNull()
 })

 it('applies a required rule with enabled: true', () => {
 const error = getValidationError({
 value: '',
 fieldId: 'name',
 fieldType: 'string',
 rules: [{ type: 'required', enabled: true }],
 })
 expect(error).toBe('Required')
 })

 it('skips a required rule with enabled: false', () => {
 const error = getValidationError({
 value: '',
 fieldId: 'name',
 fieldType: 'string',
 rules: [{ type: 'required', enabled: false }],
 })
 expect(error).toBeNull()
 })
})
