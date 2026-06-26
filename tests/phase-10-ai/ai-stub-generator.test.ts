import { describe, expect, it } from 'vitest'
import { stubGenerator } from '../../src/lib/ai/stubGenerator'
import { validateGeneratedLesson } from '../../src/lib/ai/validate'

describe('stubGenerator', () => {
  it('refuses an empty request', async () => {
    const res = await stubGenerator.generate({ prompt: '   ' })
    expect(res.accepted).toBe(false)
  })

  it('refuses an out-of-scope request', async () => {
    const res = await stubGenerator.generate({ prompt: 'build me a multiplayer game' })
    expect(res.accepted).toBe(false)
  })

  it('refuses an overly long request', async () => {
    const res = await stubGenerator.generate({ prompt: 'x'.repeat(250) })
    expect(res.accepted).toBe(false)
  })

  it('accepts an in-scope concept and returns a schema-valid lesson', async () => {
    const res = await stubGenerator.generate({ prompt: 'how does the % remainder work' })
    expect(res.accepted).toBe(true)
    if (!res.accepted) return
    const validated = validateGeneratedLesson(res.lesson)
    expect(validated.ok).toBe(true)
  })
})
