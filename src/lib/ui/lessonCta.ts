/** Call-to-action label for a lesson card based on the learner's progress. */
export function lessonCtaLabel(complete: boolean, started: boolean): string {
  if (complete) return 'Review lesson'
  return started ? 'Continue lesson' : 'Start lesson'
}
