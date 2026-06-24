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
          'Snap blocks together to make a loop. Drop a range into the loop\u2019s empty slot, edit the numbers, then press Run. Try different values!',
        palette: ['for_each', 'print', 'range_call'],
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
        prompt: 'Drop a print block into the loop body so it prints "Hello!" five times.',
        palette: ['print'],
        initial: [
          {
            type: 'for_each',
            slots: {
              var: [{ type: 'var', fields: { name: 'i' } }],
              iter: [
                {
                  type: 'range_call',
                  slots: {
                    start: [{ type: 'num', fields: { value: 0 } }],
                    stop: [{ type: 'num', fields: { value: 5 } }],
                  },
                },
              ],
              body: [],
            },
          },
        ],
        expectedOutput: 'Hello!\nHello!\nHello!\nHello!\nHello!',
        requireLoop: true,
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
          'This loop should print the numbers 0, 1, 2, 3, 4 — but it stops too early. Fix the stop value.',
        palette: [],
        initial: [
          {
            type: 'for_each',
            slots: {
              var: [{ type: 'var', fields: { name: 'i' } }],
              iter: [
                {
                  type: 'range_call',
                  slots: {
                    start: [{ type: 'num', fields: { value: 0 } }],
                    stop: [{ type: 'num', fields: { value: 3 } }],
                  },
                },
              ],
              body: [{ type: 'print', slots: { value: [{ type: 'var', fields: { name: 'i' } }] } }],
            },
          },
        ],
        expectedOutput: '0\n1\n2\n3\n4',
        requireLoop: true,
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
        palette: ['for_each', 'print', 'range_call'],
        initial: [],
        expectedOutput: 'Hi\nHi\nHi\nHi',
        requireLoop: true,
      },
    },
    {
      id: 'now-you-type-it',
      type: 'python_sandbox',
      title: 'Now type it yourself',
      graded: false,
      config: {
        prompt: 'Here is the same loop as real Python code. Press Run to see it work.',
        starterCode: 'for i in range(3):\n    print("Hello!")\n',
        testCases: [],
      },
    },
    {
      id: 'count-1-to-5',
      type: 'python_sandbox',
      title: 'Count to five',
      graded: true,
      config: {
        prompt: 'Write a loop that prints the numbers 1, 2, 3, 4, 5 — each on its own line.',
        starterCode: 'for i in range(1, 6):\n    print(i)\n',
        testCases: [
          {
            stdin: '',
            expectedStdout: '1\n2\n3\n4\n5',
            feedback: 'range(1, 6) gives 1, 2, 3, 4, 5 — it stops before 6.',
          },
        ],
        requireLoop: true,
      },
    },
    {
      id: 'repeat-n-times',
      type: 'python_sandbox',
      title: 'Repeat n times',
      graded: true,
      config: {
        prompt: 'Read a number n with input(), then print "Hi" that many times.',
        starterCode: 'n = int(input())\n# print "Hi" n times\n',
        testCases: [
          { stdin: '3', expectedStdout: 'Hi\nHi\nHi' },
          {
            stdin: '1',
            expectedStdout: 'Hi',
            feedback: 'Use range(n) so the loop runs exactly n times.',
          },
        ],
        requireLoop: true,
      },
    },
    {
      id: 'count-to-n',
      type: 'python_sandbox',
      title: 'Count to n',
      graded: true,
      config: {
        prompt: 'Read a number n with input(), then print every number from 1 to n.',
        starterCode: 'n = int(input())\n',
        testCases: [
          { stdin: '3', expectedStdout: '1\n2\n3' },
          {
            stdin: '5',
            expectedStdout: '1\n2\n3\n4\n5',
            feedback: 'range(1, n + 1) counts from 1 up to and including n.',
          },
        ],
        requireLoop: true,
      },
    },
  ],
}
