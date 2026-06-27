// Authored checkpoint specs. Two cumulative gates sit on the curriculum:
//
//   ...l3 → [cp-foundations] → l4...l6 → [cp-control-flow] → l7...l9 (finale)
//
// Each pool lists only concepts taught up to its `afterLessonId`. The questions
// themselves are sampled at runtime from the per-lesson mastery recall banks, so
// there is no question copy to maintain here — only the gate's shape and copy.
//
// Raw (unvalidated) specs keyed by checkpoint id; parsed by getCheckpoint.
export const rawCheckpoints: Record<string, unknown> = {
  'cp-foundations': {
    id: 'cp-foundations',
    afterLessonId: 'l3-doing-the-math',
    title: 'Checkpoint: Your First Tools',
    blurb:
      "Time to show what you've learned! This checkpoint mixes everything from your first lessons — showing text with print(), keeping values in variables, and finding leftovers with the % operator.",
    conceptPool: ['print', 'variable', 'modulo'],
  },

  'cp-control-flow': {
    id: 'cp-control-flow',
    afterLessonId: 'l6-over-and-over-again',
    title: 'Checkpoint: Decisions & Loops',
    blurb:
      'A bigger challenge! Prove you remember it all so far — printing, variables, the % operator, comparing values, choosing with if/else, and repeating work using loops and range().',
    conceptPool: ['print', 'variable', 'modulo', 'comparison', 'conditional', 'loop', 'range'],
  },
}
