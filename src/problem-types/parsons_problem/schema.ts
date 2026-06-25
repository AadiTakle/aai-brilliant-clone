import { z } from 'zod'

// A Parsons problem gives the learner the right code lines in the wrong order;
// they reassemble (and indent) them. `lines` is the correct solution, in order.
// `distractors` are extra wrong lines mixed into the bank.

export const parsonsLineSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  // The correct indentation level (0 = no indent, 1 = 4 spaces, ...).
  indent: z.number().int().nonnegative().default(0),
})

export const parsonsProblemConfigSchema = z.object({
  prompt: z.string().min(1),
  lines: z.array(parsonsLineSchema).min(2),
  distractors: z.array(parsonsLineSchema).default([]),
  // When false, only the order is graded (indentation is ignored).
  checkIndent: z.boolean().default(true),
  // Optional, answer-free hint shown when the ORDER is wrong. Lets a lesson tailor
  // the nudge (e.g. point back to a very similar worked demo) instead of the
  // generic "check the order" message. When absent, a generic message is shown.
  orderHint: z.string().min(1).optional(),
  // Optional, answer-free hint shown when the ORDER is right but the indentation
  // is wrong. Lets a lesson tailor the nudge (e.g. "both for and if need their
  // inside lines indented") without revealing the exact indentation. When absent,
  // a generic indentation message is shown.
  indentHint: z.string().min(1).optional(),
})

export type ParsonsLine = z.infer<typeof parsonsLineSchema>
export type ParsonsProblemConfig = z.infer<typeof parsonsProblemConfigSchema>
