import { describe, it, expect } from 'vitest'
import {
  QUESTION_BANK,
  allBankQuestions,
  bankQuestionsForConcept,
  validateQuestionBank,
} from '../../src/content/questionBank'
import { MASTERY_CONCEPTS } from '../../src/content/mastery'

// [Phase 13] The extensible question bank: it must load, validate, hold the
// expected migrated + new questions per concept, and stay safe for the places it
// feeds (notably: modulo stays ==-free for the pre-comparison checkpoint, and the
// L9 Fizz/Buzz/Pop wording never leaks into the neutral bank).

// Existing (migrated from specs.ts) + new, per QUESTION_BANK_SOURCE.md.
const EXPECTED_COUNTS: Record<string, number> = {
  print: 14, // 3 existing + 11 new
  variable: 14, // 3 + 11
  modulo: 14, // 3 (2 as-is + 1 reworded) + 11
  comparison: 14, // 3 + 11
  conditional: 14, // 3 + 11
  loop: 14, // 3 (2 in L6 + 1 in L7) + 11
  range: 14, // 1 + 13
  accumulator: 14, // 1 + 13
  function: 14, // 3 + 11
}

describe('[Phase 13] question bank loads + validates', () => {
  it('passes schema validation with every concept tag matching its list', () => {
    expect(validateQuestionBank()).toEqual([])
  })

  it('is keyed by every mastery concept (no concept missing a list)', () => {
    for (const concept of MASTERY_CONCEPTS) {
      expect(Array.isArray(QUESTION_BANK[concept])).toBe(true)
      expect(QUESTION_BANK[concept].length).toBeGreaterThan(0)
    }
  })

  it('holds the expected number of questions per concept (existing + new)', () => {
    for (const concept of MASTERY_CONCEPTS) {
      expect(bankQuestionsForConcept(concept).length).toBe(EXPECTED_COUNTS[concept])
    }
  })

  it('flattens to the full bank (126 questions across the nine concepts)', () => {
    const total = Object.values(EXPECTED_COUNTS).reduce((a, b) => a + b, 0)
    expect(allBankQuestions()).toHaveLength(total)
  })

  it('every question has an in-range answerIndex and 2-4 distinct choices', () => {
    for (const q of allBankQuestions()) {
      expect(q.choices.length).toBeGreaterThanOrEqual(2)
      expect(q.choices.length).toBeLessThanOrEqual(4)
      expect(new Set(q.choices).size).toBe(q.choices.length) // no duplicate choices
      expect(q.answerIndex).toBeGreaterThanOrEqual(0)
      expect(q.answerIndex).toBeLessThan(q.choices.length)
    }
  })
})

describe('[Phase 13] adding a question is trivial (a flat appendable list)', () => {
  it('each concept is a plain array you can append one object to', () => {
    // The "append one object" contract: every concept value is a flat array of
    // self-describing question objects (each carrying its own concept tag), so a
    // new question is one push — no index/registry to update elsewhere.
    for (const concept of MASTERY_CONCEPTS) {
      const list = QUESTION_BANK[concept]
      expect(Array.isArray(list)).toBe(true)
      for (const q of list) {
        expect(q.concept).toBe(concept)
        expect(typeof q.prompt).toBe('string')
        expect(q.prompt.length).toBeGreaterThan(0)
      }
    }
  })
})

describe('[Phase 13] invariant content guarantees', () => {
  it('keeps every MODULO question free of == (it is drawn before == is taught)', () => {
    for (const q of bankQuestionsForConcept('modulo')) {
      const text = [q.prompt, ...q.choices, q.feedback?.incorrect ?? '', q.feedback?.correct ?? ''].join(' ')
      expect(text).not.toContain('==')
    }
  })

  it('migrated the existing recall MCQs (a representative sample is present)', () => {
    const prompts = (c: Parameters<typeof bankQuestionsForConcept>[0]) =>
      bankQuestionsForConcept(c).map((q) => q.prompt)
    expect(prompts('print')).toContain('Which line makes the computer show the word Hello on screen?')
    expect(prompts('variable')).toContain('What does  city = "Paris"  do?')
    expect(prompts('comparison')).toContain('What is the result of  7 > 3 ?')
    expect(prompts('range')).toContain('What numbers does  range(1, 4)  give?')
    expect(prompts('accumulator')).toContain('What does  label = label + "Hi"  do?')
    expect(prompts('function')).toContain('What keyword starts a function definition?')
  })

  it('applies the modulo reword (drops the original "n % 5 == 0" question)', () => {
    const prompts = bankQuestionsForConcept('modulo').map((q) => q.prompt)
    expect(prompts).toContain('When does  n % 5  give  0 ?')
    expect(prompts).not.toContain('When is  n % 5 == 0  true?')
  })

  it('never lets the L9 Fizz/Buzz/Pop accumulator wording into the neutral bank', () => {
    for (const q of bankQuestionsForConcept('accumulator')) {
      const text = [q.prompt, ...q.choices].join(' ')
      expect(text).not.toMatch(/Fizz|Buzz|Pop/i)
    }
  })
})
