// Server-authoritative copy of the Daily Challenge scheduling + rating model.
// This is the trusted twin of src/lib/daily/schedule.ts + types.ts: the client
// may compute the same numbers for an optimistic preview, but the values that
// actually move a learner's strength/Sparks are produced HERE, inside the Cloud
// Function, where they cannot be forged. Kept dependency-free (exactly like
// functions/src/rewards.ts mirrors the progress models).

export interface ConceptMastery {
  strength: number
  seen: number
  correct: number
  wrong: number
  lastSeenAt: string
  intervalDays: number
  dueAt: string
  fastCorrectStreak: number
}

/** A brand-new concept: zero strength/history, due now, ready for the 1-day rung. */
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

/** Expanding review gaps in days; mirrors the client INTERVALS ladder. */
export const INTERVALS = [1, 3, 7, 16, 35]

/** Sparks per correctly-answered daily question. ACCURACY ONLY — never speed. */
export const DAILY_SPARKS_PER_CORRECT = 50

/** Anti-forge ceiling on a single day's reported answers (a daily set is ~5). */
export const MAX_DAILY_RESULTS = 20

/** A single reported answer from the client. */
export interface DailyResult {
  concept: string
  correct: boolean
  fast: boolean
}

/** Whole-day difference between two YYYY-MM-DD strings (toISO − fromISO). */
export function dayDiff(fromISO: string, toISO: string): number {
  const [fy, fm, fd] = fromISO.split('-').map(Number)
  const [ty, tm, td] = toISO.split('-').map(Number)
  const from = Date.UTC(fy, fm - 1, fd)
  const to = Date.UTC(ty, tm - 1, td)
  return Math.round((to - from) / 86_400_000)
}

/** Add `n` calendar days to a YYYY-MM-DD string (UTC math, TZ-independent). */
export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  date.setUTCDate(date.getUTCDate() + n)
  const yy = date.getUTCFullYear()
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(date.getUTCDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

/** Next gap: climb the ladder on correct (capped), reset to 1 on wrong. */
export function nextInterval(currentDays: number, correct: boolean): number {
  if (!correct) return 1
  const next = INTERVALS.find((day) => day > currentDays)
  return next ?? INTERVALS[INTERVALS.length - 1]
}

/**
 * Apply one review outcome. Correctness drives strength (correct closes 20% of
 * the gap to 1, wrong halves it); speed is ONLY a fluency signal that nudges an
 * already-strong concept up a touch. SPEED MUST NEVER DECREASE STRENGTH, and a
 * slow-but-correct answer is never penalized. Identical to the client model.
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
 * Trusted Spark award for a day's answers: the correct count (capped) times the
 * per-correct rate. `fast` is deliberately ignored — speed can NEVER affect the
 * balance, only accuracy can.
 */
export function awardDailySparks(results: DailyResult[]): number {
  const capped = results.slice(0, MAX_DAILY_RESULTS)
  const correct = capped.filter((r) => r.correct).length
  return correct * DAILY_SPARKS_PER_CORRECT
}

/**
 * One-challenge-per-day gate: when today's marker already exists the award is a
 * no-op (idempotent); otherwise grant accuracy-based Sparks. Pure so the
 * idempotency + accuracy-only rules are unit-testable without the emulator.
 */
export function dailyAward(
  alreadyDone: boolean,
  results: DailyResult[],
): { awarded: boolean; sparks: number } {
  if (alreadyDone) return { awarded: false, sparks: 0 }
  return { awarded: true, sparks: awardDailySparks(results) }
}
