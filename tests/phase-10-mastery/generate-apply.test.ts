import { describe, it, expect, vi } from 'vitest'
import { getMasteryChallenge } from '../../src/content/mastery'
import {
  generateApply,
  type GeneratedApplyQuestion,
  type MasteryGenerator,
} from '../../src/lib/mastery/generateApply'
import type { PythonRunner } from '../../src/lib/pyodide/runner'

const spec = getMasteryChallenge('l1-talking-to-the-computer')!
const l9 = getMasteryChallenge('l9-fizzbuzzpop')!

const aiQuestion: GeneratedApplyQuestion = {
  prompt: 'Print the number 5 on one line.',
  starterCode: '# print 5',
  requiredConstructs: [],
  testCases: [{ expectedStdout: '5', feedback: 'Use print(5).' }],
  referenceSolution: 'print(5)',
}

function generator(result: Awaited<ReturnType<MasteryGenerator['generate']>>): MasteryGenerator {
  return { generate: vi.fn(async () => result) }
}

// A runner that always reports the given stdout (Pyodide is stubbed out here).
function runnerReturning(stdout: string): PythonRunner {
  return vi.fn(async () => ({ stdout, error: null }))
}

describe('[Mastery] generateApply', () => {
  it('uses the authored static apply when AI is disabled', async () => {
    const set = await generateApply(spec, [], { enabled: false })
    expect(set.source).toBe('static')
    expect(set.questions).toEqual(spec.applyFallback)
  })

  it('always uses the static apply for a forceStaticApply lesson (L9), even with AI on', async () => {
    const set = await generateApply(l9, ['loop'], {
      enabled: true,
      generator: generator({ accepted: true, questions: [aiQuestion] }),
      runner: runnerReturning('5'),
    })
    expect(set.source).toBe('static')
    expect(set.questions).toEqual(l9.applyFallback)
  })

  it('uses AI questions when generation passes its own self-test', async () => {
    const set = await generateApply(spec, ['print'], {
      enabled: true,
      generator: generator({ accepted: true, questions: [aiQuestion] }),
      runner: runnerReturning('5'),
    })
    expect(set.source).toBe('ai')
    expect(set.questions).toHaveLength(1)
    expect(set.questions[0].prompt).toContain('Print the number 5')
  })

  it('falls back to static when the AI reference solution fails its self-test', async () => {
    const set = await generateApply(spec, ['print'], {
      enabled: true,
      generator: generator({ accepted: true, questions: [aiQuestion] }),
      // The reference "prints 5" but the runner reports "6": self-test fails.
      runner: runnerReturning('6'),
    })
    expect(set.source).toBe('static')
    expect(set.questions).toEqual(spec.applyFallback)
  })

  it('falls back to static when the model refuses', async () => {
    const set = await generateApply(spec, ['print'], {
      enabled: true,
      generator: generator({ accepted: false, reason: 'nope' }),
      runner: runnerReturning('5'),
    })
    expect(set.source).toBe('static')
  })

  it('falls back to static when the generator throws', async () => {
    const set = await generateApply(spec, ['print'], {
      enabled: true,
      generator: { generate: vi.fn(async () => { throw new Error('network') }) },
      runner: runnerReturning('5'),
    })
    expect(set.source).toBe('static')
  })

  it('rejects an AI question whose test case has no feedback', async () => {
    const noFeedback: GeneratedApplyQuestion = {
      ...aiQuestion,
      testCases: [{ expectedStdout: '5', feedback: '' }],
    }
    const set = await generateApply(spec, ['print'], {
      enabled: true,
      generator: generator({ accepted: true, questions: [noFeedback] }),
      runner: runnerReturning('5'),
    })
    expect(set.source).toBe('static')
  })
})
