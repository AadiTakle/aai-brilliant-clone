// A PURE, concept-tagged "item bank" that samples questions from the existing
// mastery specs. It is the shared foundation both Mastery Checkpoints and Daily
// Challenges build on: checkpoints draw recall items for the concepts taught so
// far; dailies (later) draw Apply items for spaced practice. Nothing here calls
// AI or touches storage — it only reads the static, already-validated content.

import {
  getMasteryChallenge,
  type MasteryConcept,
  type MasteryRecallQuestion,
  type MasteryApplyQuestion,
} from '../../content/mastery'
import { listLessons } from '../../content/loader'
import type { Lesson } from '../../content/schemas'
import type { CheckpointSpec } from '../../content/checkpoints/types'

// Lessons in curriculum order (l1..l9) up to AND including `uptoLessonId`. When
// the id is omitted, every lesson is returned; when it is unknown, none are.
function lessonsUpTo(uptoLessonId?: string): Lesson[] {
  const lessons = listLessons()
  if (uptoLessonId === undefined) return lessons
  const idx = lessons.findIndex((l) => l.id === uptoLessonId)
  if (idx === -1) return []
  return lessons.slice(0, idx + 1)
}

/**
 * Every recall MCQ tagged with `concept`, across the lessons up to and including
 * `uptoLessonId`, in lesson order. Pulled from each lesson's mastery spec.
 */
export function recallItemsForConcept(
  concept: MasteryConcept,
  uptoLessonId?: string,
): MasteryRecallQuestion[] {
  const items: MasteryRecallQuestion[] = []
  for (const lesson of lessonsUpTo(uptoLessonId)) {
    const challenge = getMasteryChallenge(lesson.id)
    if (!challenge) continue
    for (const question of challenge.recall) {
      if (question.concept === concept) items.push(question)
    }
  }
  return items
}

/**
 * Every Apply (graded python_sandbox) question whose `concepts` include
 * `concept`, across the lessons up to and including `uptoLessonId`, in lesson
 * order. Pulled from each lesson's mastery applyFallback (the no-AI source).
 * Daily Challenges sample from here.
 */
export function applyItemsForConcept(
  concept: MasteryConcept,
  uptoLessonId?: string,
): MasteryApplyQuestion[] {
  const items: MasteryApplyQuestion[] = []
  for (const lesson of lessonsUpTo(uptoLessonId)) {
    const challenge = getMasteryChallenge(lesson.id)
    if (!challenge) continue
    for (const question of challenge.applyFallback) {
      if (question.concepts.includes(concept)) items.push(question)
    }
  }
  return items
}

/**
 * Fisher–Yates shuffle returning a new array. `rng` is injectable so callers
 * (and tests) can make the result deterministic.
 */
export function shuffle<T>(arr: readonly T[], rng: () => number = Math.random): T[] {
  const out = arr.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = out[i]
    out[i] = out[j]
    out[j] = tmp
  }
  return out
}

/**
 * A deterministic-with-seed sample of up to `n` items (fewer when the pool is
 * smaller). Uses the same injectable `rng` as `shuffle`.
 */
export function sampleN<T>(arr: readonly T[], n: number, rng: () => number = Math.random): T[] {
  return shuffle(arr, rng).slice(0, Math.max(0, n))
}

/**
 * Returns a copy of an MCQ with its `choices` randomized and `answerIndex`
 * remapped so the SAME choice stays correct. This is the single util every recall
 * renderer uses to shuffle answer order. It reuses `shuffle` and the same
 * injectable `rng`, so tests can pin the order. It shuffles INDICES (not the
 * strings), so it is correct even if two choices happen to share text.
 */
export function shuffleChoices<Q extends { choices: string[]; answerIndex: number }>(
  question: Q,
  rng: () => number = Math.random,
): Q {
  const order = shuffle([...question.choices.keys()], rng)
  const choices = order.map((i) => question.choices[i])
  const answerIndex = order.indexOf(question.answerIndex)
  return { ...question, choices, answerIndex }
}

// A single drawn checkpoint question, carrying the concept it was sampled for so
// scoring can group answers per concept.
export interface CheckpointItem {
  concept: MasteryConcept
  question: MasteryRecallQuestion
}

/**
 * Builds the full set of checkpoint questions for a spec: for each concept in
 * the pool, sample up to `perConceptCount` recall items drawn from the lessons
 * up to the checkpoint's `afterLessonId`, then shuffle the flattened result so
 * concepts are interleaved. All randomness flows through the injectable `rng`.
 */
export function buildCheckpointItems(
  spec: CheckpointSpec,
  rng: () => number = Math.random,
): CheckpointItem[] {
  const items: CheckpointItem[] = []
  for (const concept of spec.conceptPool) {
    const pool = recallItemsForConcept(concept, spec.afterLessonId)
    for (const question of sampleN(pool, spec.perConceptCount, rng)) {
      items.push({ concept, question })
    }
  }
  return shuffle(items, rng)
}
