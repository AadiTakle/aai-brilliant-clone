import { describe, it, expect, beforeAll } from 'vitest'
import { loadPyodideRunner, runPython } from '../../src/lib/pyodide/runner'
import { gradePython } from '../../src/lib/grading/pythonGrader'
import { gradeBlocks } from '../../src/lib/grading/blockGrader'
import { normalizeOutput } from '../../src/lib/grading/outputGrader'
import { getLesson } from '../../src/content/loader'
import type { CodeNode } from '../../src/lib/blocks/definitions'
import { FIZZBUZZPOP_REFERENCE } from './fixtures'

// [Phase 9] End-to-end checks under real Python. `npm run test:pyodide`.
describe('[Phase 9] FizzBuzzPop capstone (Pyodide)', () => {
  beforeAll(async () => {
    await loadPyodideRunner()
  })

  function capstoneExpected(): string {
    const lesson = getLesson('l9-fizzbuzzpop')!
    const step = lesson.steps.find((s) => s.id === 'capstone')!
    if (step.type !== 'python_sandbox') throw new Error('capstone missing')
    return step.config.testCases[0].expectedStdout
  }

  it('the reference solution produces exactly the capstone expected output', async () => {
    const { stdout, error } = await runPython(FIZZBUZZPOP_REFERENCE)
    expect(error).toBeNull()
    expect(normalizeOutput(stdout)).toBe(normalizeOutput(capstoneExpected()))
  })

  it('the reference solution passes the graded capstone (constructs satisfied)', async () => {
    const lesson = getLesson('l9-fizzbuzzpop')!
    const step = lesson.steps.find((s) => s.id === 'capstone')!
    if (step.type !== 'python_sandbox') throw new Error('capstone missing')
    const res = await gradePython(FIZZBUZZPOP_REFERENCE, step.config.testCases, undefined, {
      requiredConstructs: step.config.requiredConstructs,
    })
    expect(res.passed).toBe(true)
    expect(res.missingConstructs).toEqual([])
  })

  it('rejects hardcoded prints even if the output matched', async () => {
    // Cheat: print the literal answers with no loop / % / if.
    const cheat = capstoneExpected()
      .split('\n')
      .map((line) => `print(${/^\d+$/.test(line) ? line : JSON.stringify(line)})`)
      .join('\n')
    const lesson = getLesson('l9-fizzbuzzpop')!
    const step = lesson.steps.find((s) => s.id === 'capstone')!
    if (step.type !== 'python_sandbox') throw new Error('capstone missing')
    const res = await gradePython(cheat, step.config.testCases, undefined, {
      requiredConstructs: step.config.requiredConstructs,
    })
    expect(res.passed).toBe(false)
    expect(res.missingConstructs).toContain('loop')
  })
})

// The "run and observe" graded block problems should already produce their
// expected output when compiled and run (no learner edit required). This catches
// authoring mistakes in those lessons' initial programs / expected outputs.
describe('[Phase 9] run-only block lessons produce their expected output (Pyodide)', () => {
  beforeAll(async () => {
    await loadPyodideRunner()
  })

  const runOnly: { lesson: string; step: string }[] = [
    // L4's compare-numbers is now a build-it-yourself step (empty slots), so it
    // no longer runs-to-correct unedited; it is covered by l4-true-or-false.pyodide.
    // L5 was rebuilt OFF blocks toward typed Python + a learner-driven dial: its
    // if-elif-else block step is gone, so it is covered by l5-making-decisions.pyodide.
    // L7's run-only block steps (accumulate-label, loop-if-together) were removed
    // in the rehaul toward typed Python: 7.1 + the worked demo are now
    // program_stepper article widgets, the parsons assembles the accumulator, and
    // 7.4 is a typed python_sandbox (covered below + in l7-loops-and-decisions.pyodide).
  ]

  // No run-only block steps remain in the curriculum (the lessons that had them
  // were rebuilt toward typed Python). The guard keeps the suite non-empty and
  // self-documenting; new entries added to `runOnly` are exercised automatically.
  if (runOnly.length === 0) {
    it('has no run-only block steps left to verify (all rebuilt to typed Python)', () => {
      expect(runOnly).toHaveLength(0)
    })
  }

  for (const { lesson: lessonId, step: stepId } of runOnly) {
    it(`${lessonId} / ${stepId}`, async () => {
      const lesson = getLesson(lessonId)!
      const step = lesson.steps.find((s) => s.id === stepId)!
      if (step.type !== 'block_problem') throw new Error('not a block problem')
      const res = await gradeBlocks(
        step.config.initial as CodeNode[],
        step.config.expectedOutput!,
        undefined,
        { requireLoop: step.config.requireLoop, requiredConstructs: step.config.requiredConstructs },
      )
      expect(res.correct).toBe(true)
    })
  }
})

// L7's typed 7.4 practice (a pseudo-FizzBuzz that accumulates "yes"/"no" WORDS —
// no str() at this level) must have a reference solution that really produces its
// exact expected output.
describe('[Phase 9] L7 typed accumulator produces its expected output (Pyodide)', () => {
  beforeAll(async () => {
    await loadPyodideRunner()
  })

  it('l7-loops-and-decisions / accumulate-multiples-of-three reference solution matches expectedStdout', async () => {
    const lesson = getLesson('l7-loops-and-decisions')!
    const step = lesson.steps.find((s) => s.id === 'accumulate-multiples-of-three')!
    if (step.type !== 'python_sandbox') throw new Error('not a python sandbox')
    const ref =
      'result = ""\nfor i in range(7):\n    if i % 3 == 0:\n        result = result + "yes "\n    else:\n        result = result + "no "\nprint(result)'
    const { stdout, error } = await runPython(ref)
    expect(error).toBeNull()
    expect(normalizeOutput(stdout)).toBe(normalizeOutput(step.config.testCases[0].expectedStdout))
  })
})
