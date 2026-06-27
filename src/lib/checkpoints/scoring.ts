// PURE answer-once scoring for a Mastery Checkpoint. Given the per-question
// outcomes, decide whether the learner passed. A pass requires BOTH:
//   - overall:    totalCorrect / totalAsked >= spec.overallThreshold
//   - per-concept: every tested concept clears its ratio floor,
//                  required = ceil(asked * spec.perConceptFloorRatio), capped at asked.
// No storage, no AI — just arithmetic over the supplied answers.

import type { MasteryConcept } from '../../content/mastery'
import type { CheckpointSpec } from '../../content/checkpoints/types'

// One graded answer: which concept the question tested and whether it was right.
export interface CheckpointAnswer {
  concept: MasteryConcept
  correct: boolean
}

// Per-concept tally and whether it cleared the floor.
export interface ConceptScore {
  concept: MasteryConcept
  asked: number
  correct: number
  required: number
  passed: boolean
}

// The full graded result of a checkpoint attempt.
export interface CheckpointResult {
  totalAsked: number
  totalCorrect: number
  overall: number
  overallPassed: boolean
  concepts: ConceptScore[]
  perConceptPassed: boolean
  passed: boolean
}

/**
 * Scores a checkpoint attempt. Answers are grouped by concept; each concept must
 * clear its ratio floor and the overall percentage must clear the threshold.
 */
export function scoreCheckpoint(
  spec: CheckpointSpec,
  answers: CheckpointAnswer[],
): CheckpointResult {
  const tallies = new Map<MasteryConcept, { asked: number; correct: number }>()
  for (const answer of answers) {
    const tally = tallies.get(answer.concept) ?? { asked: 0, correct: 0 }
    tally.asked += 1
    if (answer.correct) tally.correct += 1
    tallies.set(answer.concept, tally)
  }

  const concepts: ConceptScore[] = []
  for (const [concept, { asked, correct }] of tallies) {
    const required = Math.min(asked, Math.ceil(asked * spec.perConceptFloorRatio))
    concepts.push({ concept, asked, correct, required, passed: correct >= required })
  }

  const totalAsked = answers.length
  const totalCorrect = answers.reduce((n, a) => (a.correct ? n + 1 : n), 0)
  const overall = totalAsked === 0 ? 0 : totalCorrect / totalAsked
  const overallPassed = overall >= spec.overallThreshold
  const perConceptPassed = concepts.every((c) => c.passed)

  return {
    totalAsked,
    totalCorrect,
    overall,
    overallPassed,
    concepts,
    perConceptPassed,
    passed: overallPassed && perConceptPassed,
  }
}
