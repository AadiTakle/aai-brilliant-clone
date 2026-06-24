// L4 — True or False. Teaches: comparisons produce a boolean, using that result
// directly, comparing numbers (i % 3 == 0) and comparing strings (label == "").
export const l4TrueOrFalse = {
  id: 'l4-true-or-false',
  title: 'True or False',
  version: 1,
  steps: [
    {
      id: 'intro',
      type: 'article',
      title: 'Asking yes/no questions',
      graded: false,
      config: {
        panels: [
          {
            text: 'A **comparison** asks a yes/no question. The answer is a **boolean**: `True` or `False`. Try operators like `==` (equal?), `>`, `<`. Make it say both True and False.',
            activity: {
              kind: 'widget',
              widget: 'comparison_explorer',
              config: { left: 3, right: 5, caption: 'Note: == compares; a single = would store a value.' },
            },
          },
          {
            text: 'Quick check:',
            activity: {
              kind: 'checkpoint',
              prompt: 'What does 4 > 10 give?',
              choices: ['True', 'False'],
              answerIndex: 1,
              feedback: {
                correct: '4 is not greater than 10, so it is False.',
                incorrect: '4 is smaller than 10, so 4 > 10 is False.',
              },
            },
          },
        ],
      },
    },
    {
      id: 'compare-numbers',
      type: 'block_problem',
      title: 'Is it a multiple?',
      graded: true,
      config: {
        mode: 'fill_blank',
        prompt:
          'We set i to 9. This asks "is i a multiple of 3?" by checking i % 3 == 0. Run it to print the True/False answer.',
        palette: [],
        initial: [
          {
            type: 'assign',
            slots: {
              target: [{ type: 'var', fields: { name: 'i' } }],
              value: [{ type: 'num', fields: { value: 9 } }],
            },
          },
          {
            type: 'print',
            slots: {
              value: [
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
            },
          },
        ],
        expectedOutput: 'True',
      },
    },
    {
      id: 'compare-strings',
      type: 'block_problem',
      title: 'Empty or not?',
      graded: true,
      config: {
        mode: 'fill_blank',
        prompt:
          'You can compare text too. The box label holds "" (empty text). Run to check whether label == "" is True.',
        palette: [],
        initial: [
          {
            type: 'assign',
            slots: {
              target: [{ type: 'var', fields: { name: 'label' } }],
              value: [{ type: 'str', fields: { value: '' } }],
            },
          },
          {
            type: 'print',
            slots: {
              value: [
                {
                  type: 'compare',
                  fields: { op: '==' },
                  slots: {
                    left: [{ type: 'var', fields: { name: 'label' } }],
                    right: [{ type: 'str', fields: { value: '' } }],
                  },
                },
              ],
            },
          },
        ],
        expectedOutput: 'True',
      },
    },
  ],
}
