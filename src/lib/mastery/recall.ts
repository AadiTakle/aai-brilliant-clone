// Builds the recall questions a Mastery Challenge actually SHOWS. Instead of
// rendering the authored spec list verbatim, we draw topic-specific questions
// from the central question bank for the lesson's concept(s) — preserving the
// authored COUNT and concept mix exactly (so the spec stays valid and the server
// Spark clamp, which keys off recall length, is unchanged) — and randomize each
// question's answer order.

import type {
  MasteryChallengeSpec,
  MasteryConcept,
  MasteryRecallQuestion,
} from '../../content/mastery'
import { bankQuestionsForConcept } from '../../content/questionBank'
import { sampleN, shuffle, shuffleChoices } from '../checkpoints/itemBank'

/**
 * How many recall questions of each concept this lesson asks today, read straight
 * off the authored spec. Keeping these per-concept counts means the drawn set has
 * the same total length and concept spread the lesson has always had.
 */
function conceptCounts(spec: MasteryChallengeSpec): Map<MasteryConcept, number> {
  const counts = new Map<MasteryConcept, number>()
  for (const q of spec.recall) counts.set(q.concept, (counts.get(q.concept) ?? 0) + 1)
  return counts
}

/**
 * The recall questions to present for a lesson's Mastery Challenge.
 *
 * For ordinary lessons (L1-L8): sample, per concept, the same number of questions
 * the authored spec uses, drawn from the bank — so it is topic-specific to that
 * lesson, the count is unchanged, and only that lesson's concept(s) appear.
 *
 * For the L9 finale (forceStaticApply): keep the AUTHORED FizzBuzz recall as-is —
 * it is intentionally NOT sourced from the neutral bank.
 *
 * Either way, every question's answer order is randomized. `rng` is injectable so
 * tests can make the draw deterministic.
 */
export function buildRecallForChallenge(
  spec: MasteryChallengeSpec,
  rng: () => number = Math.random,
): MasteryRecallQuestion[] {
  if (spec.forceStaticApply) {
    return spec.recall.map((q) => shuffleChoices(q, rng))
  }

  const drawn: MasteryRecallQuestion[] = []
  for (const [concept, count] of conceptCounts(spec)) {
    for (const question of sampleN(bankQuestionsForConcept(concept), count, rng)) {
      drawn.push(question)
    }
  }
  // Interleave the concepts, then randomize each question's answer order.
  return shuffle(drawn, rng).map((q) => shuffleChoices(q, rng))
}
