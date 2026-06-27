import { z } from 'zod'
import { pythonSandboxConfigSchema } from '../../problem-types/python_sandbox/schema'

// The concept vocabulary a mastery challenge can tag its questions with. Recall
// questions carry one concept; the Apply stage is weighted toward the concepts a
// learner missed (and, with AI on, the model is told which concepts to target).
export const MASTERY_CONCEPTS = [
  'print',
  'variable',
  'modulo',
  'comparison',
  'conditional',
  'loop',
  'range',
  'accumulator',
  'function',
] as const

export type MasteryConcept = (typeof MASTERY_CONCEPTS)[number]

// A recall question is a multiple-choice checkpoint (same shape the article
// Checkpoint component renders) plus a `concept` tag. `kind: 'checkpoint'` is
// added by the renderer, so authors don't repeat it here.
export const masteryRecallQuestionSchema = z.object({
  prompt: z.string().min(1),
  choices: z.array(z.string().min(1)).min(2).max(4),
  answerIndex: z.number().int().nonnegative(),
  feedback: z
    .object({
      correct: z.string().optional(),
      // Shown on a wrong answer — an answer-free nudge the learner retries from.
      incorrect: z.string().optional(),
    })
    .optional(),
  concept: z.enum(MASTERY_CONCEPTS),
})

// An Apply question is a graded python_sandbox config plus the concepts it
// exercises (used to choose the best static fallback for what a learner missed).
export const masteryApplyQuestionSchema = pythonSandboxConfigSchema.extend({
  concepts: z.array(z.enum(MASTERY_CONCEPTS)).default([]),
})

export const masteryChallengeSpecSchema = z.object({
  lessonId: z.string().min(1),
  // Briefing-card copy describing what the challenge covers.
  blurb: z.string().min(1),
  // 3-5 static recall questions on the lesson's concepts.
  recall: z.array(masteryRecallQuestionSchema).min(3).max(5),
  // Authored static Apply question(s): used when AI is disabled, and as the
  // fallback when AI generation fails validation/self-test. At least one.
  applyFallback: z.array(masteryApplyQuestionSchema).min(1),
  // When true the Apply stage is ALWAYS the static fallback (never AI). Used by
  // the L9 FizzBuzzPop finale, which must run with no AI.
  forceStaticApply: z.boolean().default(false),
})

export type MasteryRecallQuestion = z.infer<typeof masteryRecallQuestionSchema>
export type MasteryApplyQuestion = z.infer<typeof masteryApplyQuestionSchema>
export type MasteryChallengeSpec = z.infer<typeof masteryChallengeSpecSchema>
