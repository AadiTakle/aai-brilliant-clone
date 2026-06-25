import { describe, it, expect, beforeAll } from 'vitest'
import { loadPyodideRunner } from '../../src/lib/pyodide/runner'
import { gradeBlocks } from '../../src/lib/grading/blockGrader'
import { getLesson } from '../../src/content/loader'
import type { CodeNode } from '../../src/lib/blocks/definitions'

describe('[L4] True or False (Pyodide)', () => {
  beforeAll(async () => {
    await loadPyodideRunner()
  })

  it('3. the unfinished starter does not pass, but the built solution prints True', async () => {
    const lesson = getLesson('l4-true-or-false')!
    const step = lesson.steps.find((s) => s.id === 'compare-numbers')!
    if (step.type !== 'block_problem') throw new Error('compare-numbers is not a block problem')

    // The unfinished program (empty slots) must NOT already pass.
    const starter = await gradeBlocks(step.config.initial as CodeNode[], step.config.expectedOutput!, undefined, {
      requiredConstructs: step.config.requiredConstructs,
    })
    expect(starter.correct).toBe(false)

    // Build it: remainder = i % 3 ; print(remainder == 0) with i = 9 → True.
    const built: CodeNode[] = [
      {
        type: 'assign',
        slots: {
          target: [{ type: 'var', fields: { name: 'i' } }],
          value: [{ type: 'num', fields: { value: 9 } }],
        },
      },
      {
        type: 'assign',
        slots: {
          target: [{ type: 'var', fields: { name: 'remainder' } }],
          value: [
            {
              type: 'binop',
              fields: { op: '%' },
              slots: {
                left: [{ type: 'var', fields: { name: 'i' } }],
                right: [{ type: 'num', fields: { value: 3 } }],
              },
            },
          ],
        },
      },
      {
        type: 'print',
        slots: {
          value: [
            {
              type: 'compare',
              fields: { op: '==' },
              slots: {
                left: [{ type: 'var', fields: { name: 'remainder' } }],
                right: [{ type: 'num', fields: { value: 0 } }],
              },
            },
          ],
        },
      },
    ]
    const built_run = await gradeBlocks(built, step.config.expectedOutput!, undefined, {
      requiredConstructs: step.config.requiredConstructs,
      requireCompare: step.config.requireCompare,
    })
    expect(built_run.correct).toBe(true)
    expect(built_run.compareMissing).toBe(false)
  })
})
