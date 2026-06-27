import { masteryChallengeSpecSchema, type MasteryChallengeSpec } from './types'
import { rawMasterySpecs } from './specs'

export * from './types'

// Lazily-validated cache so a spec is only parsed once.
const cache = new Map<string, MasteryChallengeSpec | null>()

/**
 * Returns the validated mastery-challenge spec for a lesson, or null if there is
 * no spec (or it fails validation). Every built-in lesson has a spec; custom AI
 * lessons do not (they have no mastery finale).
 */
export function getMasteryChallenge(lessonId: string): MasteryChallengeSpec | null {
  if (cache.has(lessonId)) return cache.get(lessonId) ?? null
  const raw = rawMasterySpecs[lessonId]
  if (!raw) {
    cache.set(lessonId, null)
    return null
  }
  const parsed = masteryChallengeSpecSchema.safeParse(raw)
  const value = parsed.success ? parsed.data : null
  cache.set(lessonId, value)
  return value
}

/** True when a built-in lesson has a mastery challenge. */
export function hasMasteryChallenge(lessonId: string): boolean {
  return Boolean(rawMasterySpecs[lessonId])
}

/** All lesson ids that have a mastery spec (for tests + meta generation). */
export function masteryLessonIds(): string[] {
  return Object.keys(rawMasterySpecs)
}
