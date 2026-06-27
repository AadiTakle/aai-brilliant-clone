// Per-concept spaced-repetition record for Daily Challenges. One document lives
// at users/{uid}/concepts/{conceptId}; it is SERVER-OWNED (written only by the
// commitDailyChallenge Cloud Function) and merely owner-readable, exactly like
// the reward ledgers. The shape is shared by the client (reads + scheduling) and
// mirrored server-side (writes), so it lives in a pure, firebase-free module.

export interface ConceptMastery {
  /** 0..1 mastery rating. Rises with correct answers, halves on a wrong one. */
  strength: number
  /** Lifetime counters across all daily reviews of this concept. */
  seen: number
  correct: number
  wrong: number
  /** Local calendar day (YYYY-MM-DD) this concept was last reviewed. */
  lastSeenAt: string
  /** Current spacing gap in days; expands along INTERVALS, resets to 1 on a miss. */
  intervalDays: number
  /** Local calendar day (YYYY-MM-DD) the concept is next due for review. */
  dueAt: string
  /** Consecutive fast+correct reviews on an already-strong concept (fluency). */
  fastCorrectStreak: number
}

/**
 * A brand-new concept the learner has never reviewed: zero strength, no history,
 * and due immediately (intervalDays 0 so the first correct review schedules the
 * shortest 1-day gap before the ladder starts expanding).
 */
export function emptyConcept(today: string): ConceptMastery {
  return {
    strength: 0,
    seen: 0,
    correct: 0,
    wrong: 0,
    lastSeenAt: today,
    intervalDays: 0,
    dueAt: today,
    fastCorrectStreak: 0,
  }
}
