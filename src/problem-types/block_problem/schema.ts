import { z } from 'zod'

// A placed block instance in the workspace or palette. The block-engine schema
// (atomic blocks + typed slots) is refined in Phase 4; kept structural here.
export const blockInstanceSchema: z.ZodType<BlockInstance> = z.lazy(() =>
  z.object({
    type: z.string().min(1),
    fields: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
    slots: z.record(z.string(), z.array(blockInstanceSchema)).optional(),
  }),
)

export interface BlockInstance {
  type: string
  fields?: Record<string, string | number>
  slots?: Record<string, BlockInstance[]>
}

export const blockProblemConfigSchema = z.object({
  mode: z.enum(['sandbox', 'fill_blank', 'bugfix']),
  prompt: z.string().min(1),
  // Block types available in the palette (see BLOCK_DEFS).
  palette: z.array(z.string()).default([]),
  // Preset program for fill_blank / bugfix modes.
  initial: z.array(blockInstanceSchema).default([]),
  expectedOutput: z.string().optional(),
  // When true, a correct output only passes if the program actually uses a loop.
  // Kept as a convenience alias of requiredConstructs: ['loop'].
  requireLoop: z.boolean().default(false),
  // A correct output only passes if the program actually uses each construct
  // (prevents hardcoding / faking the output).
  requiredConstructs: z.array(z.enum(['loop', 'modulo', 'conditional'])).default([]),
  // Opt-in "close enough" grading: ignores case, surrounding whitespace, and
  // trailing punctuation. Off by default so later lessons stay strict.
  lenient: z.boolean().default(false),
  // When true, the learner can only EDIT the preset blocks, never remove them
  // (the remove buttons are hidden and the reducer rejects removals). Off by
  // default so other lessons are unaffected.
  lockBlocks: z.boolean().default(false),
  // When set, enables a reassignment-specific, answer-free hint for this
  // variable: if the learner edited an earlier assignment to it but left the
  // LAST assignment unchanged, they're told the last write is what sticks.
  reassignmentVar: z.string().optional(),
  // When set, a correct output only passes if a `print` block actually prints
  // THIS variable (not a typed-in literal). Stops the learner from bypassing the
  // box — e.g. typing "Hello" straight into print() instead of printing `word`.
  requirePrintVar: z.string().optional(),
  // When set, a correct output only passes if a `compare` block actually tests
  // the given variable (optionally with a specific operator / number on the
  // other side). Stops the learner faking the answer with a hardcoded or
  // unrelated comparison (e.g. `0 == 0`) instead of checking the box they built.
  requireCompare: z
    .object({
      variable: z.string().min(1),
      op: z.string().optional(),
      against: z.number().optional(),
    })
    .optional(),
})

export type BlockProblemConfig = z.infer<typeof blockProblemConfigSchema>
