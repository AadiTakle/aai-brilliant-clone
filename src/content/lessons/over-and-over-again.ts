// Raw lesson content for "Over and Over Again". Validated against lessonSchema
// by the content loader. Steps are authored across Phases 3-5; this is the
// initial scaffold with valid (if minimal) steps for routing/loader.
export const overAndOverAgain = {
  id: 'over-and-over-again',
  title: 'Over and Over Again',
  version: 1,
  steps: [
    {
      id: 'intro',
      type: 'article',
      title: 'Doing things again and again',
      graded: false,
      config: {
        panels: [
          {
            text: 'Tap **+3** again and again. Watch the total grow.',
            activity: {
              kind: 'widget',
              widget: 'repeated_addition',
              config: { value: 3, target: 5 },
            },
          },
          {
            text: 'Typing `3 + 3 + 3 + 3 + 3` is tedious. A **loop** repeats it for you — step through it.',
            activity: {
              kind: 'widget',
              widget: 'loop_visualizer',
              config: { iterations: 5, action: 'print("Hello!")' },
            },
          },
          {
            text: 'Quick check:',
            activity: {
              kind: 'checkpoint',
              prompt: 'How many times does the loop body run for `range(5)`?',
              choices: ['Once', '4 times', '5 times', 'Forever'],
              answerIndex: 2,
              feedback: {
                correct: 'Exactly — range(5) runs the body 5 times.',
                incorrect: 'Count the iterations in the visualizer and try again.',
              },
            },
          },
        ],
      },
    },
    {
      id: 'build-first-loop',
      type: 'block_problem',
      title: 'Build your first loop',
      graded: false,
      config: {
        mode: 'sandbox',
        prompt:
          'Drag a loop and a print block into the program, set the count, then press Run. Try different numbers!',
        palette: ['for_range', 'print_text', 'print_var'],
        initial: [],
      },
    },
    {
      id: 'fill-the-loop',
      type: 'block_problem',
      title: 'Finish the loop',
      graded: true,
      config: {
        mode: 'fill_blank',
        prompt: 'Place a print block inside the loop so it prints "Hello!" five times.',
        palette: ['print_text'],
        initial: [{ type: 'for_range', fields: { var: 'i', count: 5 }, slots: { body: [] } }],
        expectedOutput: 'Hello!\nHello!\nHello!\nHello!\nHello!',
      },
    },
    {
      id: 'fix-the-loop',
      type: 'block_problem',
      title: 'Fix the loop',
      graded: true,
      config: {
        mode: 'bugfix',
        prompt:
          'This loop should print the numbers 0, 1, 2, 3, 4 — but it stops too early. Fix the count.',
        palette: [],
        initial: [
          {
            type: 'for_range',
            fields: { var: 'i', count: 3 },
            slots: { body: [{ type: 'print_var', fields: { var: 'i' } }] },
          },
        ],
        expectedOutput: '0\n1\n2\n3\n4',
      },
    },
    {
      id: 'loop-it-yourself',
      type: 'block_problem',
      title: 'Loop it yourself',
      graded: true,
      config: {
        mode: 'fill_blank',
        prompt: 'Build a loop from scratch that prints "Hi" exactly 4 times.',
        palette: ['for_range', 'print_text', 'print_var'],
        initial: [],
        expectedOutput: 'Hi\nHi\nHi\nHi',
      },
    },
  ],
}
