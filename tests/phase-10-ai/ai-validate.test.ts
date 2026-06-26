import { describe, expect, it } from 'vitest'
import { selfTestLesson, validateGeneratedLesson } from '../../src/lib/ai/validate'
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
    const validated = validateGeneratedLesson(validLesson())
    expect(validated.ok).toBe(true)
    if (!validated.ok) return
    const result = await selfTestLesson(validated.lesson, async () => ({ stdout: '', error: null }))
    expect(result.ok).toBe(true)
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
