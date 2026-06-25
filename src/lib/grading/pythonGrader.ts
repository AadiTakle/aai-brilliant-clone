import { runPython, type PythonRunner } from '../pyodide/runner'
import { normalizeLenient, normalizeOutput } from './outputGrader'
import {
  effectiveConstructs,
  missingConstructsSource,
  type Construct,
} from './constructCheck'
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
  /** Required constructs that are missing even though every test output passed. */
  missingConstructs: Construct[]
  /** True when all test outputs pass but a required loop is missing (legacy). */
  loopMissing: boolean
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
  options: { requireLoop?: boolean; requiredConstructs?: Construct[]; lenient?: boolean } = {},
): Promise<PythonGradeResult> {
  const normalize = options.lenient ? normalizeLenient : normalizeOutput
  const results: TestCaseResult[] = []
  for (const tc of testCases) {
    const { stdout, error } = await runner(source, { stdin: tc.stdin })
    const passed = !error && normalize(stdout) === normalize(tc.expectedStdout)
    results.push({
      passed,
      stdin: tc.stdin,
      expected: tc.expectedStdout,
      actual: stdout,
      error,
      feedback: tc.feedback,
    })
  }
  const outputsPass = results.length > 0 && results.every((r) => r.passed)
  const required = effectiveConstructs(options)
  const missingConstructs = outputsPass ? missingConstructsSource(source, required) : []
  return {
    passed: outputsPass && missingConstructs.length === 0,
    results,
    missingConstructs,
    loopMissing: missingConstructs.includes('loop'),
  }
}
