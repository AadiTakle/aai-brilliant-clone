import { describe, it, expect, beforeAll } from 'vitest'
import { loadPyodideRunner } from '../../src/lib/pyodide/runner'
import { gradePython } from '../../src/lib/grading/pythonGrader'
import { getLesson } from '../../src/content/loader'

// [L1] The first typed program must be solvable under real Python: the canonical
// solution `print("Hello World!")` should produce the step's expected output.
describe('[L1] first typed program (Pyodide)', () => {
  beforeAll(async () => {
    await loadPyodideRunner()
  })

  it('print("Hello World!") passes the first-program test cases', async () => {
    const lesson = getLesson('l1-talking-to-the-computer')!
    const step = lesson.steps.find((s) => s.id === 'first-program')!
    if (step.type !== 'python_sandbox') throw new Error('first-program is not a python sandbox')
    const res = await gradePython('print("Hello World!")', step.config.testCases, undefined, {
      requireLoop: step.config.requireLoop,
      requiredConstructs: step.config.requiredConstructs,
    })
    expect(res.passed).toBe(true)
  })
})
