import { runPython, type PythonRunner } from '../pyodide/runner'
import { normalizeOutput } from './outputGrader'
import type { PythonTestCase } from '../../problem-types/python_sandbox/schema'

export interface TestCaseResult {
  passed: boolean
  stdin: string
  expected: string
  actual: string
  error: string | null
  feedback?: string
}

export interface PythonGradeResult {
  passed: boolean
  results: TestCaseResult[]
}

/** A python step is graded only if it defines at least one test case. */
export function isPythonGraded(testCases: PythonTestCase[]): boolean {
  return testCases.length > 0
}

/**
 * Runs the user's source once per test case (injecting that case's stdin) and
 * compares stdout. Returns per-test pass/fail plus the authored feedback.
 */
export async function gradePython(
  source: string,
  testCases: PythonTestCase[],
  runner: PythonRunner = runPython,
): Promise<PythonGradeResult> {
  const results: TestCaseResult[] = []
  for (const tc of testCases) {
    const { stdout, error } = await runner(source, { stdin: tc.stdin })
    const passed = !error && normalizeOutput(stdout) === normalizeOutput(tc.expectedStdout)
    results.push({
      passed,
      stdin: tc.stdin,
      expected: tc.expectedStdout,
      actual: stdout,
      error,
      feedback: tc.feedback,
    })
  }
  return { passed: results.length > 0 && results.every((r) => r.passed), results }
}
