import { z } from 'zod'
import { masteryRecallQuestionSchema } from '../mastery/types'

// Optional difficulty tag for a bank question. Purely advisory today (every
// consumer samples by concept, not difficulty), but stored so future selection
// can lean on it without another content migration.
export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const
export type Difficulty = (typeof DIFFICULTIES)[number]

// A bank question IS a mastery recall MCQ — same shape the article Checkpoint
// renders (prompt, 2-4 choices, an answerIndex, an optional feedback nudge, and a
// `concept` tag) — plus an optional difficulty. Because it extends the recall
// schema, a BankQuestion is usable anywhere a MasteryRecallQuestion is expected.
export const bankQuestionSchema = masteryRecallQuestionSchema.extend({
  difficulty: z.enum(DIFFICULTIES).optional(),
})

export type BankQuestion = z.infer<typeof bankQuestionSchema>
