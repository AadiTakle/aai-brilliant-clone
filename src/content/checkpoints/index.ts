import { checkpointSpecSchema, type CheckpointSpec } from './types'
import { rawCheckpoints } from './specs'
import { listLessons } from '../loader'
import { getMasteryChallenge, type MasteryConcept } from '../mastery'

export * from './types'

// Lazily-validated cache so a spec is only parsed once.
const cache = new Map<string, CheckpointSpec | null>()

/**
 * Returns the validated checkpoint spec for an id, or null if there is none (or
 * it fails validation).
 */
export function getCheckpoint(id: string): CheckpointSpec | null {
  if (cache.has(id)) return cache.get(id) ?? null
  const raw = rawCheckpoints[id]
  if (!raw) {
    cache.set(id, null)
    return null
  }
  const parsed = checkpointSpecSchema.safeParse(raw)
  const value = parsed.success ? parsed.data : null
  cache.set(id, value)
  return value
}

/** All valid checkpoint specs. */
export function listCheckpoints(): CheckpointSpec[] {
  return Object.keys(rawCheckpoints)
    .map((id) => getCheckpoint(id))
    .filter((c): c is CheckpointSpec => c !== null)
}

/** True when a checkpoint with this id exists. */
export function hasCheckpoint(id: string): boolean {
  return Boolean(rawCheckpoints[id])
}

/**
 * The checkpoint that gates `lessonId`: the one whose `afterLessonId` is the
 * lesson immediately BEFORE `lessonId` in curriculum order, or null if none.
 * The gate uses this to decide whether a lesson is blocked until its preceding
 * checkpoint is passed. The first lesson (and unknown ids) are never gated.
 */
export function checkpointGating(lessonId: string): CheckpointSpec | null {
  const lessons = listLessons()
  const idx = lessons.findIndex((l) => l.id === lessonId)
  if (idx <= 0) return null
  const prevId = lessons[idx - 1].id
  return listCheckpoints().find((c) => c.afterLessonId === prevId) ?? null
}

/**
 * The union of recall concepts taught by the lessons up to and including
 * `lessonId`, in first-appearance order. A checkpoint's conceptPool must be a
 * subset of this for its `afterLessonId`.
 */
export function conceptsUpToLesson(lessonId: string): MasteryConcept[] {
  const lessons = listLessons()
  const idx = lessons.findIndex((l) => l.id === lessonId)
  if (idx === -1) return []
  const concepts = new Set<MasteryConcept>()
  for (const lesson of lessons.slice(0, idx + 1)) {
    const challenge = getMasteryChallenge(lesson.id)
    if (!challenge) continue
    for (const question of challenge.recall) concepts.add(question.concept)
  }
  return [...concepts]
}
