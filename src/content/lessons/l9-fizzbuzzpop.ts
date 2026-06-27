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
              "**Here are the rules.** Go through the numbers **1 to 21**. For each number:\n\n- a multiple of **3** → say **Fizz**\n- a multiple of **5** → say **Buzz**\n- a multiple of **7** → say **Pop**\n\nIf a number matches more than one rule, join the words **in that order** — so **15** (3 and 5) is **FizzBuzz**, and **21** (3 and 7) is **FizzPop**. If it matches **no** rule, just print the **number itself**.",
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
