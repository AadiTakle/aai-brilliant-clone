import { describe, it, expect } from 'vitest'
import { lessonSchema, stepSchema } from '../../src/content/schemas'
import { articleConfigSchema } from '../../src/problem-types/article/schema'
import { blockProblemConfigSchema } from '../../src/problem-types/block_problem/schema'
import { overAndOverAgain } from '../../src/content/lessons/over-and-over-again'

// [Phase 2] Content schemas accept valid and reject invalid
describe('[Phase 2] lessonSchema', () => {
  it('accepts the authored lesson', () => {
    expect(lessonSchema.safeParse(overAndOverAgain).success).toBe(true)
  })

  it('rejects a lesson with no steps', () => {
    expect(lessonSchema.safeParse({ id: 'x', title: 'X', version: 1, steps: [] }).success).toBe(false)
  })

  it('rejects a lesson missing a title', () => {
    expect(
      lessonSchema.safeParse({ id: 'x', version: 1, steps: overAndOverAgain.steps }).success,
    ).toBe(false)
  })
})

describe('[Phase 2] stepSchema', () => {
  it('rejects an unknown step type', () => {
    const result = stepSchema.safeParse({ id: 's', type: 'mystery', config: {} })
    expect(result.success).toBe(false)
  })

  it('accepts a valid article step and applies graded default', () => {
    const parsed = stepSchema.safeParse({
      id: 's',
      type: 'article',
      config: { panels: [{ text: 'hi' }] },
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.graded).toBe(false)
      expect(parsed.data.points).toBe(100)
    }
  })
})

describe('[Phase 2] per-type config schemas', () => {
  it('articleConfig rejects empty panels', () => {
    expect(articleConfigSchema.safeParse({ panels: [] }).success).toBe(false)
  })

  it('articleConfig rejects a panel with neither text nor activity', () => {
    expect(articleConfigSchema.safeParse({ panels: [{}] }).success).toBe(false)
  })

  it('blockProblemConfig rejects an invalid mode', () => {
    expect(
      blockProblemConfigSchema.safeParse({ mode: 'nope', prompt: 'p' }).success,
    ).toBe(false)
  })

  it('blockProblemConfig accepts a valid sandbox config', () => {
    expect(blockProblemConfigSchema.safeParse({ mode: 'sandbox', prompt: 'p' }).success).toBe(true)
  })
})
