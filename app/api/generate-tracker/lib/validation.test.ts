import { afterEach, describe, expect, it, vi } from 'vitest'
import { parseRequestBody } from './validation'

const ORIGINAL_KEY = process.env.DEEPSEEK_API_KEY

afterEach(() => {
  if (ORIGINAL_KEY === undefined) {
    delete process.env.DEEPSEEK_API_KEY
  } else {
    process.env.DEEPSEEK_API_KEY = ORIGINAL_KEY
  }
  vi.restoreAllMocks()
})

describe('parseRequestBody', () => {
  it('parses valid payload and trims query', () => {
    process.env.DEEPSEEK_API_KEY = 'test-key'

    const result = parseRequestBody({
      query: '  build sales tracker  ',
      messages: [{ role: 'user', content: 'hello' }],
      currentTracker: { tabs: [] },
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.query).toBe('build sales tracker')
    expect(result.messages).toHaveLength(1)
    expect(result.currentTracker).toEqual({ tabs: [] })
  })

  it('returns 400 for empty query', () => {
    process.env.DEEPSEEK_API_KEY = 'test-key'

    const result = parseRequestBody({ query: '' })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(400)
    expect(result.error).toContain('Query is required')
  })

  it('returns 500 when API key is missing', () => {
    delete process.env.DEEPSEEK_API_KEY

    const result = parseRequestBody({ query: 'build tracker' })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(500)
    expect(result.error).toBe('DEEPSEEK_API_KEY is not configured')
  })
})

