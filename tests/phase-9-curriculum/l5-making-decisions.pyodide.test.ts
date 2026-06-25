import { describe, it, expect, beforeAll } from 'vitest'
import { loadPyodideRunner } from '../../src/lib/pyodide/runner'
import { gradePython } from '../../src/lib/grading/pythonGrader'
import { getLesson } from '../../src/content/loader'

describe('[L5] Making Decisions (Pyodide)', () => {
  beforeAll(async () => {
    await loadPyodideRunner()
  })

  it('3 fix-the-indent: the mis-indented starter errors, the indented fix prints the message', async () => {
    const lesson = getLesson('l5-making-decisions')!
    const step = lesson.steps.find((s) => s.id === 'fix-the-indent')!
    if (step.type !== 'python_sandbox') throw new Error('not a python sandbox')

    // The unedited (flush-left body) starter raises an IndentationError → fails.
    const starterRun = await gradePython(step.config.starterCode, step.config.testCases, undefined, {
      requiredConstructs: step.config.requiredConstructs,
    })
    expect(starterRun.passed).toBe(false)

    // Indenting the body under the if makes it run and print the message.
    const fixed = 'n = 6\nif n % 3 == 0:\n    print("multiple of 3")'
    const fixedRun = await gradePython(fixed, step.config.testCases, undefined, {
      requiredConstructs: step.config.requiredConstructs,
    })
    expect(fixedRun.passed).toBe(true)
  })

  it('6 finish-it: a correct if/else prints the number "4" for n = 4 (and the bare starter fails)', async () => {
    const lesson = getLesson('l5-making-decisions')!
    const step = lesson.steps.find((s) => s.id === 'finish-it')!
    if (step.type !== 'python_sandbox') throw new Error('not a python sandbox')

    // The bare starter (just `n = 4`) prints nothing → fails.
    const bareRun = await gradePython(step.config.starterCode, step.config.testCases, undefined, {
      requiredConstructs: step.config.requiredConstructs,
    })
    expect(bareRun.passed).toBe(false)

    // The reference two-way decision: 4 is not a multiple of 3, so the else path
    // prints the number itself.
    const solution = 'n = 4\nif n % 3 == 0:\n    print("multiple of 3")\nelse:\n    print(n)'
    const solvedRun = await gradePython(solution, step.config.testCases, undefined, {
      requiredConstructs: step.config.requiredConstructs,
    })
    expect(solvedRun.passed).toBe(true)
    expect(solvedRun.missingConstructs).toEqual([])
  })
})
