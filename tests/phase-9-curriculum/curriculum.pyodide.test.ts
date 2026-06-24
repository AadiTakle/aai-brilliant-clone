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
    { lesson: 'l4-true-or-false', step: 'compare-numbers' },
    { lesson: 'l4-true-or-false', step: 'compare-strings' },
    { lesson: 'l5-making-decisions', step: 'if-elif-else' },
    { lesson: 'over-and-over-again', step: 'count-with-n' },
    { lesson: 'l7-loops-and-decisions', step: 'accumulate-label' },
    { lesson: 'l7-loops-and-decisions', step: 'loop-if-together' },
  ]

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
