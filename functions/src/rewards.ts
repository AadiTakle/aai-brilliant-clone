// Server-authoritative reward math. These are the trusted copies of the client
// scoring/streak rules (src/lib/progress/points.ts + streak.ts). The client may
// still compute the same numbers for optimistic UI, but the values that actually
// move a learner's Spark balance are produced here, inside the Cloud Function,
// where they cannot be forged.

import type { BuiltinLessonMeta, BuiltinMasteryMeta } from './builtinLessonMeta.js'

const ATTEMPTS_TO_FLOOR = 5

/** Sparks granted per correctly-answered mastery question (2x a normal step). */
export const MASTERY_SPARKS_PER_QUESTION = 200

/**
 * Server-trusted Spark award for clearing a lesson's Mastery Challenge: the
 * learner's reported correctCount, clamped to the lesson's authoritative max
 * (recall + apply questions), times the per-question rate. Clamping is the
 * anti-forge guard — a client can't claim more correct answers than exist.
 */
export function awardMastery(meta: BuiltinMasteryMeta, correctCount: number): number {
  const safe = Number.isFinite(correctCount) ? Math.max(0, Math.floor(correctCount)) : 0
  const capped = Math.min(safe, meta.maxQuestions)
  return capped * MASTERY_SPARKS_PER_QUESTION
}

/** Linear points decay: full base on a clean solve, falling to minPoints by the
 *  5th wrong attempt. Mirrors src/lib/progress/points.ts. */
export function computeAwardedPoints(basePoints: number, minPoints: number, wrongAttempts: number): number {
  const decrement = (basePoints - minPoints) / ATTEMPTS_TO_FLOOR
  const raw = basePoints - Math.max(0, wrongAttempts) * decrement
  return Math.max(minPoints, Math.round(raw))
}

/** Whole-day difference between two YYYY-MM-DD strings (toISO − fromISO). */
export function dayDiff(fromISO: string, toISO: string): number {
  const [fy, fm, fd] = fromISO.split('-').map(Number)
  const [ty, tm, td] = toISO.split('-').map(Number)
  const from = Date.UTC(fy, fm - 1, fd)
  const to = Date.UTC(ty, tm - 1, td)
  return Math.round((to - from) / 86_400_000)
}

export interface StreakState {
  currentStreak: number
  lastActiveDate: string | null
}

/** Same rules as src/lib/progress/streak.ts: same day → unchanged; next day or a
 *  single forgiven gap → +1; longer gap → reset to 1. */
export function updateStreak(state: StreakState, today: string): StreakState {
  if (!state.lastActiveDate) return { currentStreak: 1, lastActiveDate: today }
  const diff = dayDiff(state.lastActiveDate, today)
  if (diff <= 0) return state
  if (diff <= 2) return { currentStreak: state.currentStreak + 1, lastActiveDate: today }
  return { currentStreak: 1, lastActiveDate: today }
}

/** The server's trusted per-lesson reward ledger (collection `rewards`). */
export interface RewardLedger {
  /** stepId → Sparks already granted for it (idempotency + anti-farm record). */
  awarded: Record<string, number>
  /** True once the whole-lesson completion bonus (streak/activity) was applied. */
  completed: boolean
}

export function emptyLedger(): RewardLedger {
  return { awarded: {}, completed: false }
}

/** A lesson is complete once every GRADED step has been awarded. */
export function isLessonComplete(meta: BuiltinLessonMeta, awarded: Record<string, number>): boolean {
  const graded = meta.steps.filter((s) => s.graded)
  if (graded.length === 0) return false
  return graded.every((s) => awarded[s.id] !== undefined)
}

export interface AwardOutcome {
  /** Sparks to add to the lifetime balance (0 if the step was already awarded). */
  pointsDelta: number
  /** The ledger's awarded map after applying this step. */
  awarded: Record<string, number>
  /** True when this call newly completed the lesson (apply the streak/activity bump). */
  newlyCompleted: boolean
}

/**
 * Pure reducer: given the authoritative lesson meta, the current awarded map, the
 * stepId, and the learner's wrong-attempt count, returns how many Sparks to grant
 * now. Idempotent per step (a completed step never pays out twice), and a stepId
 * absent from the lesson meta is rejected by the caller before this runs.
 */
export function awardStep(
  meta: BuiltinLessonMeta,
  ledger: RewardLedger,
  stepId: string,
  wrongAttempts: number,
): AwardOutcome {
  const step = meta.steps.find((s) => s.id === stepId)
  if (!step) {
    return { pointsDelta: 0, awarded: ledger.awarded, newlyCompleted: false }
  }
  if (ledger.awarded[stepId] !== undefined) {
    return { pointsDelta: 0, awarded: ledger.awarded, newlyCompleted: false }
  }

  // Graded steps decay with wrong attempts; ungraded steps grant their full base
  // on first completion (matches the client reducer).
  const points = step.graded
    ? computeAwardedPoints(step.points, step.minPoints, wrongAttempts)
    : step.points

  const awarded = { ...ledger.awarded, [stepId]: points }
  const newlyCompleted = !ledger.completed && isLessonComplete(meta, awarded)
  return { pointsDelta: points, awarded, newlyCompleted }
}
