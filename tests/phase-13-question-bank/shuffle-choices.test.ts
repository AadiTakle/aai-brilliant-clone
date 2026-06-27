import { describe, it, expect } from 'vitest'
import { shuffleChoices } from '../../src/lib/checkpoints/itemBank'
import { allBankQuestions } from '../../src/content/questionBank'

// [Phase 13] Randomized answer ordering: shuffleChoices must reorder the choices
// but ALWAYS keep the correct one flagged correct — across many seeds and even
// when choices share text. It must also be deterministic for a fixed seed.

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

describe('[Phase 13] shuffleChoices preserves the correct answer', () => {
  it('keeps the marked-correct choice correct across many shuffles (every bank question)', () => {
    for (const q of allBankQuestions()) {
      const correctText = q.choices[q.answerIndex]
      for (let seed = 0; seed < 25; seed++) {
        const shuffled = shuffleChoices(q, mulberry32(seed))
        expect(shuffled.choices[shuffled.answerIndex]).toBe(correctText)
        // Same multiset of choices — nothing added, dropped, or duplicated.
        expect([...shuffled.choices].sort()).toEqual([...q.choices].sort())
      }
    }
  })

  it('is deterministic for a fixed seed', () => {
    const q = { prompt: 'p', concept: 'print' as const, choices: ['a', 'b', 'c', 'd'], answerIndex: 2 }
    const a = shuffleChoices(q, mulberry32(123))
    const b = shuffleChoices(q, mulberry32(123))
    expect(a.choices).toEqual(b.choices)
    expect(a.answerIndex).toBe(b.answerIndex)
  })

  it('does not mutate the original question', () => {
    const q = { prompt: 'p', concept: 'print' as const, choices: ['a', 'b', 'c'], answerIndex: 0 }
    const before = [...q.choices]
    shuffleChoices(q, mulberry32(7))
    expect(q.choices).toEqual(before)
    expect(q.answerIndex).toBe(0)
  })

  it('is correct even when two choices share the same text (indexes, not strings)', () => {
    // Both "True" entries exist, but only the original answerIndex is the correct
    // one; remapping by index guarantees we track the right slot.
    const q = { prompt: 'p', concept: 'comparison' as const, choices: ['True', 'False', 'True'], answerIndex: 2 }
    for (let seed = 0; seed < 25; seed++) {
      const shuffled = shuffleChoices(q, mulberry32(seed))
      // The correct slot must still read "True" and there must still be exactly
      // two "True" choices total.
      expect(shuffled.choices[shuffled.answerIndex]).toBe('True')
      expect(shuffled.choices.filter((c) => c === 'True')).toHaveLength(2)
    }
  })
})
