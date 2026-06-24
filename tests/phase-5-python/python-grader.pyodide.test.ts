import { describe, it, expect, beforeAll } from 'vitest'
import { loadPyodideRunner } from '../../src/lib/pyodide/runner'
import { gradePython } from '../../src/lib/grading/pythonGrader'

// [Phase 5] Pyodide integration: real stdin injection + per-case grading.
// Runs under vitest.pyodide.config.ts (`npm run test:pyodide`).
describe('[Phase 5] python grader (Pyodide)', () => {
  beforeAll(async () => {
    await loadPyodideRunner()
  })

  it('injects stdin and grades each case', async () => {
    const source = 'n = int(input())\nfor i in range(n):\n    print("Hi")'
    const result = await gradePython(source, [
      { stdin: '3', expectedStdout: 'Hi\nHi\nHi' },
      { stdin: '1', expectedStdout: 'Hi' },
    ])
    expect(result.passed).toBe(true)
  })

  it('fails a wrong solution on the differing case', async () => {
    // Off-by-one: prints n+1 lines.
    const source = 'n = int(input())\nfor i in range(n + 1):\n    print(i)'
    const result = await gradePython(source, [
      { stdin: '3', expectedStdout: '1\n2\n3' },
    ])
    expect(result.passed).toBe(false)
  })
})
