import { describe, it, expect, beforeAll } from 'vitest'
import { runPython, loadPyodideRunner } from '../../src/lib/pyodide/runner'
import { gradeBlocks } from '../../src/lib/grading/blockGrader'
import type { CodeNode } from '../../src/lib/blocks/definitions'

// [Phase 4] Pyodide integration: compiled source actually runs and is graded.
// Runs under vitest.pyodide.config.ts (Node env). `npm run test:pyodide`.
describe('[Phase 4] Pyodide integration', () => {
  beforeAll(async () => {
    await loadPyodideRunner()
  })

  it('runs Python and captures stdout', async () => {
    const { stdout, error } = await runPython('for i in range(3):\n    print("hi")')
    expect(error).toBeNull()
    expect(stdout).toBe('hi\nhi\nhi\n')
  })

  it('grades a compiled block program against expected output', async () => {
    const program: CodeNode[] = [
      {
        type: 'for_each',
        slots: {
          var: [{ type: 'var', fields: { name: 'i' } }],
          iter: [
            {
              type: 'range_call',
              slots: {
                start: [{ type: 'num', fields: { value: 0 } }],
                stop: [{ type: 'num', fields: { value: 5 } }],
              },
            },
          ],
          body: [{ type: 'print', slots: { value: [{ type: 'str', fields: { value: 'Hello!' } }] } }],
        },
      },
    ]
    const res = await gradeBlocks(program, 'Hello!\nHello!\nHello!\nHello!\nHello!')
    expect(res.correct).toBe(true)
  })

  it('reports a runtime error instead of crashing', async () => {
    const { error } = await runPython('print(undefined_name)')
    expect(error).toBeTruthy()
  })
})
