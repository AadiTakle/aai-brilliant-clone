import { describe, it, expect } from 'vitest'
import { listLessons } from '../../src/content/loader'
import {
  getMasteryChallenge,
  hasMasteryChallenge,
  masteryLessonIds,
  masteryChallengeSpecSchema,
} from '../../src/content/mastery'
import { rawMasterySpecs } from '../../src/content/mastery/specs'

// [Mastery] Every built-in lesson must ship a valid Mastery Challenge spec so the
// app is fully playable with AI disabled.
describe('[Mastery] authored specs', () => {
  it('every built-in lesson has a mastery spec', () => {
    for (const lesson of listLessons()) {
      expect(hasMasteryChallenge(lesson.id), `${lesson.id} should have a mastery spec`).toBe(true)
      expect(getMasteryChallenge(lesson.id)).not.toBeNull()
    }
  })

  it('every spec parses against the schema (recall + apply configs valid)', () => {
    for (const id of masteryLessonIds()) {
      const parsed = masteryChallengeSpecSchema.safeParse(rawMasterySpecs[id])
      expect(parsed.success, `${id} spec should parse`).toBe(true)
    }
  })

  it('recall questions have an in-range answer and 3-5 per lesson', () => {
    for (const id of masteryLessonIds()) {
      const spec = getMasteryChallenge(id)!
      expect(spec.recall.length).toBeGreaterThanOrEqual(3)
      expect(spec.recall.length).toBeLessThanOrEqual(5)
      for (const q of spec.recall) {
        expect(q.answerIndex).toBeGreaterThanOrEqual(0)
        expect(q.answerIndex).toBeLessThan(q.choices.length)
      }
    }
  })

  it('each apply fallback is a graded sandbox with a test case + feedback', () => {
    for (const id of masteryLessonIds()) {
      const spec = getMasteryChallenge(id)!
      expect(spec.applyFallback.length).toBeGreaterThanOrEqual(1)
      for (const apply of spec.applyFallback) {
        expect(apply.prompt.length).toBeGreaterThan(0)
        expect(apply.testCases.length).toBeGreaterThan(0)
        for (const tc of apply.testCases) {
          expect(tc.feedback && tc.feedback.length).toBeTruthy()
        }
      }
    }
  })

  it('L9 forces the static apply (no AI) and reviews the FizzBuzzPop concepts', () => {
    const spec = getMasteryChallenge('l9-fizzbuzzpop')!
    expect(spec.forceStaticApply).toBe(true)
    const concepts = new Set(spec.recall.map((q) => q.concept))
    for (const c of ['loop', 'modulo', 'conditional', 'accumulator'] as const) {
      expect(concepts.has(c)).toBe(true)
    }
  })

  it('returns null for a lesson with no spec (e.g. a custom AI lesson)', () => {
    expect(getMasteryChallenge('custom-made-up-id')).toBeNull()
    expect(hasMasteryChallenge('custom-made-up-id')).toBe(false)
  })
})
