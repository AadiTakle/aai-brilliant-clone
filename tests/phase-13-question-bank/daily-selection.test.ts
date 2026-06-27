import { describe, it, expect } from 'vitest'
import { learnedConcepts, selectDailyConcepts } from '../../src/lib/daily/schedule'
import { recallItemsForConcept, sampleN, shuffleChoices } from '../../src/lib/checkpoints/itemBank'
import type { MasteryConcept } from '../../src/content/mastery'

// [Phase 13] The Daily Challenge sources recall from the bank but only for
// concepts the learner has been TAUGHT. This mirrors DailyChallengePage's draw:
// learnedConcepts -> selectDailyConcepts -> one bank question per concept.

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

// The exact composition the page performs.
function drawDaily(clearedLessonIds: string[], count: number, rng: () => number) {
  const learned = learnedConcepts(clearedLessonIds)
  const concepts = selectDailyConcepts({}, learned, '2026-06-27', count)
  const drawn: { concept: MasteryConcept; prompt: string }[] = []
  for (const concept of concepts) {
    for (const q of sampleN(recallItemsForConcept(concept), 1, rng)) {
      const shown = shuffleChoices(q, rng)
      drawn.push({ concept, prompt: shown.prompt })
    }
  }
  return { learned, drawn }
}

describe('[Phase 13] daily challenge draws only learned concepts from the bank', () => {
  it('after L1-L3, only print/variable/modulo can be drawn (never loop/conditional)', () => {
    const { learned, drawn } = drawDaily(
      ['l1-talking-to-the-computer', 'l2-boxes-that-remember', 'l3-doing-the-math'],
      5,
      mulberry32(0xda117),
    )
    const learnedSet = new Set<MasteryConcept>(learned)
    expect(learnedSet.has('print')).toBe(true)
    expect(learnedSet.has('variable')).toBe(true)
    expect(learnedSet.has('modulo')).toBe(true)
    expect(learnedSet.has('loop')).toBe(false)
    expect(learnedSet.has('conditional')).toBe(false)
    // Every drawn item is a learned concept, and pulls a real bank question.
    for (const item of drawn) {
      expect(learnedSet.has(item.concept)).toBe(true)
      expect(recallItemsForConcept(item.concept).some((q) => q.prompt === item.prompt)).toBe(true)
    }
  })

  it('draws nothing when no lessons are cleared', () => {
    const { learned, drawn } = drawDaily([], 5, mulberry32(1))
    expect(learned).toEqual([])
    expect(drawn).toEqual([])
  })

  it('every learned concept has bank questions available to draw', () => {
    const learned = learnedConcepts([
      'l1-talking-to-the-computer',
      'l2-boxes-that-remember',
      'l3-doing-the-math',
      'l4-true-or-false',
      'l5-making-decisions',
      'l6-over-and-over-again',
      'l7-loops-and-decisions',
      'l8-build-your-own-machine',
    ])
    for (const concept of learned) {
      expect(recallItemsForConcept(concept).length).toBeGreaterThanOrEqual(1)
    }
  })
})
