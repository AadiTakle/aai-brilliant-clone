// Chooses the Apply questions for a lesson's Mastery Challenge. With AI disabled
// (or for a forceStaticApply lesson like L9) it returns the lesson's authored
// static Apply. With AI enabled it asks the callable for questions weighted
// toward the concepts the learner missed, then GUARDS the result: each question's
// python_sandbox config must parse, every test case must carry feedback, and the
// model's own reference solution must actually pass its test cases (and required
// constructs) when run in Pyodide. Any failure falls back to the static Apply, so
// the challenge is always solvable whether AI is on, off, or flaky.

import { httpsCallable } from 'firebase/functions'
import { functions } from '../../firebase/config'
import type {
  MasteryApplyQuestion,
  MasteryChallengeSpec,
  MasteryConcept,
} from '../../content/mastery'
import type { PythonRunner } from '../pyodide/runner'
import type { MasteryApplySet } from './attempt'
import { desiredApplyCount, struggledConcepts } from './attempt'
import { acceptQuestion, type GeneratedApplyQuestion } from './acceptApply'

// Re-exported so existing importers (and tests) keep getting it from here.
export type { GeneratedApplyQuestion } from './acceptApply'

/** The Apply stage uses AI only when generation is routed to the callable backend. */
export function masteryAiEnabled(): boolean {
  return import.meta.env.VITE_AI_BACKEND === 'callable'
}

// Dev-only trace of the Apply-generation decision path. Lets you see in the
// browser console exactly why a challenge used AI vs. the static fallback
// (function not deployed, model refused, self-test failed, etc.). Silent in
// production builds.
function dbg(event: string, detail?: unknown): void {
  if (import.meta.env.DEV) {
    if (detail === undefined) console.info(`[mastery:apply] ${event}`)
    else console.info(`[mastery:apply] ${event}`, detail)
  }
}

export type MasteryGenResult =
  | { accepted: true; questions: GeneratedApplyQuestion[] }
  | { accepted: false; reason?: string }

export interface MasteryGenRequest {
  lessonId: string
  struggledConcepts: string[]
  count: number
}

export interface MasteryGenerator {
  generate(req: MasteryGenRequest): Promise<MasteryGenResult>
}

const callableMasteryGenerator: MasteryGenerator = {
  async generate(req) {
    const fn = httpsCallable<MasteryGenRequest, MasteryGenResult>(functions, 'generateMasteryQuestions')
    const res = await fn(req)
    return res.data
  },
}

export interface GenerateApplyOptions {
  generator?: MasteryGenerator
  /** Pyodide runner for the self-test; defaults to the real one inside gradePython. */
  runner?: PythonRunner
  /** Override the AI gate (tests). Defaults to masteryAiEnabled(). */
  enabled?: boolean
}

export async function generateApply(
  spec: MasteryChallengeSpec,
  missedConcepts: MasteryConcept[],
  opts: GenerateApplyOptions = {},
): Promise<MasteryApplySet> {
  const enabled = opts.enabled ?? masteryAiEnabled()
  const fallback: MasteryApplySet = { source: 'static', questions: spec.applyFallback }

  if (!enabled) {
    dbg('static fallback: AI disabled (VITE_AI_BACKEND !== "callable")')
    return fallback
  }
  if (spec.forceStaticApply) {
    dbg(`static fallback: ${spec.lessonId} is forceStaticApply (no AI by design)`)
    return fallback
  }

  const generator = opts.generator ?? callableMasteryGenerator
  const concepts = struggledConcepts(spec, missedConcepts)
  const count = desiredApplyCount(missedConcepts)

  try {
    dbg(`calling generateMasteryQuestions`, { lessonId: spec.lessonId, concepts, count })
    const res = await generator.generate({
      lessonId: spec.lessonId,
      struggledConcepts: concepts,
      count,
    })
    if (!res.accepted) {
      dbg('static fallback: model refused', res.reason)
      return fallback
    }

    const questions: MasteryApplyQuestion[] = []
    for (const q of res.questions ?? []) {
      const accepted = await acceptQuestion(q, opts.runner)
      if (accepted.ok) questions.push(accepted.question)
      else dbg('rejected an AI question', accepted.reason)
    }
    if (questions.length === 0) {
      dbg('static fallback: no AI questions survived validation/self-test')
      return fallback
    }
    dbg(`using ${questions.length} AI question(s)`)
    return { source: 'ai', questions }
  } catch (err) {
    // The most common cause here is the callable not being deployed (the call
    // rejects almost instantly with functions/not-found) or App Check failing.
    const code = (err as { code?: string })?.code
    const message = (err as { message?: string })?.message
    dbg('static fallback: generateMasteryQuestions threw', { code, message })
    return fallback
  }
}
