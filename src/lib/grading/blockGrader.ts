import { compileToSource } from '../blocks/compiler'
import type { CodeNode } from '../blocks/definitions'
import { usesLoopNode } from '../blocks/analysis'
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
  /** True when the output is right but the program is missing a required loop. */
  loopMissing: boolean
}

export async function gradeBlocks(
  program: CodeNode[],
  expectedOutput: string,
  runner: PythonRunner = runPython,
  options: { requireLoop?: boolean } = {},
): Promise<BlockGradeResult> {
  const { source, stdout, error } = await runBlocks(program, runner)
  const graded = gradeOutput(stdout, expectedOutput)
  const outputCorrect = graded.correct && !error
  const loopMissing = Boolean(options.requireLoop) && outputCorrect && !usesLoopNode(program)
  // A runtime error never counts as correct; nor does a missing required loop.
  return { ...graded, correct: outputCorrect && !loopMissing, source, error, loopMissing }
}
