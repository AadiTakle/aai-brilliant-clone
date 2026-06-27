// Validation + self-test for a single AI-generated mastery "Apply" question.
// Kept in its own Firebase-free module so it can be reused by BOTH the client
// generation path (generateApply.ts) and the manual prompt-engineering probe
// (scripts/probe-mastery.ts) — the probe must apply the exact same guard the
// app does, without importing firebase/config (App Check is browser-only).

import {
  masteryApplyQuestionSchema,
  type MasteryApplyQuestion,
  type MasteryConcept,
} from '../../content/mastery'
import { gradePython } from '../grading/pythonGrader'
import type { PythonRunner } from '../pyodide/runner'

/** The raw shape the model returns for one Apply question (pre-validation). */
export interface GeneratedApplyQuestion {
  prompt: string
  starterCode?: string
  requiredConstructs?: ('loop' | 'modulo' | 'conditional')[]
  disallowedNames?: string[]
  requiredNames?: string[]
  forbidHardcodedOutput?: boolean
  testCases: { stdin?: string; expectedStdout: string; feedback?: string }[]
  referenceSolution: string
  concepts?: MasteryConcept[]
}

export type AcceptResult =
  | { ok: true; question: MasteryApplyQuestion }
  | { ok: false; reason: string }

/**
 * Validates a model question and self-tests its reference solution. Returns the
 * clean MasteryApplyQuestion, or an explicit reason it was rejected (surfaced in
 * the dev console / probe output so a flaky model is debuggable, not silently
 * dropped).
 */
export async function acceptQuestion(
  q: GeneratedApplyQuestion,
  runner?: PythonRunner,
): Promise<AcceptResult> {
  const parsed = masteryApplyQuestionSchema.safeParse({
    prompt: q.prompt,
    starterCode: q.starterCode ?? '',
    testCases: (q.testCases ?? []).map((tc) => ({
      stdin: tc.stdin ?? '',
      expectedStdout: tc.expectedStdout,
      feedback: tc.feedback,
    })),
    requiredConstructs: q.requiredConstructs ?? [],
    disallowedNames: q.disallowedNames ?? [],
    requiredNames: q.requiredNames ?? [],
    forbidHardcodedOutput: q.forbidHardcodedOutput ?? false,
    concepts: q.concepts ?? [],
  })
  if (!parsed.success) {
    return { ok: false, reason: `schema: ${parsed.error.issues[0]?.message ?? 'invalid'}` }
  }
  const question = parsed.data
  if (question.testCases.length === 0) return { ok: false, reason: 'no test cases' }
  // Every test case must carry a non-empty failure hint (mastery is "pushed hard").
  if (question.testCases.some((tc) => !tc.feedback || !tc.feedback.trim())) {
    return { ok: false, reason: 'test case missing feedback' }
  }

  const ref = String(q.referenceSolution ?? '')
  if (!ref.trim()) return { ok: false, reason: 'missing referenceSolution' }

  // Self-test: the model's own solution must pass its own tests AND satisfy every
  // constraint it imposed (constructs, required/disallowed names, no hardcoding).
  // This catches questions whose expected output is wrong, whose construct demand
  // is impossible, or whose constraints contradict the only valid solution.
  const grade = await gradePython(ref, question.testCases, runner, {
    requiredConstructs: question.requiredConstructs,
    disallowedNames: question.disallowedNames,
    requiredNames: question.requiredNames,
    forbidHardcodedOutput: question.forbidHardcodedOutput,
  })
  if (!grade.passed) {
    const failedCase = grade.results.findIndex((r) => !r.passed)
    const why =
      grade.missingConstructs.length > 0
        ? `reference missing constructs: ${grade.missingConstructs.join(', ')}`
        : grade.disallowedUsed.length > 0
          ? `reference uses disallowed names: ${grade.disallowedUsed.join(', ')}`
          : grade.requiredMissing.length > 0
            ? `reference missing required names: ${grade.requiredMissing.join(', ')}`
            : grade.hardcodedOutput
              ? 'reference hardcodes the expected output'
              : `reference failed its own test case #${failedCase + 1}`
    return { ok: false, reason: `self-test: ${why}` }
  }

  return { ok: true, question }
}
