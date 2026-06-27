// Pure spaced-repetition + rating model for Daily Challenges. No firebase here —
// the client uses it to decide which concepts are due and to preview outcomes,
// and functions/src/dailySchedule.ts mirrors it server-side for the trusted write
// (exactly as functions/src/rewards.ts mirrors the progress models).
//
// Tuned for ~5th–7th graders: an EXPANDING interval (research puts the optimal
// gap at ~10–20% of the retention horizon; ~1-week spacing helps this age, and
// overshooting hurts far less than undershooting), with missed items resurfacing
// the next day.

import type { MasteryConcept } from '../../content/mastery'
import type { ConceptMastery } from './types'
import { addDays, dayDiff } from '../progress/streak'

// Re-exported so callers schedule against the same day math the streak uses.
export { addDays, dayDiff }

/** Expanding review gaps in days; correct answers climb the ladder, a miss drops
 *  back to the first rung. */
export const INTERVALS = [1, 3, 7, 16, 35]

/** A correct answer at or under this is "fast" (a fluency signal, never a reward). */
export const FAST_MS = 8000
/** Above this we assume the learner walked away, so the answer is never "fast". */
export const AFK_MS = 120000

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value))
}

/**
 * The next spacing gap: on a correct answer, the first INTERVALS rung strictly
 * above the current gap (capped at the longest); on a wrong answer, reset to 1 so
 * the missed concept comes back tomorrow.
 */
export function nextInterval(currentDays: number, correct: boolean): number {
  if (!correct) return 1
  const next = INTERVALS.find((d) => d > currentDays)
  return next ?? INTERVALS[INTERVALS.length - 1]
}

/**
 * Apply one review outcome to a concept's record.
 *
 * Correctness drives strength: a correct answer closes 20% of the gap to 1, a
 * wrong answer halves it. Speed is ONLY a fluency signal — a fast, correct answer
 * on an ALREADY-STRONG concept (prev.strength >= 0.8) nudges strength up a little
 * and extends the fast streak. SPEED MUST NEVER DECREASE STRENGTH and a slow
 * answer is never penalized: a slow-but-correct review earns the full correct
 * bump, just no fluency bonus.
 */
export function updateConcept(
  prev: ConceptMastery,
  outcome: { correct: boolean; fast: boolean },
  today: string,
): ConceptMastery {
  const { correct, fast } = outcome

  let strength = correct ? prev.strength + (1 - prev.strength) * 0.2 : prev.strength * 0.5
  // Default 0 resets the fast streak for the common cases (slow-correct,
  // not-yet-strong, or wrong); only the fluency bonus below revives it.
  let fastCorrectStreak = 0

  if (correct && fast && prev.strength >= 0.8) {
    // Fluency bonus: the ONLY place speed touches strength, and it only ever adds.
    strength = Math.min(1, strength + 0.05)
    fastCorrectStreak = prev.fastCorrectStreak + 1
  }

  const intervalDays = nextInterval(prev.intervalDays, correct)

  return {
    strength,
    seen: prev.seen + 1,
    correct: prev.correct + (correct ? 1 : 0),
    wrong: prev.wrong + (correct ? 0 : 1),
    lastSeenAt: today,
    intervalDays,
    dueAt: addDays(today, intervalDays),
    fastCorrectStreak,
  }
}

/**
 * How urgently a concept should be reviewed today. A never-seen concept is highly
 * due (constant 2). Otherwise urgency grows with how far past its interval it is
 * (capped at 1.5x) and with how weak it is, so an overdue + weak concept outranks
 * a just-reviewed one (which scores ~0).
 */
export function priority(rec: ConceptMastery | undefined, today: string): number {
  if (!rec) return 2
  const overdue = dayDiff(rec.lastSeenAt, today) / Math.max(1, rec.intervalDays)
  const base = clamp(overdue, 0, 1.5)
  return base * (1 + (1 - rec.strength))
}

/**
 * The `n` most-due concepts for today, highest priority first. Ties keep the
 * given order (stable sort). The caller shuffles the chosen items for
 * presentation so concepts interleave.
 */
export function selectDailyConcepts(
  store: Record<string, ConceptMastery | undefined>,
  all: MasteryConcept[],
  today: string,
  n: number,
): MasteryConcept[] {
  return [...all]
    .sort((a, b) => priority(store[b], today) - priority(store[a], today))
    .slice(0, Math.max(0, n))
}
