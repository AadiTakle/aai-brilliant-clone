import { describe, it, expect } from 'vitest'
import { gradeBlocks } from '../../src/lib/grading/blockGrader'
import { compileToSource } from '../../src/lib/blocks/compiler'
import type { CodeNode } from '../../src/lib/blocks/definitions'
import type { PythonRunner } from '../../src/lib/pyodide/runner'

// A fake runner that "executes" only the programs we expect, so grading can be
// tested without loading Pyodide.
function fakeRunner(map: Record<string, string>): PythonRunner {
  return async (source: string) => ({ stdout: map[source] ?? '<unhandled>', error: null })
}

const num = (value: number): CodeNode => ({ type: 'num', fields: { value } })
const str = (value: string): CodeNode => ({ type: 'str', fields: { value } })
const variable = (name = 'i'): CodeNode => ({ type: 'var', fields: { name } })
const range = (start: number, stop: number): CodeNode => ({
  type: 'range_call',
  slots: { start: [num(start)], stop: [num(stop)] },
})
const forEach = (iter: CodeNode, body: CodeNode[]): CodeNode => ({
  type: 'for_each',
  slots: { var: [variable('i')], iter: [iter], body },
})
const print = (value: CodeNode): CodeNode => ({ type: 'print', slots: { value: [value] } })

const fillBlankSolution: CodeNode[] = [forEach(range(0, 5), [print(str('Hello!'))])]
const FILL_EXPECTED = 'Hello!\nHello!\nHello!\nHello!\nHello!'

const bugfixFixed: CodeNode[] = [forEach(range(0, 5), [print(variable('i'))])]
const bugfixBroken: CodeNode[] = [forEach(range(0, 3), [print(variable('i'))])]
const BUGFIX_EXPECTED = '0\n1\n2\n3\n4'

describe('[Phase 4] block grader (fill_blank + bugfix)', () => {
  it('passes a correct fill_blank solution', async () => {
    const runner = fakeRunner({ [compileToSource(fillBlankSolution)]: FILL_EXPECTED })
    const res = await gradeBlocks(fillBlankSolution, FILL_EXPECTED, runner)
    expect(res.correct).toBe(true)
  })

  it('fails an incomplete fill_blank (loop body empty)', async () => {
    const empty: CodeNode[] = [forEach(range(0, 5), [])]
    const runner = fakeRunner({ [compileToSource(empty)]: '' })
    expect((await gradeBlocks(empty, FILL_EXPECTED, runner)).correct).toBe(false)
  })

  it('passes a fixed bugfix and fails the broken version', async () => {
    const runner = fakeRunner({
      [compileToSource(bugfixFixed)]: BUGFIX_EXPECTED,
      [compileToSource(bugfixBroken)]: '0\n1\n2',
    })
    expect((await gradeBlocks(bugfixFixed, BUGFIX_EXPECTED, runner)).correct).toBe(true)
    expect((await gradeBlocks(bugfixBroken, BUGFIX_EXPECTED, runner)).correct).toBe(false)
  })

  it('never marks a run with a runtime error as correct', async () => {
    const runner: PythonRunner = async () => ({ stdout: FILL_EXPECTED, error: 'NameError' })
    expect((await gradeBlocks(fillBlankSolution, FILL_EXPECTED, runner)).correct).toBe(false)
  })
})
