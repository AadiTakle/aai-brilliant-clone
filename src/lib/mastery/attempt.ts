// In-progress Mastery Challenge state + pure helpers. Persisted under the
// `mastery` field of the existing progress/{uid}_{lessonId} doc so a reload
// resumes mid-challenge (and never re-generates AI Apply questions). Everything
// here is client-owned; the Spark award + the `mastered` flag are server-owned.

import type {
  MasteryApplyQuestion,
  MasteryChallengeSpec,
  MasteryConcept,
} from '../../content/mastery'

// The challenge runs as a small phase machine.
export type MasteryPhase = 'intro' | 'briefing' | 'recall' | 'apply' | 'complete'

export interface MasteryApplySet {
  /** Where the questions came from — AI generation, or the authored fallback. */
  source: 'ai' | 'static'
  questions: MasteryApplyQuestion[]
}

export interface MasteryAttempt {
  phase: MasteryPhase
  /** Recall question index -> whether the learner's FIRST answer was correct.
   *  Drives which concepts to weight the Apply stage toward. */
  recallFirstTry: Record<number, boolean>
  /** Distinct concepts the learner missed on the first try in recall. */
  missedConcepts: MasteryConcept[]
  /** The Apply questions for this attempt, cached so reload doesn't regenerate. */
  apply?: MasteryApplySet
  /** Apply question index -> whether it has been passed. */
  applyResults: Record<number, boolean>
}

export function emptyMasteryAttempt(): MasteryAttempt {
  return { phase: 'intro', recallFirstTry: {}, missedConcepts: [], applyResults: {} }
}

/** Records a recall answer. Only the FIRST answer per question is scored for
 *  concept-weighting; a wrong first try adds the question's concept to the
 *  missed set (deduped). Returns a new attempt (pure). */
export function recordRecallAnswer(
  attempt: MasteryAttempt,
  index: number,
  concept: MasteryConcept,
  correct: boolean,
): MasteryAttempt {
  if (attempt.recallFirstTry[index] !== undefined) return attempt
  const recallFirstTry = { ...attempt.recallFirstTry, [index]: correct }
  const missedConcepts =
    !correct && !attempt.missedConcepts.includes(concept)
      ? [...attempt.missedConcepts, concept]
      : attempt.missedConcepts
  return { ...attempt, recallFirstTry, missedConcepts }
}

/** Marks an Apply question passed. */
export function recordApplyPass(attempt: MasteryAttempt, index: number): MasteryAttempt {
  if (attempt.applyResults[index]) return attempt
  return { ...attempt, applyResults: { ...attempt.applyResults, [index]: true } }
}

/** The distinct concepts a lesson's recall set reviews. */
export function masteryConceptPool(spec: MasteryChallengeSpec): MasteryConcept[] {
  return Array.from(new Set(spec.recall.map((q) => q.concept)))
}

/** Concepts to target in the Apply stage: the ones the learner missed, or — if
 *  they aced recall — the lesson's whole concept pool (so Apply still reviews). */
export function struggledConcepts(
  spec: MasteryChallengeSpec,
  missed: MasteryConcept[],
): MasteryConcept[] {
  const unique = Array.from(new Set(missed))
  return unique.length > 0 ? unique : masteryConceptPool(spec)
}

/** How many Apply questions to ask: two when the learner struggled with several
 *  concepts, otherwise one. Bounded to the [1, 2] design range. */
export function desiredApplyCount(missed: MasteryConcept[]): 1 | 2 {
  return new Set(missed).size >= 2 ? 2 : 1
}

/** True once every Apply question in the set has been passed. */
export function allApplyPassed(attempt: MasteryAttempt): boolean {
  const total = attempt.apply?.questions.length ?? 0
  if (total === 0) return false
  for (let i = 0; i < total; i++) {
    if (!attempt.applyResults[i]) return false
  }
  return true
}

/** The number of correctly-answered questions to report to the server for the
 *  Spark award: every recall question (all are solved to finish) plus every
 *  passed Apply question. The server caps this at the lesson's max. */
export function masteryCorrectCount(spec: MasteryChallengeSpec, attempt: MasteryAttempt): number {
  const recall = spec.recall.length
  const applyPassed = Object.values(attempt.applyResults).filter(Boolean).length
  return recall + applyPassed
}
