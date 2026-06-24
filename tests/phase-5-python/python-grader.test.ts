import { describe, it, expect } from 'vitest'
import { gradePython, isPythonGraded } from '../../src/lib/grading/pythonGrader'
import type { PythonRunner } from '../../src/lib/pyodide/runner'
import type { PythonTestCase } from '../../src/problem-types/python_sandbox/schema'

// A fake runner keyed on stdin, so per-case grading is testable without Pyodide.
function fakeRunner(byStdin: Record<string, string>): PythonRunner {
  return async (_source, opts) => ({ stdout: byStdin[opts?.stdin ?? ''] ?? '', error: null })
}

const cases: PythonTestCase[] = [
  { stdin: '3', expectedStdout: 'Hi\nHi\nHi' },
  { stdin: '1', expectedStdout: 'Hi', feedback: 'Use range(n).' },
]

describe('[Phase 5] python grader', () => {
  it('flags run-only steps (no test cases) as ungraded', () => {
    expect(isPythonGraded([])).toBe(false)
    expect(isPythonGraded(cases)).toBe(true)
  })

  it('passes when every case matches its stdin/stdout', async () => {
    const runner = fakeRunner({ '3': 'Hi\nHi\nHi\n', '1': 'Hi\n' })
    const result = await gradePython('source', cases, runner)
    expect(result.passed).toBe(true)
    expect(result.results.map((r) => r.passed)).toEqual([true, true])
  })

  it('fails the specific case that differs and surfaces its feedback', async () => {
    const runner = fakeRunner({ '3': 'Hi\nHi\nHi\n', '1': 'Hi\nHi\n' })
    const result = await gradePython('source', cases, runner)
    expect(result.passed).toBe(false)
    expect(result.results[0].passed).toBe(true)
    expect(result.results[1].passed).toBe(false)
    expect(result.results[1].feedback).toBe('Use range(n).')
  })

  it('treats a runtime error as a failed case', async () => {
    const runner: PythonRunner = async () => ({ stdout: '', error: 'ValueError' })
    const result = await gradePython('source', cases, runner)
    expect(result.passed).toBe(false)
    expect(result.results[0].error).toBe('ValueError')
  })
})
