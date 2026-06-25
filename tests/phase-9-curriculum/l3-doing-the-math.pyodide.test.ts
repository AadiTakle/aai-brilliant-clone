import { describe, it, expect, beforeAll } from 'vitest'
import { loadPyodideRunner } from '../../src/lib/pyodide/runner'
import { gradeBlocks } from '../../src/lib/grading/blockGrader'
import { gradePython } from '../../src/lib/grading/pythonGrader'
import { getLesson } from '../../src/content/loader'
import type { CodeNode } from '../../src/lib/blocks/definitions'

describe('[L3] What\'s Remaining? (Pyodide)', () => {
  beforeAll(async () => {
    await loadPyodideRunner()
  })

  it('3.2 starts bugged (does not yet print 1) and becomes correct once fixed to 10 % 3', async () => {
    const lesson = getLesson('l3-doing-the-math')!
    const step = lesson.steps.find((s) => s.id === 'fix-the-remainder')!
    if (step.type !== 'block_problem') throw new Error('fix-the-remainder is not a block problem')

    // The bugged starting program must NOT already pass.
    const buggedRun = await gradeBlocks(step.config.initial as CodeNode[], step.config.expectedOutput!, undefined, {
      requiredConstructs: step.config.requiredConstructs,
    })
    expect(buggedRun.correct).toBe(false)

    // Fixing the divisor to 3 makes 10 % 3 == 1, satisfying the goal + constructs.
    const fixed: CodeNode[] = [
      {
        type: 'assign',
        slots: {
          target: [{ type: 'var', fields: { name: 'remainder' } }],
          value: [
            {
              type: 'binop',
              fields: { op: '%' },
              slots: {
                left: [{ type: 'num', fields: { value: 10 } }],
                right: [{ type: 'num', fields: { value: 3 } }],
              },
            },
          ],
        },
      },
      { type: 'print', slots: { value: [{ type: 'var', fields: { name: 'remainder' } }] } },
    ]
    const fixedRun = await gradeBlocks(fixed, step.config.expectedOutput!, undefined, {
      requiredConstructs: step.config.requiredConstructs,
    })
    expect(fixedRun.correct).toBe(true)
  })

  it('3.4 starter does not pass, but the learner\'s modulo solution does', async () => {
    const lesson = getLesson('l3-doing-the-math')!
    const step = lesson.steps.find((s) => s.id === 'type-the-remainder')!
    if (step.type !== 'python_sandbox') throw new Error('type-the-remainder is not a python sandbox')

    // The unedited scaffold must not pass (it has no assignment value yet).
    const starterRun = await gradePython(step.config.starterCode, step.config.testCases, undefined, {
      requiredConstructs: step.config.requiredConstructs,
    })
    expect(starterRun.passed).toBe(false)

    // The intended solution passes.
    const solved = await gradePython('remainder = 10 % 3\nprint(remainder)', step.config.testCases, undefined, {
      requiredConstructs: step.config.requiredConstructs,
    })
    expect(solved.passed).toBe(true)
  })
})
