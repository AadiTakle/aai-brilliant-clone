import { describe, it, expect } from 'vitest'
import { gradePython } from '../../src/lib/grading/pythonGrader'
import { gradeBlocks } from '../../src/lib/grading/blockGrader'
import { compileToSource } from '../../src/lib/blocks/compiler'
import type { CodeNode } from '../../src/lib/blocks/definitions'
import type { PythonRunner } from '../../src/lib/pyodide/runner'

const OUT = '0\n1\n2'
const constRunner = (stdout: string): PythonRunner => async () => ({ stdout, error: null })

describe('[Phase 8] requireLoop enforcement (python)', () => {
  const tests = [{ stdin: '', expectedStdout: OUT }]

  it('fails correct output with no loop and flags loopMissing', async () => {
    const res = await gradePython('print(0)\nprint(1)\nprint(2)', tests, constRunner(OUT), {
      requireLoop: true,
    })
    expect(res.passed).toBe(false)
    expect(res.loopMissing).toBe(true)
  })

  it('passes correct output that uses a loop', async () => {
    const res = await gradePython('for i in range(3):\n    print(i)', tests, constRunner(OUT), {
      requireLoop: true,
    })
    expect(res.passed).toBe(true)
    expect(res.loopMissing).toBe(false)
  })
})

describe('[Phase 8] requireLoop enforcement (blocks)', () => {
  const noLoop: CodeNode[] = [
    { type: 'print', slots: { value: [{ type: 'num', fields: { value: 0 } }] } },
    { type: 'print', slots: { value: [{ type: 'num', fields: { value: 1 } }] } },
    { type: 'print', slots: { value: [{ type: 'num', fields: { value: 2 } }] } },
  ]
  const withLoop: CodeNode[] = [
    {
      type: 'for_each',
      slots: {
        var: [{ type: 'var', fields: { name: 'i' } }],
        iter: [
          {
            type: 'range_call',
            slots: {
              start: [{ type: 'num', fields: { value: 0 } }],
              stop: [{ type: 'num', fields: { value: 3 } }],
            },
          },
        ],
        body: [{ type: 'print', slots: { value: [{ type: 'var', fields: { name: 'i' } }] } }],
      },
    },
  ]

  it('fails correct output assembled from individual prints', async () => {
    const runner = constRunner(OUT)
    const res = await gradeBlocks(noLoop, OUT, runner, { requireLoop: true })
    expect(res.correct).toBe(false)
    expect(res.loopMissing).toBe(true)
  })

  it('passes correct output produced by a loop', async () => {
    const runner: PythonRunner = async (source) => ({
      stdout: source === compileToSource(withLoop) ? OUT : '<unhandled>',
      error: null,
    })
    const res = await gradeBlocks(withLoop, OUT, runner, { requireLoop: true })
    expect(res.correct).toBe(true)
    expect(res.loopMissing).toBe(false)
  })
})
