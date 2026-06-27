import { describe, it, expect } from 'vitest'
import { getMasteryChallenge, masteryLessonIds } from '../../src/content/mastery'
import { buildRecallForChallenge } from '../../src/lib/mastery/recall'
import { allBankQuestions } from '../../src/content/questionBank'
import type { MasteryConcept, MasteryRecallQuestion } from '../../src/content/mastery'

// [Phase 13] Mastery recall now draws topic-specific questions from the bank for
// the lesson's own concept(s), at the SAME count the spec uses today (so the spec
// stays valid + the server Spark clamp is unchanged). L9 keeps its authored
// FizzBuzz recall.

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

function countByConcept(questions: MasteryRecallQuestion[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const q of questions) counts[q.concept] = (counts[q.concept] ?? 0) + 1
  return counts
}

const ORDINARY_LESSONS = masteryLessonIds().filter((id) => id !== 'l9-fizzbuzzpop')

describe('[Phase 13] mastery recall draws from the bank (L1-L8)', () => {
  it('draws ONLY the lesson concepts and the EXACT count/spread the spec uses today', () => {
    for (const id of ORDINARY_LESSONS) {
      const spec = getMasteryChallenge(id)!
      const built = buildRecallForChallenge(spec, mulberry32(0xabc))
      // Same total length as the authored spec (keeps the spec valid + clamp).
      expect(built).toHaveLength(spec.recall.length)
      // Same per-concept spread (so only this lesson's concepts appear, in the
      // same multiplicity the spec asks for).
      expect(countByConcept(built)).toEqual(countByConcept(spec.recall))
    }
  })

  it('sources the drawn questions from the bank (not invented)', () => {
    const bankByPrompt = new Map(allBankQuestions().map((q) => [q.prompt, q]))
    for (const id of ORDINARY_LESSONS) {
      const spec = getMasteryChallenge(id)!
      for (const q of buildRecallForChallenge(spec, mulberry32(1))) {
        expect(bankByPrompt.has(q.prompt)).toBe(true)
      }
    }
  })

  it('preserves the correct answer through the choice shuffle', () => {
    const bankByPrompt = new Map(allBankQuestions().map((q) => [q.prompt, q]))
    for (const id of ORDINARY_LESSONS) {
      const spec = getMasteryChallenge(id)!
      for (const q of buildRecallForChallenge(spec, mulberry32(2))) {
        const source = bankByPrompt.get(q.prompt)!
        expect(q.choices[q.answerIndex]).toBe(source.choices[source.answerIndex])
      }
    }
  })

  it('is deterministic for a fixed seed', () => {
    const spec = getMasteryChallenge('l6-over-and-over-again')!
    const a = buildRecallForChallenge(spec, mulberry32(42)).map((q) => q.prompt)
    const b = buildRecallForChallenge(spec, mulberry32(42)).map((q) => q.prompt)
    expect(a).toEqual(b)
  })

  it('mixes concepts for a multi-concept lesson (L6 = loop + range, never one only)', () => {
    const spec = getMasteryChallenge('l6-over-and-over-again')!
    const concepts = new Set<MasteryConcept>(
      buildRecallForChallenge(spec, mulberry32(5)).map((q) => q.concept),
    )
    // L6 authored recall is 2x loop + 1x range — both concepts must be present.
    expect(concepts.has('loop')).toBe(true)
    expect(concepts.has('range')).toBe(true)
  })
})

describe('[Phase 13] mastery recall keeps L9 authored (no neutral bank)', () => {
  it('returns the L9 spec recall verbatim (same prompts, in order), not bank draws', () => {
    const spec = getMasteryChallenge('l9-fizzbuzzpop')!
    const built = buildRecallForChallenge(spec, mulberry32(9))
    expect(built.map((q) => q.prompt)).toEqual(spec.recall.map((q) => q.prompt))
    // Proof it is the authored FizzBuzz recall, not the neutral bank.
    expect(built.map((q) => q.prompt).join(' ')).toMatch(/FizzBuzz|Fizz/)
  })

  it('still randomizes L9 answer order while keeping the correct answer', () => {
    const spec = getMasteryChallenge('l9-fizzbuzzpop')!
    const built = buildRecallForChallenge(spec, mulberry32(9))
    built.forEach((q, i) => {
      const source = spec.recall[i]
      expect(q.choices[q.answerIndex]).toBe(source.choices[source.answerIndex])
      expect([...q.choices].sort()).toEqual([...source.choices].sort())
    })
  })
})
