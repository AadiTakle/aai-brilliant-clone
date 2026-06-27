// The question bank's public surface. The CONTENT lives in ./bank (a flat,
// concept-keyed list you append to); this module just reads it.
//
// Every recall consumer pulls from here:
//   - Mastery recall (src/lib/mastery/recall.ts) samples a lesson's concept(s).
//   - Mastery checkpoints (src/lib/checkpoints/itemBank.ts) sample cumulative
//     concepts up to the checkpoint.
//   - Daily challenges (src/pages/DailyChallengePage.tsx) sample learned concepts.
// Answer order is randomized at render time (see shuffleChoices), so a question's
// stored `answerIndex` is just the correct choice in authoring order.

import { MASTERY_CONCEPTS, type MasteryConcept } from '../mastery/types'
import { bankQuestionSchema, type BankQuestion } from './types'
import { QUESTION_BANK } from './bank'

export * from './types'
export { QUESTION_BANK }

/** Every bank question tagged with `concept`, in authoring order. */
export function bankQuestionsForConcept(concept: MasteryConcept): BankQuestion[] {
  return QUESTION_BANK[concept] ?? []
}

/** The whole bank flattened, concept by concept. */
export function allBankQuestions(): BankQuestion[] {
  return MASTERY_CONCEPTS.flatMap((concept) => QUESTION_BANK[concept] ?? [])
}

// A single problem found while validating the bank (used by tests + the dev
// content-validation script).
export interface BankValidationIssue {
  concept: MasteryConcept
  index: number
  error: string
}

/**
 * Validates every question against the schema AND checks that each question's
 * `concept` tag matches the list it lives in. Returns an empty array when the
 * whole bank is well-formed.
 */
export function validateQuestionBank(): BankValidationIssue[] {
  const issues: BankValidationIssue[] = []
  for (const concept of MASTERY_CONCEPTS) {
    const list = QUESTION_BANK[concept] ?? []
    list.forEach((question, index) => {
      const parsed = bankQuestionSchema.safeParse(question)
      if (!parsed.success) {
        issues.push({ concept, index, error: parsed.error.message })
        return
      }
      if (parsed.data.concept !== concept) {
        issues.push({
          concept,
          index,
          error: `concept tag "${parsed.data.concept}" does not match its list "${concept}"`,
        })
      }
    })
  }
  return issues
}
