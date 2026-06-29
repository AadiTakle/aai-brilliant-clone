import { describe, expect, it } from 'vitest'
import {
  extractReferenceSolutions,
  isWidgetRelatedErrors,
  selfTestLesson,
  validateGeneratedLesson,
} from '../../src/lib/ai/validate'
import { MAX_CUSTOM_LESSON_STEPS } from '../../src/lib/ai/cost'

function articleStep(id: string) {
  return {
    id,
    type: 'article',
    graded: false,
    config: { panels: [{ text: 'Hello' }] },
  }
}

function gradedPythonStep(id: string, testCases: unknown[]) {
  return {
    id,
    type: 'python_sandbox',
    graded: true,
    config: { prompt: 'Print READY', testCases },
  }
}

/** A python step carrying the model's referenceSolution (the new ground truth). */
function gradedPythonStepWithRef(
  id: string,
  referenceSolution: string,
  testCases: unknown[],
  extra: Record<string, unknown> = {},
) {
  return {
    id,
    type: 'python_sandbox',
    graded: true,
    config: { prompt: 'Solve it', referenceSolution, testCases, ...extra },
  }
}

/** A fake Pyodide runner that always returns the same stdout (no real Python). */
function runnerReturning(stdout: string) {
  return async () => ({ stdout, error: null })
}

function validLesson() {
  return {
    id: 'x',
    title: 'A Lesson',
    version: 1,
    steps: [
      articleStep('a'),
      gradedPythonStep('b', [{ expectedStdout: 'READY', feedback: 'Print READY exactly.' }]),
    ],
  }
}

describe('validateGeneratedLesson', () => {
  it('accepts a well-formed lesson', () => {
    const result = validateGeneratedLesson(validLesson())
    expect(result.ok).toBe(true)
  })

  it('strips referenceSolution from the validated (persisted) lesson', () => {
    // referenceSolution is transport-only ground truth: it must never survive into
    // the saved lesson (the answer would otherwise be shipped to the learner).
    const raw = {
      title: 'Has a ref',
      version: 1,
      steps: [
        gradedPythonStepWithRef('p', 'print("READY")', [
          { expectedStdout: 'READY', feedback: 'Print READY exactly.' },
        ]),
      ],
    }
    const result = validateGeneratedLesson(raw)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const config = result.lesson.steps[0].config as Record<string, unknown>
    expect(config.referenceSolution).toBeUndefined()
  })

  it('rejects content that is not even lesson-shaped', () => {
    const result = validateGeneratedLesson({ nope: true })
    expect(result.ok).toBe(false)
  })

  it('rejects a lesson with too many steps', () => {
    const steps = Array.from({ length: MAX_CUSTOM_LESSON_STEPS + 1 }, (_, i) => articleStep(`s${i}`))
    const result = validateGeneratedLesson({ id: 'x', title: 'Big', version: 1, steps })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.join(' ')).toMatch(/limit is/)
  })

  it('rejects duplicate step ids', () => {
    const lesson = { id: 'x', title: 'Dup', version: 1, steps: [articleStep('same'), articleStep('same')] }
    const result = validateGeneratedLesson(lesson)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.join(' ')).toMatch(/unique id/)
  })

  it('rejects a graded python step with no test cases', () => {
    const lesson = { id: 'x', title: 'NoTests', version: 1, steps: [gradedPythonStep('p', [])] }
    const result = validateGeneratedLesson(lesson)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.join(' ')).toMatch(/test case/)
  })

  it('rejects a graded python step whose every test case has empty expected output', () => {
    // A function-definition task that never prints: an empty submission would pass,
    // so it has no real ground truth.
    const lesson = {
      id: 'x',
      title: 'Vacuous',
      version: 1,
      steps: [gradedPythonStep('p', [{ expectedStdout: '', feedback: 'Define multiply.' }])],
    }
    const result = validateGeneratedLesson(lesson)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.join(' ')).toMatch(/non-empty expected output/)
  })

  it('accepts an article whose widget config is valid', () => {
    const lesson = {
      title: 'Widget',
      version: 1,
      steps: [
        {
          id: 'a',
          type: 'article',
          graded: false,
          config: {
            panels: [
              {
                text: 'Watch it cycle',
                activity: {
                  kind: 'widget',
                  widget: 'modulo_picker',
                  config: { max: 12, divisor: 3 },
                },
              },
            ],
          },
        },
        gradedPythonStep('b', [{ expectedStdout: 'READY', feedback: 'Print READY exactly.' }]),
      ],
    }
    const result = validateGeneratedLesson(lesson)
    expect(result.ok).toBe(true)
  })

  it('rejects an article whose widget config is malformed', () => {
    // type_sorter requires items[].type to be 'number' | 'text'; 'word' is invalid.
    const lesson = {
      title: 'Bad Widget',
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
                  widget: 'type_sorter',
                  config: { items: [{ label: '42', type: 'word' }, { label: 'hi', type: 'text' }] },
                },
              },
            ],
          },
        },
        gradedPythonStep('b', [{ expectedStdout: 'READY', feedback: 'Print READY exactly.' }]),
      ],
    }
    const result = validateGeneratedLesson(lesson)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.join(' ')).toMatch(/type_sorter/)
  })

  it('accepts a lesson where the model nulled an optional field (activity: null)', () => {
    // LLMs frequently emit `null` for optional fields they skip; the validator
    // should treat that the same as omitting them.
    const lesson = {
      title: 'Nulled Optionals',
      version: 1,
      steps: [
        { id: 'a', type: 'article', graded: false, config: { panels: [{ text: 'Hi', activity: null }] } },
        gradedPythonStep('b', [{ expectedStdout: 'READY', feedback: 'Print READY exactly.' }]),
      ],
    }
    const result = validateGeneratedLesson(lesson)
    expect(result.ok).toBe(true)
  })

  it('rejects an ungraded python step (gradable steps must be graded)', () => {
    const lesson = {
      id: 'x',
      title: 'Ungraded',
      version: 1,
      steps: [
        {
          id: 'p',
          type: 'python_sandbox',
          graded: false,
          config: {
            prompt: 'Print READY',
            testCases: [{ expectedStdout: 'READY', feedback: 'Print READY exactly.' }],
          },
        },
      ],
    }
    const result = validateGeneratedLesson(lesson)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.join(' ')).toMatch(/must be graded/)
  })

  it('rejects a graded python test case with no failure hint', () => {
    const lesson = {
      id: 'x',
      title: 'NoHint',
      version: 1,
      steps: [gradedPythonStep('p', [{ expectedStdout: 'READY' }])],
    }
    const result = validateGeneratedLesson(lesson)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.join(' ')).toMatch(/failure hint/)
  })

  it('rejects a Parsons problem missing an orderHint', () => {
    const lesson = {
      id: 'x',
      title: 'NoOrderHint',
      version: 1,
      steps: [
        {
          id: 'p',
          type: 'parsons_problem',
          graded: true,
          config: {
            prompt: 'Order it',
            lines: [
              { id: 'l1', code: 'for i in range(3):', indent: 0 },
              { id: 'l2', code: 'print(i)', indent: 1 },
            ],
            indentHint: 'Lines inside the loop are indented.',
          },
        },
      ],
    }
    const result = validateGeneratedLesson(lesson)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.join(' ')).toMatch(/orderHint/)
  })

  it('rejects a checkpoint missing feedback', () => {
    const lesson = {
      id: 'x',
      title: 'NoCheckpointFeedback',
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
                  prompt: 'Pick one',
                  choices: ['a', 'b'],
                  answerIndex: 0,
                },
              },
            ],
          },
        },
        gradedPythonStep('b', [{ expectedStdout: 'READY', feedback: 'Print READY exactly.' }]),
      ],
    }
    const result = validateGeneratedLesson(lesson)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.join(' ')).toMatch(/feedback/)
  })

  it('coerces function_machine case inputs from numbers or objects to strings', () => {
    const lesson = {
      id: 'x',
      title: 'FM coerce',
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
                  config: {
                    fnName: 'double',
                    cases: [{ input: { value: 5 }, output: 10 }],
                  },
                },
              },
            ],
          },
        },
        gradedPythonStep('b', [{ expectedStdout: 'READY', feedback: 'Print READY exactly.' }]),
      ],
    }
    const result = validateGeneratedLesson(lesson)
    expect(result.ok).toBe(true)
  })

  it('rejects a Parsons solution that calls input()', () => {
    const lesson = {
      id: 'x',
      title: 'Parsons input',
      version: 1,
      steps: [
        {
          id: 'p',
          type: 'parsons_problem',
          graded: true,
          config: {
            prompt: 'Arrange it',
            lines: [
              { id: 'l1', code: 'name = input()', indent: 0 },
              { id: 'l2', code: 'print(name)', indent: 0 },
            ],
            orderHint: 'Read input first.',
            indentHint: 'Both lines start at the left.',
          },
        },
      ],
    }
    const result = validateGeneratedLesson(lesson)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.join(' ')).toMatch(/must not use input/i)
  })

  it('rejects a Parsons line with unexpected indent (before Pyodide runs)', () => {
    const lesson = {
      id: 'x',
      title: 'Parsons indent',
      version: 1,
      steps: [
        {
          id: 'p',
          type: 'parsons_problem',
          graded: true,
          config: {
            prompt: 'Fix the indent',
            lines: [
              { id: 'l1', code: 'x = 1', indent: 0 },
              { id: 'l2', code: "print('That was not a valid number.')", indent: 1 },
            ],
            orderHint: 'Assignment first.',
            indentHint: 'Both lines start at the left.',
          },
        },
      ],
    }
    const result = validateGeneratedLesson(lesson)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.join(' ')).toMatch(/too deep/)
  })

  it('strips leading spaces from parsons line code during normalization', () => {
    const lesson = {
      id: 'x',
      title: 'Parsons trim',
      version: 1,
      steps: [
        {
          id: 'p',
          type: 'parsons_problem',
          graded: true,
          config: {
            prompt: 'Arrange',
            lines: [
              { id: 'l1', code: 'try:', indent: 0 },
              { id: 'l2', code: '    num = 1', indent: 1 },
              { id: 'l3', code: 'except ValueError:', indent: 0 },
              { id: 'l4', code: '    print("oops")', indent: 1 },
            ],
            orderHint: 'try then except.',
            indentHint: 'Inside lines are indent 1.',
          },
        },
        gradedPythonStep('b', [{ expectedStdout: 'READY', feedback: 'Print READY exactly.' }]),
      ],
    }
    const result = validateGeneratedLesson(lesson)
    expect(result.ok).toBe(true)
  })
})

describe('selfTestLesson', () => {
  it('passes when there is nothing runnable to verify', async () => {
    const lesson = { id: 'x', title: 'Article only', version: 1, steps: [articleStep('a')] }
    const validated = validateGeneratedLesson(lesson)
    expect(validated.ok).toBe(true)
    if (!validated.ok) return
    const result = await selfTestLesson(validated.lesson, runnerReturning(''), {})
    expect(result.ok).toBe(true)
  })

  it('accepts a sandbox whose reference solution passes its own test cases', async () => {
    const raw = {
      id: 'x',
      title: 'Ref ok',
      version: 1,
      steps: [
        gradedPythonStepWithRef('p', 'print("READY")', [
          { expectedStdout: 'READY', feedback: 'Print READY.' },
        ]),
      ],
    }
    const refs = extractReferenceSolutions(raw)
    const validated = validateGeneratedLesson(raw)
    expect(validated.ok).toBe(true)
    if (!validated.ok) return
    const result = await selfTestLesson(validated.lesson, runnerReturning('READY'), refs)
    expect(result.ok).toBe(true)
  })

  it('rejects a sandbox whose reference solution prints the wrong output', async () => {
    const raw = {
      id: 'x',
      title: 'Ref wrong output',
      version: 1,
      steps: [
        gradedPythonStepWithRef('p', 'print("NOPE")', [
          { expectedStdout: 'READY', feedback: 'Print READY.' },
        ]),
      ],
    }
    const refs = extractReferenceSolutions(raw)
    const validated = validateGeneratedLesson(raw)
    if (!validated.ok) throw new Error('expected a valid lesson')
    const result = await selfTestLesson(validated.lesson, runnerReturning('NOPE'), refs)
    expect(result.ok).toBe(false)
    expect(result.failures[0]?.stepId).toBe('p')
    expect(result.failures[0]?.reason).toMatch(/test case 1/)
  })

  it('rejects a sandbox whose reference solution misses a required construct', async () => {
    // Output matches, but the reference never uses the loop the task demands — so a
    // hardcoded learner answer could pass too. The gate catches that.
    const raw = {
      id: 'x',
      title: 'Ref no loop',
      version: 1,
      steps: [
        gradedPythonStepWithRef('p', 'print(15)', [{ expectedStdout: '15', feedback: 'Use a loop.' }], {
          requiredConstructs: ['loop'],
        }),
      ],
    }
    const refs = extractReferenceSolutions(raw)
    const validated = validateGeneratedLesson(raw)
    if (!validated.ok) throw new Error('expected a valid lesson')
    const result = await selfTestLesson(validated.lesson, runnerReturning('15'), refs)
    expect(result.ok).toBe(false)
    expect(result.failures[0]?.reason).toMatch(/required construct/)
  })

  it('rejects a sandbox whose reference solution hardcodes the expected output', async () => {
    const raw = {
      id: 'x',
      title: 'Ref hardcoded',
      version: 1,
      steps: [
        gradedPythonStepWithRef('p', 'print(30)', [{ expectedStdout: '30', feedback: 'Compute it.' }], {
          forbidHardcodedOutput: true,
        }),
      ],
    }
    const refs = extractReferenceSolutions(raw)
    const validated = validateGeneratedLesson(raw)
    if (!validated.ok) throw new Error('expected a valid lesson')
    const result = await selfTestLesson(validated.lesson, runnerReturning('30'), refs)
    expect(result.ok).toBe(false)
    expect(result.failures[0]?.reason).toMatch(/literal|hardcode/i)
  })

  it('rejects a sandbox that has no reference solution at all', async () => {
    const raw = {
      id: 'x',
      title: 'No ref',
      version: 1,
      steps: [gradedPythonStep('p', [{ expectedStdout: 'READY', feedback: 'Print READY.' }])],
    }
    const refs = extractReferenceSolutions(raw)
    const validated = validateGeneratedLesson(raw)
    if (!validated.ok) throw new Error('expected a valid lesson')
    const result = await selfTestLesson(validated.lesson, runnerReturning('READY'), refs)
    expect(result.ok).toBe(false)
    expect(result.failures[0]?.reason).toMatch(/missing reference solution/)
  })

  it('flags a Parsons solution that does not run', async () => {
    const lesson = {
      id: 'x',
      title: 'Parsons',
      version: 1,
      steps: [
        {
          id: 'p',
          type: 'parsons_problem',
          graded: true,
          config: {
            prompt: 'Order it',
            lines: [
              { id: 'l1', code: 'for i in range(3):', indent: 0 },
              { id: 'l2', code: 'print(i)', indent: 1 },
            ],
            orderHint: 'The loop header comes before what it repeats.',
            indentHint: 'The printed line runs inside the loop.',
          },
        },
      ],
    }
    const validated = validateGeneratedLesson(lesson)
    expect(validated.ok).toBe(true)
    if (!validated.ok) return
    const result = await selfTestLesson(validated.lesson, async () => ({
      stdout: '',
      error: 'IndentationError: unexpected indent',
    }))
    expect(result.ok).toBe(false)
    expect(result.failures[0]?.stepId).toBe('p')
  })

  it('runs a runnable function_machine script and flags one that errors', async () => {
    const lesson = {
      id: 'x',
      title: 'Run machine',
      version: 1,
      steps: [
        {
          id: 'fm',
          type: 'article',
          graded: false,
          config: {
            panels: [
              {
                activity: {
                  kind: 'widget',
                  widget: 'function_machine',
                  config: {
                    fnName: 'square',
                    quoted: false,
                    cases: [{ input: '4' }],
                    code: 'def square(n):\n    return n * n',
                  },
                },
              },
            ],
          },
        },
      ],
    }
    const validated = validateGeneratedLesson(lesson)
    expect(validated.ok).toBe(true)
    if (!validated.ok) return

    // The exact source the widget would run is handed to the runner.
    const okResult = await selfTestLesson(validated.lesson, async (src) => {
      expect(src).toContain('__fm_out = square(4)')
      return { stdout: '16', error: null }
    })
    expect(okResult.ok).toBe(true)

    const badResult = await selfTestLesson(validated.lesson, async () => ({
      stdout: '',
      error: "NameError: name 'sqaure' is not defined",
    }))
    expect(badResult.ok).toBe(false)
    expect(badResult.failures[0]?.stepId).toBe('fm')
  })
})

describe('extractReferenceSolutions', () => {
  it('captures each python_sandbox reference solution keyed by step id', () => {
    const raw = {
      title: 'Two sandboxes',
      version: 1,
      steps: [
        articleStep('a'),
        gradedPythonStepWithRef('p1', 'print(1)', [{ expectedStdout: '1', feedback: 'h' }]),
        gradedPythonStepWithRef('p2', 'print(2)', [{ expectedStdout: '2', feedback: 'h' }]),
      ],
    }
    expect(extractReferenceSolutions(raw)).toEqual({ p1: 'print(1)', p2: 'print(2)' })
  })

  it('returns an empty map when no sandbox carries a reference solution', () => {
    const raw = {
      title: 'No refs',
      version: 1,
      steps: [articleStep('a'), gradedPythonStep('p', [{ expectedStdout: 'X', feedback: 'h' }])],
    }
    expect(extractReferenceSolutions(raw)).toEqual({})
  })
})

describe('isWidgetRelatedErrors', () => {
  it('treats widget and checkpoint config issues as widget-related (simple mode can fix them)', () => {
    expect(isWidgetRelatedErrors(['Step "a" panel 0 widget "type_sorter": bad config'])).toBe(true)
    expect(
      isWidgetRelatedErrors(['Step "a" panel 0 checkpoint: needs correct-answer feedback']),
    ).toBe(true)
  })

  it('does NOT treat Parsons or sandbox ground-truth failures as widget-related (they should repair)', () => {
    // Simple mode does not change Parsons/sandbox steps, so these must route to a
    // repair pass instead of triggering a simple-mode regeneration.
    expect(isWidgetRelatedErrors(['p: Parsons solution does not run cleanly: NameError'])).toBe(
      false,
    )
    expect(
      isWidgetRelatedErrors(['p: reference solution does not pass its own test case 2']),
    ).toBe(false)
    expect(isWidgetRelatedErrors(['p: missing reference solution'])).toBe(false)
  })
})
