import { describe, it, expect } from 'vitest'
import { getLesson } from '../../src/content/loader'
import {
  getCheckpoint,
  listCheckpoints,
  hasCheckpoint,
  checkpointGating,
  conceptsUpToLesson,
} from '../../src/content/checkpoints'
import { recallItemsForConcept, buildCheckpointItems } from '../../src/lib/checkpoints/itemBank'
import { scoreCheckpoint, type CheckpointAnswer } from '../../src/lib/checkpoints/scoring'
import type { MasteryConcept } from '../../src/content/mastery'

// A tiny seeded PRNG so item sampling/shuffling is deterministic in tests.
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Build `asked` answers for a concept, the first `correct` of them right.
function answers(concept: MasteryConcept, asked: number, correct: number): CheckpointAnswer[] {
  return Array.from({ length: asked }, (_, i) => ({ concept, correct: i < correct }))
}

describe('[Phase 11] checkpoint specs are well-formed', () => {
  it('lists exactly two valid checkpoint specs', () => {
    const specs = listCheckpoints()
    expect(specs).toHaveLength(2)
    expect(specs.map((s) => s.id).sort()).toEqual(['cp-control-flow', 'cp-foundations'])
  })

  it('exposes specs by id and reports existence', () => {
    expect(getCheckpoint('cp-foundations')?.afterLessonId).toBe('l3-doing-the-math')
    expect(getCheckpoint('cp-control-flow')?.afterLessonId).toBe('l6-over-and-over-again')
    expect(getCheckpoint('does-not-exist')).toBeNull()
    expect(hasCheckpoint('cp-foundations')).toBe(true)
    expect(hasCheckpoint('does-not-exist')).toBe(false)
  })

  it('each afterLessonId resolves to a real lesson', () => {
    for (const spec of listCheckpoints()) {
      expect(getLesson(spec.afterLessonId)).not.toBeNull()
    }
  })

  it('each conceptPool is a subset of the concepts taught up to its lesson', () => {
    for (const spec of listCheckpoints()) {
      const taught = new Set(conceptsUpToLesson(spec.afterLessonId))
      for (const concept of spec.conceptPool) {
        expect(taught.has(concept)).toBe(true)
      }
    }
  })

  it('every pooled concept has at least one recall item available', () => {
    for (const spec of listCheckpoints()) {
      for (const concept of spec.conceptPool) {
        expect(recallItemsForConcept(concept).length).toBeGreaterThanOrEqual(1)
      }
    }
  })
})

describe('[Phase 11] checkpoint gating', () => {
  it('gates the lesson directly AFTER each checkpoint, and nothing earlier', () => {
    expect(checkpointGating('l4-true-or-false')?.id).toBe('cp-foundations')
    expect(checkpointGating('l7-loops-and-decisions')?.id).toBe('cp-control-flow')
    expect(checkpointGating('l2-boxes-that-remember')).toBeNull()
    expect(checkpointGating('l1-talking-to-the-computer')).toBeNull()
  })
})

describe('[Phase 11] checkpoint scoring (answer-once)', () => {
  const foundations = getCheckpoint('cp-foundations')
  if (!foundations) throw new Error('cp-foundations spec missing')

  it('passes when every answer is correct', () => {
    const result = scoreCheckpoint(foundations, [
      ...answers('print', 3, 3),
      ...answers('variable', 3, 3),
      ...answers('modulo', 3, 3),
    ])
    expect(result.overall).toBe(1)
    expect(result.overallPassed).toBe(true)
    expect(result.perConceptPassed).toBe(true)
    expect(result.passed).toBe(true)
  })

  it('fails when one concept is entirely wrong, even though the overall % passes', () => {
    const result = scoreCheckpoint(foundations, [
      ...answers('print', 8, 8),
      ...answers('variable', 8, 8),
      ...answers('modulo', 3, 0),
    ])
    expect(result.overallPassed).toBe(true) // 16/19 ≈ 0.84
    expect(result.perConceptPassed).toBe(false)
    expect(result.passed).toBe(false)
  })

  it('fails overall when each concept clears its floor but the total is under 80%', () => {
    const result = scoreCheckpoint(foundations, [
      ...answers('print', 3, 2),
      ...answers('variable', 3, 2),
      ...answers('modulo', 3, 2),
    ])
    expect(result.perConceptPassed).toBe(true)
    expect(result.overall).toBeCloseTo(6 / 9)
    expect(result.overallPassed).toBe(false)
    expect(result.passed).toBe(false)
  })

  it('uses a ratio floor (asked 3 needs 2, asked 2 needs 2, asked 1 needs 1)', () => {
    const result = scoreCheckpoint(foundations, [
      ...answers('print', 3, 0),
      ...answers('variable', 2, 0),
      ...answers('modulo', 1, 0),
    ])
    const required = Object.fromEntries(result.concepts.map((c) => [c.concept, c.required]))
    expect(required.print).toBe(2)
    expect(required.variable).toBe(2)
    expect(required.modulo).toBe(1)
  })

  it('guards divide-by-zero when there are no answers', () => {
    const result = scoreCheckpoint(foundations, [])
    expect(result.overall).toBe(0)
    expect(result.passed).toBe(false)
  })
})

describe('[Phase 11] checkpoint item bank', () => {
  it('caps the total at maxQuestions, trimmed fairly so every concept still appears', () => {
    const spec = getCheckpoint('cp-control-flow')
    if (!spec) throw new Error('cp-control-flow spec missing')
    // 7 concepts * perConceptCount(3) = 21 available, more than the cap.
    expect(spec.conceptPool.length * spec.perConceptCount).toBeGreaterThan(spec.maxQuestions)
    const items = buildCheckpointItems(spec, mulberry32(0xc0ffee))
    expect(items).toHaveLength(spec.maxQuestions)
    expect(spec.maxQuestions).toBeLessThanOrEqual(15)
    // Round-robin trim keeps balanced coverage: no whole concept is dropped.
    expect(new Set(items.map((i) => i.concept)).size).toBe(spec.conceptPool.length)
  })

  it('returns the full per-concept draw when it is under the cap (cp-foundations)', () => {
    const spec = getCheckpoint('cp-foundations')
    if (!spec) throw new Error('cp-foundations spec missing')
    const items = buildCheckpointItems(spec, mulberry32(0xc0ffee))
    // 3 concepts * 3 = 9 <= maxQuestions, so nothing is trimmed.
    expect(items).toHaveLength(spec.conceptPool.length * spec.perConceptCount)
  })

  it('is deterministic for a fixed seed and only draws pooled concepts', () => {
    const spec = getCheckpoint('cp-control-flow')
    if (!spec) throw new Error('cp-control-flow spec missing')
    const a = buildCheckpointItems(spec, mulberry32(42)).map((i) => i.concept)
    const b = buildCheckpointItems(spec, mulberry32(42)).map((i) => i.concept)
    expect(a).toEqual(b)
    const pool = new Set<MasteryConcept>(spec.conceptPool)
    expect(a.every((c) => pool.has(c))).toBe(true)
  })
})
