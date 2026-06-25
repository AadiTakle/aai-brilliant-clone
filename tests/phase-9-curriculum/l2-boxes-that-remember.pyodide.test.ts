import { describe, it, expect, beforeAll } from 'vitest'
import { loadPyodideRunner } from '../../src/lib/pyodide/runner'
import { gradeBlocks } from '../../src/lib/grading/blockGrader'
import { getLesson } from '../../src/content/loader'
import type { CodeNode } from '../../src/lib/blocks/definitions'

// [L2] The locked block steps require a learner edit, so they don't belong in
// the run-only list. Instead we apply the intended edit and confirm the SOLVED
// program produces the step's expected output under real Python.
describe('[L2] locked block steps are solvable (Pyodide)', () => {
  beforeAll(async () => {
    await loadPyodideRunner()
  })

  // Deep clone + edit the value leaf of the nth assign block.
  function setAssignValue(nodes: CodeNode[], index: number, value: string | number): CodeNode[] {
    const cloned: CodeNode[] = JSON.parse(JSON.stringify(nodes))
    const assigns = cloned.filter((n) => n.type === 'assign')
    const leaf = assigns[index].slots!.value[0]
    leaf.fields = { ...leaf.fields, value }
    return cloned
  }

  it('2.2b: changing the stored text to "Hello" prints Hello', async () => {
    const lesson = getLesson('l2-boxes-that-remember')!
    const step = lesson.steps.find((s) => s.id === 'store-and-print-text')!
    if (step.type !== 'block_problem') throw new Error('not a block problem')
    const solved = setAssignValue(step.config.initial as CodeNode[], 0, 'Hello')
    const res = await gradeBlocks(solved, step.config.expectedOutput!, undefined, {
      requiredConstructs: step.config.requiredConstructs,
      requirePrintVar: step.config.requirePrintVar,
    })
    expect(res.correct).toBe(true)
  })

  it('2.2b: printing the literal "Hello" (skipping the variable) does NOT pass', async () => {
    const lesson = getLesson('l2-boxes-that-remember')!
    const step = lesson.steps.find((s) => s.id === 'store-and-print-text')!
    if (step.type !== 'block_problem') throw new Error('not a block problem')
    // Simulate the bypass: leave word = "Hi" and type "Hello" straight into the
    // print's editable leaf (a var leaf whose name becomes the verbatim source).
    const bypass: CodeNode[] = JSON.parse(JSON.stringify(step.config.initial))
    const printArg = bypass.find((n) => n.type === 'print')!.slots!.value[0]
    printArg.fields = { name: '"Hello"' }
    const res = await gradeBlocks(bypass, step.config.expectedOutput!, undefined, {
      requiredConstructs: step.config.requiredConstructs,
      requirePrintVar: step.config.requirePrintVar,
    })
    // printVarMissing only fires when the OUTPUT already matched, so this both
    // proves the bypass produced "Hello" and that it was still rejected.
    expect(res.printVarMissing).toBe(true)
    expect(res.correct).toBe(false)
  })

  it('2.3: changing the SECOND assignment to 9 makes n end at 9', async () => {
    const lesson = getLesson('l2-boxes-that-remember')!
    const step = lesson.steps.find((s) => s.id === 'last-value-wins')!
    if (step.type !== 'block_problem') throw new Error('not a block problem')
    const solved = setAssignValue(step.config.initial as CodeNode[], 1, 9)
    const res = await gradeBlocks(solved, step.config.expectedOutput!, undefined, {
      requiredConstructs: step.config.requiredConstructs,
    })
    expect(res.correct).toBe(true)
  })
})
