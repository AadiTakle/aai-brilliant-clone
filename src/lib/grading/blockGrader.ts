import { compileToSource } from '../blocks/compiler'
import type { CodeNode } from '../blocks/definitions'
import { runPython, type PythonRunner } from '../pyodide/runner'
import { gradeOutput, type GradeResult } from './outputGrader'

export interface BlockRunResult {
  source: string
  stdout: string
  error: string | null
}

export async function runBlocks(
  program: CodeNode[],
  runner: PythonRunner = runPython,
): Promise<BlockRunResult> {
  const source = compileToSource(program)
  const { stdout, error } = await runner(source)
  return { source, stdout, error }
}

export interface BlockGradeResult extends GradeResult {
  source: string
  error: string | null
}

export async function gradeBlocks(
  program: CodeNode[],
  expectedOutput: string,
  runner: PythonRunner = runPython,
): Promise<BlockGradeResult> {
  const { source, stdout, error } = await runBlocks(program, runner)
  const graded = gradeOutput(stdout, expectedOutput)
  // A runtime error never counts as correct.
  return { ...graded, correct: graded.correct && !error, source, error }
}
