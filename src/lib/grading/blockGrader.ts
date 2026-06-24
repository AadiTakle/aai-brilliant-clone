import { compileToSource } from '../blocks/compiler'
import type { CodeNode } from '../blocks/definitions'
import { missingConstructsNode } from '../blocks/analysis'
import { effectiveConstructs, type Construct } from './constructCheck'
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
  /** Required constructs missing even though the output is correct. */
  missingConstructs: Construct[]
  /** True when the output is right but the program is missing a required loop (legacy). */
  loopMissing: boolean
}

export async function gradeBlocks(
  program: CodeNode[],
  expectedOutput: string,
  runner: PythonRunner = runPython,
  options: { requireLoop?: boolean; requiredConstructs?: Construct[] } = {},
): Promise<BlockGradeResult> {
  const { source, stdout, error } = await runBlocks(program, runner)
  const graded = gradeOutput(stdout, expectedOutput)
  const outputCorrect = graded.correct && !error
  const required = effectiveConstructs(options)
  const missingConstructs = outputCorrect ? missingConstructsNode(program, required) : []
  // A runtime error never counts as correct; nor does a missing required construct.
  return {
    ...graded,
    correct: outputCorrect && missingConstructs.length === 0,
    source,
    error,
    missingConstructs,
    loopMissing: missingConstructs.includes('loop'),
  }
}
