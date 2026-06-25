import { describe, it, expect, beforeAll } from 'vitest'
import { loadPyodideRunner } from '../../src/lib/pyodide/runner'
import { gradePython } from '../../src/lib/grading/pythonGrader'
import { getLesson } from '../../src/content/loader'
import type { Step } from '../../src/content/schemas'

function pyStep(id: string): Extract<Step, { type: 'python_sandbox' }> {
  const lesson = getLesson('l6-over-and-over-again')!
  const step = lesson.steps.find((s) => s.id === id)!
  if (!step || step.type !== 'python_sandbox') throw new Error(`not a python sandbox: ${id}`)
  return step
}

async function grade(id: string, source: string) {
  const step = pyStep(id)
  return gradePython(source, step.config.testCases, undefined, {
    requireLoop: step.config.requireLoop,
    requiredConstructs: step.config.requiredConstructs,
  })
}

describe('[L6] Over and Over Again (Pyodide)', () => {
  beforeAll(async () => {
    await loadPyodideRunner()
  })

  it('6.2c fix-the-loop-indent: flush-left starter errors; indenting the body prints 1..5', async () => {
    const step = pyStep('fix-the-loop-indent')
    const starterRun = await grade('fix-the-loop-indent', step.config.starterCode)
    expect(starterRun.passed).toBe(false)
    expect(starterRun.results[0].error ?? '').toMatch(/indent/i)

    const fixed = step.config.starterCode.replace(/^print\(/m, '    print(')
    const fixedRun = await grade('fix-the-loop-indent', fixed)
    expect(fixedRun.passed).toBe(true)
  })

  it('6.6 print-hi-loop: a real loop passes; hardcoded prints are rejected (loop missing)', async () => {
    const looped = 'for i in range(4):\n    print("Hi")'
    const ok = await grade('print-hi-loop', looped)
    expect(ok.passed).toBe(true)

    const hardcoded = 'print("Hi")\nprint("Hi")\nprint("Hi")\nprint("Hi")'
    const cheat = await grade('print-hi-loop', hardcoded)
    expect(cheat.passed).toBe(false)
    expect(cheat.missingConstructs).toContain('loop')
  })

  it('6.6 print-hi-loop: a loop that runs the wrong number of times fails', async () => {
    const wrong = await grade('print-hi-loop', 'for i in range(3):\n    print("Hi")')
    expect(wrong.passed).toBe(false)
  })

  it('6.7 count-1-to-n: range(1, n + 1) prints 1..n; off-by-one range(n) fails', async () => {
    const step = pyStep('count-1-to-n')
    const correct = step.config.starterCode + '\nfor i in range(1, n + 1):\n    print(i)'
    const ok = await grade('count-1-to-n', correct)
    expect(ok.passed).toBe(true)

    const offByOne = step.config.starterCode + '\nfor i in range(n):\n    print(i)'
    const bad = await grade('count-1-to-n', offByOne)
    expect(bad.passed).toBe(false)
  })
})
