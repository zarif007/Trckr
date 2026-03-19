import { afterEach, describe, expect, it, vi } from 'vitest'
import { parsePlanBody, parseQuestionsBody } from './validation'

const ORIGINAL_KEY = process.env.DEEPSEEK_API_KEY

afterEach(() => {
  if (ORIGINAL_KEY === undefined) {
    delete process.env.DEEPSEEK_API_KEY
  } else {
    process.env.DEEPSEEK_API_KEY = ORIGINAL_KEY
  }
  vi.restoreAllMocks()
})

describe('parseQuestionsBody', () => {
  it('parses valid prompt and trims', () => {
    process.env.DEEPSEEK_API_KEY = 'test-key'
    const result = parseQuestionsBody({ prompt: '  build a crm  ' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.prompt).toBe('build a crm')
    expect(result.projectId).toBeNull()
  })

  it('returns 400 for empty prompt', () => {
    process.env.DEEPSEEK_API_KEY = 'test-key'
    const result = parseQuestionsBody({ prompt: '' })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(400)
  })

  it('returns 500 for missing API key', () => {
    delete process.env.DEEPSEEK_API_KEY
    const result = parseQuestionsBody({ prompt: 'build a crm' })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(500)
  })
})

describe('parsePlanBody', () => {
  it('parses valid prompt and answers', () => {
    process.env.DEEPSEEK_API_KEY = 'test-key'
    const result = parsePlanBody({ prompt: 'build a crm', answers: { industry: 'SaaS' } })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.prompt).toBe('build a crm')
    expect(result.answers).toEqual({ industry: 'SaaS' })
    expect(result.projectId).toBeNull()
  })

  it('returns 400 when answers missing', () => {
    process.env.DEEPSEEK_API_KEY = 'test-key'
    const result = parsePlanBody({ prompt: 'build a crm' })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(400)
  })
})
