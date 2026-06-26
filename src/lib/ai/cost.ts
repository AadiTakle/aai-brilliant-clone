// Economics for AI-generated custom lessons. Kept as pure helpers so the
// pricing/affordability rules are unit-testable without Firestore.

/** Sparks charged to generate one custom lesson. */
export const CUSTOM_LESSON_COST = 500

/**
 * High SAFETY ceiling on generated lesson length — not a pedagogical limit. A
 * lesson's length is governed by its single topic (the generator has no step
 * budget); this only stops a runaway/abusive payload from being saved.
 */
export const MAX_CUSTOM_LESSON_STEPS = 50

export function canAfford(totalPoints: number, cost: number = CUSTOM_LESSON_COST): boolean {
  return totalPoints >= cost
}

/**
 * Returns the new balance after spending `cost`. Throws if the learner cannot
 * afford it (fails closed) — callers should check `canAfford` first for UX.
 */
export function applySpend(totalPoints: number, cost: number = CUSTOM_LESSON_COST): number {
  if (totalPoints < cost) {
    throw new Error('NOT_ENOUGH_SPARKS')
  }
  return totalPoints - cost
}
