// L5 — Making decisions. Teaches: if / elif / else, indentation of a block body,
// and that Python runs the first matching branch. Includes a Parsons problem.
export const l5MakingDecisions = {
  id: 'l5-making-decisions',
  title: 'Making Decisions',
  version: 1,
  steps: [
    {
      id: 'intro',
      type: 'article',
      title: 'If this, then that',
      graded: false,
      config: {
        panels: [
          {
            text: 'An **`if`** runs its indented lines only when its question is True. **`elif`** and **`else`** offer other paths. Python checks top to bottom and runs the **first** match. Step the value and watch.',
            activity: {
              kind: 'widget',
              widget: 'branch_visualizer',
              config: {
                conditions: [
                  { divisor: 3, label: 'print "Fizz"' },
                  { divisor: 5, label: 'print "Buzz"' },
                ],
                elseLabel: 'print the number',
                max: 15,
              },
            },
          },
          {
            text: 'Quick check:',
            activity: {
              kind: 'checkpoint',
              prompt: 'For n = 15 with "if multiple of 3 → Fizz" then "elif multiple of 5 → Buzz", which runs?',
              choices: ['Fizz (the first match)', 'Buzz', 'both'],
              answerIndex: 0,
              feedback: {
                correct: 'Right — the first matching branch wins, so Fizz.',
                incorrect: 'Only the first matching branch runs, and 15 matches the 3 check first.',
              },
            },
          },
        ],
      },
    },
    {
      id: 'order-the-branches',
      type: 'parsons_problem',
      title: 'Build the decision',
      graded: true,
      config: {
        prompt: 'Put these lines in order (and indent them) so it prints "Fizz" when i is a multiple of 3, otherwise the number.',
        checkIndent: true,
        lines: [
          { id: 'if', code: 'if i % 3 == 0:', indent: 0 },
          { id: 'fizz', code: 'print("Fizz")', indent: 1 },
          { id: 'else', code: 'else:', indent: 0 },
          { id: 'num', code: 'print(i)', indent: 1 },
        ],
      },
    },
    {
      id: 'if-else-blocks',
      type: 'block_problem',
      title: 'Fizz or number',
      graded: true,
      config: {
        mode: 'fill_blank',
        prompt:
          'Set i to 10. The if checks if i is a multiple of 3; otherwise the else prints the number. Is 10 a multiple of 3? Change i to 10 and Run to find out.',
        palette: [],
        requiredConstructs: ['conditional'],
        initial: [
          {
            type: 'assign',
            slots: {
              target: [{ type: 'var', fields: { name: 'i' } }],
              value: [{ type: 'num', fields: { value: 9 } }],
            },
          },
          {
            type: 'if_block',
            slots: {
              cond: [
                {
                  type: 'compare',
                  fields: { op: '==' },
                  slots: {
                    left: [
                      {
                        type: 'binop',
                        fields: { op: '%' },
                        slots: {
                          left: [{ type: 'var', fields: { name: 'i' } }],
                          right: [{ type: 'num', fields: { value: 3 } }],
                        },
                      },
                    ],
                    right: [{ type: 'num', fields: { value: 0 } }],
                  },
                },
              ],
              body: [{ type: 'print', slots: { value: [{ type: 'str', fields: { value: 'Fizz' } }] } }],
            },
          },
          {
            type: 'else_block',
            slots: { body: [{ type: 'print', slots: { value: [{ type: 'var', fields: { name: 'i' } }] } }] },
          },
        ],
        expectedOutput: '10',
      },
    },
    {
      id: 'if-elif-else',
      type: 'block_problem',
      title: 'Fizz, Buzz, or number',
      graded: true,
      config: {
        mode: 'fill_blank',
        prompt:
          'Now three paths. i is 5. if multiple of 3 → Fizz, elif multiple of 5 → Buzz, else the number. Run to see which branch wins for 5.',
        palette: [],
        requiredConstructs: ['conditional'],
        initial: [
          {
            type: 'assign',
            slots: {
              target: [{ type: 'var', fields: { name: 'i' } }],
              value: [{ type: 'num', fields: { value: 5 } }],
            },
          },
          {
            type: 'if_block',
            slots: {
              cond: [
                {
                  type: 'compare',
                  fields: { op: '==' },
                  slots: {
                    left: [
                      {
                        type: 'binop',
                        fields: { op: '%' },
                        slots: {
                          left: [{ type: 'var', fields: { name: 'i' } }],
                          right: [{ type: 'num', fields: { value: 3 } }],
                        },
                      },
                    ],
                    right: [{ type: 'num', fields: { value: 0 } }],
                  },
                },
              ],
              body: [{ type: 'print', slots: { value: [{ type: 'str', fields: { value: 'Fizz' } }] } }],
            },
          },
          {
            type: 'elif_block',
            slots: {
              cond: [
                {
                  type: 'compare',
                  fields: { op: '==' },
                  slots: {
                    left: [
                      {
                        type: 'binop',
                        fields: { op: '%' },
                        slots: {
                          left: [{ type: 'var', fields: { name: 'i' } }],
                          right: [{ type: 'num', fields: { value: 5 } }],
                        },
                      },
                    ],
                    right: [{ type: 'num', fields: { value: 0 } }],
                  },
                },
              ],
              body: [{ type: 'print', slots: { value: [{ type: 'str', fields: { value: 'Buzz' } }] } }],
            },
          },
          {
            type: 'else_block',
            slots: { body: [{ type: 'print', slots: { value: [{ type: 'var', fields: { name: 'i' } }] } }] },
          },
        ],
        expectedOutput: 'Buzz',
      },
    },
  ],
}
