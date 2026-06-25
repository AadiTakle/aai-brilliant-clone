import { describe, it, expect, beforeAll } from 'vitest'
import { loadPyodideRunner, runPython } from '../../src/lib/pyodide/runner'
import { gradePython } from '../../src/lib/grading/pythonGrader'
import { normalizeOutput } from '../../src/lib/grading/outputGrader'
import { getLesson } from '../../src/content/loader'

// [Phase 9] L8 — the pass-in / return-back traced program and the Beat-4
// reference solution all run under real Python and produce what the lesson
// claims. `npm run test:pyodide`.
describe('[L8] Build Your Own Machine (Pyodide)', () => {
  beforeAll(async () => {
    await loadPyodideRunner()
  })

  it('the traced double(5) program returns and prints 10', async () => {
    const src = 'def double(n):\n    result = n * 2\n    return result\n\nanswer = double(5)\nprint(answer)'
    const { stdout, error } = await runPython(src)
    expect(error).toBeNull()
    expect(normalizeOutput(stdout)).toBe('10')
  })

  it('the Beat-4 reference solution (define + return + call + print) prints 12', async () => {
    const lesson = getLesson('l8-build-your-own-machine')!
    const step = lesson.steps.find((s) => s.id === 'write-your-machine')!
    if (step.type !== 'python_sandbox') throw new Error('not python')
    const ref = 'def triple(n):\n    return n * 3\n\nprint(triple(4))'
    const res = await gradePython(ref, step.config.testCases)
    expect(res.passed).toBe(true)
    expect(normalizeOutput(res.results[0].actual)).toBe(
      normalizeOutput(step.config.testCases[0].expectedStdout),
    )
  })
})
