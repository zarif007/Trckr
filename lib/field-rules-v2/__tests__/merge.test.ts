import { describe, it, expect } from 'vitest'
import { mergeV1V2Overrides } from '../merge'

describe('mergeV1V2Overrides', () => {
  it('returns empty override when both are undefined', () => {
    expect(mergeV1V2Overrides(undefined, undefined)).toEqual({})
  })

  it('returns V1 override when V2 is undefined', () => {
    expect(mergeV1V2Overrides({ isHidden: true }, undefined)).toEqual({ isHidden: true })
  })

  it('maps V2 visibility=false to isHidden=true', () => {
    const result = mergeV1V2Overrides(undefined, { visibility: false })
    expect(result.isHidden).toBe(true)
  })

  it('maps V2 visibility=true to isHidden=false', () => {
    const result = mergeV1V2Overrides(undefined, { visibility: true })
    expect(result.isHidden).toBe(false)
  })

  it('maps V2 required to isRequired', () => {
    expect(mergeV1V2Overrides(undefined, { required: true }).isRequired).toBe(true)
  })

  it('maps V2 disabled to isDisabled', () => {
    expect(mergeV1V2Overrides(undefined, { disabled: true }).isDisabled).toBe(true)
  })

  it('passes V2 label through', () => {
    expect(mergeV1V2Overrides(undefined, { label: 'Alt Label' }).label).toBe('Alt Label')
  })

  it('passes V2 options through', () => {
    const opts = [{ label: 'A', value: 'a' }]
    expect(mergeV1V2Overrides(undefined, { options: opts }).options).toEqual(opts)
  })

  it('V2 wins over V1 on same property', () => {
    const result = mergeV1V2Overrides({ isHidden: true }, { visibility: true })
    expect(result.isHidden).toBe(false)
  })

  it('merges non-conflicting V1 and V2 fields', () => {
    const result = mergeV1V2Overrides({ isRequired: true }, { disabled: true, label: 'X' })
    expect(result.isRequired).toBe(true)
    expect(result.isDisabled).toBe(true)
    expect(result.label).toBe('X')
  })
})
