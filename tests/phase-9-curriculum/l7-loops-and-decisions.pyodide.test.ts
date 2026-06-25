import { describe, it, expect, beforeAll } from 'vitest'
import { loadPyodideRunner, runPython } from '../../src/lib/pyodide/runner'
import { gradePython } from '../../src/lib/grading/pythonGrader'
import { normalizeOutput } from '../../src/lib/grading/outputGrader'
import { getLesson } from '../../src/content/loader'

// [Phase 9] L7 — the worked-demo programs, the parsons solution, and the typed
// 7.4 reference solution all run under real Python and produce what the lesson
// claims. `npm run test:pyodide`.
describe('[L7] Loops and Decisions (Pyodide)', () => {
  beforeAll(async () => {
    await loadPyodideRunner()
  })

  it('the worked-demo "same word each turn" program builds the repeated string (no str())', async () => {
    const src = 'result = ""\nfor i in range(4):\n    result = result + "no "\nprint(result)'
    expect(src).not.toContain('str(')
    const { stdout, error } = await runPython(src)
    expect(error).toBeNull()
    expect(normalizeOutput(stdout)).toBe('no no no no')
  })

  it('the worked-demo "yes/no decide" program (if/else inside the loop) builds yes no no yes', async () => {
    const src =
      'result = ""\nfor i in range(4):\n    if i % 3 == 0:\n        result = result + "yes "\n    else:\n        result = result + "no "\nprint(result)'
    expect(src).not.toContain('str(')
    const { stdout, error } = await runPython(src)
    expect(error).toBeNull()
    expect(normalizeOutput(stdout)).toBe('yes no no yes')
  })

  it('the 7.3 parsons solution, reassembled in order, prints the yes/no sequence', async () => {
    const lesson = getLesson('l7-loops-and-decisions')!
    const step = lesson.steps.find((s) => s.id === 'order-loop-and-if')!
    if (step.type !== 'parsons_problem') throw new Error('not parsons')
    // Reconstruct the source from the solution lines (indent → 4 spaces each).
    const src = step.config.lines.map((l) => '    '.repeat(l.indent) + l.code).join('\n')
    const { stdout, error } = await runPython(src)
    expect(error).toBeNull()
    expect(normalizeOutput(stdout)).toBe('yes no no yes no no yes')
  })

  it('the typed 7.4 reference solution produces exactly the expected yes/no output (no str())', async () => {
    const lesson = getLesson('l7-loops-and-decisions')!
    const step = lesson.steps.find((s) => s.id === 'accumulate-multiples-of-three')!
    if (step.type !== 'python_sandbox') throw new Error('not python')
    const ref =
      'result = ""\nfor i in range(7):\n    if i % 3 == 0:\n        result = result + "yes "\n    else:\n        result = result + "no "\nprint(result)'
    expect(ref).not.toContain('str(')
    const res = await gradePython(ref, step.config.testCases, undefined, {
      requiredConstructs: step.config.requiredConstructs,
    })
    expect(res.passed).toBe(true)
    expect(res.missingConstructs).toEqual([])
    expect(normalizeOutput(res.results[0].actual)).toBe(normalizeOutput(step.config.testCases[0].expectedStdout))
  })
})
