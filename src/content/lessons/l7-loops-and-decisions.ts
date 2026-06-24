// L7 — Loops and decisions together. Teaches: putting an if inside a loop, the
// accumulator pattern (read a variable, add to it, store it back:
// label = label + "Fizz"), and tracing what the program does. Bridges directly
// to the FizzBuzzPop capstone.
export const l7LoopsAndDecisions = {
  id: 'l7-loops-and-decisions',
  title: 'Loops and Decisions',
  version: 1,
  steps: [
    {
      id: 'intro',
      type: 'article',
      title: 'Building up an answer',
      graded: false,
      config: {
        panels: [
          {
            text: 'A variable can **build up** a result: read its old value, add to it, and store it back. `label = label + "Fizz"` means "new label = old label glued to Fizz." Step through and watch label grow.',
            activity: {
              kind: 'widget',
              widget: 'code_tracer',
              config: {
                code: ['label = ""', 'label = label + "Fizz"', 'label = label + "Buzz"', 'print(label)'],
                steps: [
                  { line: 0, vars: { label: '' } },
                  { line: 1, vars: { label: 'Fizz' } },
                  { line: 2, vars: { label: 'FizzBuzz' } },
                  { line: 3, vars: { label: 'FizzBuzz' }, output: 'FizzBuzz' },
                ],
                caption: 'This "accumulator" pattern is the heart of FizzBuzzPop.',
              },
            },
          },
          {
            text: 'Quick check:',
            activity: {
              kind: 'checkpoint',
              prompt: 'If label is "Fizz" and we run label = label + "Buzz", what is label now?',
              choices: ['"Buzz"', '"FizzBuzz"', '"Fizz"'],
              answerIndex: 1,
              feedback: {
                correct: 'Right — old value "Fizz" glued to "Buzz" makes "FizzBuzz".',
                incorrect: 'It reads the old value "Fizz" first, then adds "Buzz" → "FizzBuzz".',
              },
            },
          },
        ],
      },
    },
    {
      id: 'accumulate-label',
      type: 'block_problem',
      title: 'Add to the label',
      graded: true,
      config: {
        mode: 'fill_blank',
        prompt:
          'i is 9. label starts empty. The if adds "Fizz" to label when i is a multiple of 3. Run to print the final label.',
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
            type: 'assign',
            slots: {
              target: [{ type: 'var', fields: { name: 'label' } }],
              value: [{ type: 'str', fields: { value: '' } }],
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
              body: [
                {
                  type: 'assign',
                  slots: {
                    target: [{ type: 'var', fields: { name: 'label' } }],
                    value: [
                      {
                        type: 'binop',
                        fields: { op: '+' },
                        slots: {
                          left: [{ type: 'var', fields: { name: 'label' } }],
                          right: [{ type: 'str', fields: { value: 'Fizz' } }],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
          { type: 'print', slots: { value: [{ type: 'var', fields: { name: 'label' } }] } },
        ],
        expectedOutput: 'Fizz',
      },
    },
    {
      id: 'order-loop-and-if',
      type: 'parsons_problem',
      title: 'Loop with a decision',
      graded: true,
      config: {
        prompt:
          'Arrange these lines so the program loops i from 0 to 2 and prints "Fizz" when i is a multiple of 3, otherwise the number.',
        checkIndent: true,
        lines: [
          { id: 'for', code: 'for i in range(3):', indent: 0 },
          { id: 'if', code: 'if i % 3 == 0:', indent: 1 },
          { id: 'fizz', code: 'print("Fizz")', indent: 2 },
          { id: 'else', code: 'else:', indent: 1 },
          { id: 'num', code: 'print(i)', indent: 2 },
        ],
      },
    },
    {
      id: 'loop-if-together',
      type: 'block_problem',
      title: 'Fizz across a range',
      graded: true,
      config: {
        mode: 'fill_blank',
        prompt:
          'Loop i from 1 to 3. For each i: print "Fizz" if it is a multiple of 3, otherwise print the number. Run it.',
        palette: [],
        requiredConstructs: ['loop', 'conditional'],
        initial: [
          {
            type: 'for_each',
            slots: {
              var: [{ type: 'var', fields: { name: 'i' } }],
              iter: [
                {
                  type: 'range_call',
                  slots: {
                    start: [{ type: 'num', fields: { value: 1 } }],
                    stop: [{ type: 'num', fields: { value: 4 } }],
                  },
                },
              ],
              body: [
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
                  slots: {
                    body: [{ type: 'print', slots: { value: [{ type: 'var', fields: { name: 'i' } }] } }],
                  },
                },
              ],
            },
          },
        ],
        expectedOutput: '1\n2\nFizz',
      },
    },
  ],
}
