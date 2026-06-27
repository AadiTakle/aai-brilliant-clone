// L9 — FizzBuzzPop is the course finale, and it now runs entirely as a Mastery
// Challenge (see src/content/mastery). The lesson body is a single ungraded
// briefing step that hands the learner straight into the challenge. The graded
// FizzBuzzPop capstone moved into the L9 mastery spec's `applyFallback` and is
// flagged `forceStaticApply` — so the finale is always authored (never AI) and
// works with AI on or off. L9's roadmap "done"/gold state is driven by being
// `mastered` (it has no graded steps of its own).
export const l9FizzBuzzPop = {
  id: 'l9-fizzbuzzpop',
  title: 'FizzBuzzPop',
  version: 2,
  steps: [
    {
      id: 'the-finale-awaits',
      type: 'article',
      title: 'The finale awaits',
      graded: false,
      config: {
        panels: [
          {
            text:
              "This is it — the finale. Everything you've learned comes together in one classic challenge: **FizzBuzzPop**.",
          },
          {
            text:
              "There's no warm-up here. Press **Finish** to enter the **Mastery Challenge**: first a quick review of the ideas you'll need, then you write the whole program yourself — from a nearly blank screen.",
          },
        ],
      },
    },
  ],
}
