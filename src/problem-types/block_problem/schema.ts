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
  requireLoop: z.boolean().default(false),
})

export type BlockProblemConfig = z.infer<typeof blockProblemConfigSchema>
