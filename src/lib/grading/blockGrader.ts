import { compileToSource } from '../blocks/compiler'
import type { CodeNode } from '../blocks/definitions'
import { comparesVariable, missingConstructsNode, printsVariable } from '../blocks/analysis'
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
  /**
   * True when the output is right but the program bypassed a required printed
   * variable (e.g. printed a literal instead of the box). See `requirePrintVar`.
   */
  printVarMissing: boolean
  /**
   * True when the output is right but the required comparison does not actually
   * test the expected variable (e.g. a faked `0 == 0`). See `requireCompare`.
   */
  compareMissing: boolean
}

export async function gradeBlocks(
  program: CodeNode[],
  expectedOutput: string,
  runner: PythonRunner = runPython,
  options: {
    requireLoop?: boolean
    requiredConstructs?: Construct[]
    lenient?: boolean
    requirePrintVar?: string
    requireCompare?: { variable: string; op?: string; against?: number }
  } = {},
): Promise<BlockGradeResult> {
  const { source, stdout, error } = await runBlocks(program, runner)
  const graded = gradeOutput(stdout, expectedOutput, { lenient: options.lenient })
  const outputCorrect = graded.correct && !error
  const required = effectiveConstructs(options)
  const missingConstructs = outputCorrect ? missingConstructsNode(program, required) : []
  // Output is right and constructs are present, but the learner skipped the box
  // (printed a literal) instead of printing the required variable.
  const printVarMissing =
    outputCorrect &&
    missingConstructs.length === 0 &&
    options.requirePrintVar !== undefined &&
    !printsVariable(program, options.requirePrintVar)
  // Output is right but the comparison does not actually test the required
  // variable (e.g. a faked `0 == 0` instead of checking the box they built).
  const compareMissing =
    outputCorrect &&
    missingConstructs.length === 0 &&
    !printVarMissing &&
    options.requireCompare !== undefined &&
    !comparesVariable(
      program,
      options.requireCompare.variable,
      options.requireCompare.op,
      options.requireCompare.against,
    )
  // A runtime error never counts as correct; nor does a missing required
  // construct, a bypassed printed variable, or a faked comparison.
  return {
    ...graded,
    correct:
      outputCorrect && missingConstructs.length === 0 && !printVarMissing && !compareMissing,
    source,
    error,
    missingConstructs,
    loopMissing: missingConstructs.includes('loop'),
    printVarMissing,
    compareMissing,
  }
}
