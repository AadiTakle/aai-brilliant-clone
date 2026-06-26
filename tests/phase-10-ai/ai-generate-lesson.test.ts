import { describe, expect, it } from 'vitest'
import { generateValidatedLesson } from '../../src/lib/ai/generateLesson'
import type { AiGenerator, CustomLessonRequest } from '../../src/lib/ai/types'

const okSelfTest = async () => ({ ok: true as const, failures: [] })

function validLesson() {
  return {
    title: 'X',
    version: 1,
    steps: [
      { id: 'a', type: 'article', graded: false, config: { panels: [{ text: 'Hi' }] } },
      {
        id: 'b',
        type: 'python_sandbox',
        graded: true,
        config: { prompt: 'Print READY', testCases: [{ expectedStdout: 'READY', feedback: 'hint' }] },
      },
    ],
  }
}

// A checkpoint missing required feedback — normalization cannot fix this.
function invalidCheckpointLesson() {
  return {
    title: 'X',
    version: 1,
    steps: [
      {
        id: 'a',
        type: 'article',
        graded: false,
        config: {
          panels: [
            {
              activity: {
                kind: 'checkpoint',
                prompt: 'Which is true?',
                choices: ['yes', 'no'],
                answerIndex: 0,
              },
            },
          ],
        },
      },
      {
        id: 'b',
        type: 'python_sandbox',
        graded: true,
        config: { prompt: 'Print READY', testCases: [{ expectedStdout: 'READY', feedback: 'hint' }] },
      },
    ],
  }
}

// Missing test-case feedback — not widget-related, so the repair loop applies.
function invalidPythonFeedbackLesson() {
  return {
    title: 'X',
    version: 1,
    steps: [
      { id: 'a', type: 'article', graded: false, config: { panels: [{ text: 'Hi' }] } },
      {
        id: 'b',
        type: 'python_sandbox',
        graded: true,
        config: { prompt: 'Print READY', testCases: [{ expectedStdout: 'READY' }] },
      },
    ],
  }
}

describe('generateValidatedLesson (self-healing)', () => {
  it('repairs an invalid lesson by feeding the errors back, then succeeds', async () => {
    const reqs: CustomLessonRequest[] = []
    let call = 0
    const gen: AiGenerator = {
      async generate(req) {
        reqs.push(req)
        call += 1
        return { accepted: true, lesson: call === 1 ? invalidPythonFeedbackLesson() : validLesson() }
      },
    }
    const outcome = await generateValidatedLesson(gen, 'topic', { selfTest: okSelfTest })
    expect(outcome.kind).toBe('lesson')
    expect(call).toBe(2)
    expect(reqs[0].repair).toBeUndefined()
    expect(reqs[1].repair).toBeDefined()
    expect(reqs[1].repair?.errors.join(' ')).toMatch(/feedback/)
  })

  it('gives up with the last errors after exhausting attempts', async () => {
    let call = 0
    const gen: AiGenerator = {
      async generate() {
        call += 1
        return { accepted: true, lesson: invalidCheckpointLesson() }
      },
    }
    const outcome = await generateValidatedLesson(gen, 'topic', { maxAttempts: 4, selfTest: okSelfTest })
    expect(outcome.kind).toBe('invalid')
    if (outcome.kind === 'invalid') expect(outcome.errors.join(' ')).toMatch(/checkpoint/)
    expect(call).toBe(4)
  })

  it('falls back to simple widget mode after widget-related failures', async () => {
    const reqs: CustomLessonRequest[] = []
    let call = 0
    const gen: AiGenerator = {
      async generate(req) {
        reqs.push(req)
        call += 1
        if (call === 1) return { accepted: true, lesson: invalidCheckpointLesson() }
        return { accepted: true, lesson: validLesson() }
      },
    }
    const outcome = await generateValidatedLesson(gen, 'topic', { selfTest: okSelfTest })
    expect(outcome.kind).toBe('lesson')
    expect(outcome.simplifiedWidgets).toBe(true)
    // Second call should be simple mode with no repair (fresh start).
    expect(reqs[1].widgetMode).toBe('simple')
    expect(reqs[1].repair).toBeUndefined()
  })

  it('coerces function_machine numeric inputs without needing a repair pass', async () => {
    let call = 0
    const gen: AiGenerator = {
      async generate() {
        call += 1
        return {
          accepted: true,
          lesson: {
            title: 'X',
            version: 1,
            steps: [
              {
                id: 'a',
                type: 'article',
                graded: false,
                config: {
                  panels: [
                    {
                      activity: {
                        kind: 'widget',
                        widget: 'function_machine',
                        config: { fnName: 'print', cases: [{ input: 1, output: 1 }] },
                      },
                    },
                  ],
                },
              },
              {
                id: 'b',
                type: 'python_sandbox',
                graded: true,
                config: {
                  prompt: 'Print READY',
                  testCases: [{ expectedStdout: 'READY', feedback: 'hint' }],
                },
              },
            ],
          },
        }
      },
    }
    const outcome = await generateValidatedLesson(gen, 'topic', { selfTest: okSelfTest })
    expect(outcome.kind).toBe('lesson')
    expect(call).toBe(1)
  })

  it('never repairs a refusal — it is a final answer', async () => {
    let call = 0
    const gen: AiGenerator = {
      async generate() {
        call += 1
        return { accepted: false, reason: 'That is several lessons, not one topic.' }
      },
    }
    const outcome = await generateValidatedLesson(gen, 'topic', { selfTest: okSelfTest })
    expect(outcome.kind).toBe('refused')
    expect(call).toBe(1)
  })

  it('also repairs when the lesson validates but fails the runtime self-test', async () => {
    let call = 0
    const gen: AiGenerator = {
      async generate() {
        call += 1
        return { accepted: true, lesson: validLesson() }
      },
    }
    let st = 0
    const outcome = await generateValidatedLesson(gen, 'topic', {
      selfTest: async () => {
        st += 1
        return st === 1
          ? { ok: false, failures: [{ stepId: 'b', reason: 'does not run' }] }
          : { ok: true, failures: [] }
      },
    })
    expect(outcome.kind).toBe('lesson')
    expect(call).toBe(2)
  })
})
