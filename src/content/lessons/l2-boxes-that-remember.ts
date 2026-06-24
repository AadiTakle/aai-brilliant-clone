// L2 — Boxes that remember. Teaches: variables as named boxes, assignment with
// =, reassignment (the box forgets the old value / last write wins), printing a
// variable, and the int-vs-string distinction.
export const l2BoxesThatRemember = {
  id: 'l2-boxes-that-remember',
  title: 'Boxes that Remember',
  version: 1,
  steps: [
    {
      id: 'intro',
      type: 'article',
      title: 'A box with a name',
      graded: false,
      config: {
        panels: [
          {
            text: 'A **variable** is a labelled box that holds one value. `score = 10` means "put 10 in the box called score." Store new values and watch the box.',
            activity: {
              kind: 'widget',
              widget: 'variable_box',
              config: {
                name: 'score',
                values: [0, 10, 25],
                caption: 'The box only ever holds the most recent value.',
              },
            },
          },
          {
            text: 'Values have **types**. A *number* (like `42`) can do math. *Text* in quotes (like `"cat"`) is a **string**. Sort each one.',
            activity: {
              kind: 'widget',
              widget: 'type_sorter',
              config: {
                items: [
                  { label: '42', type: 'number' },
                  { label: '"cat"', type: 'text' },
                  { label: '7', type: 'number' },
                  { label: '"hi"', type: 'text' },
                ],
              },
            },
          },
          {
            text: 'Quick check on reassignment:',
            activity: {
              kind: 'checkpoint',
              prompt: 'After x = 5 and then x = 9, what is in the box x?',
              choices: ['5', '9', 'both 5 and 9'],
              answerIndex: 1,
              feedback: {
                correct: 'Right — the second value replaced the first.',
                incorrect: 'A box holds one value; x = 9 replaced the 5.',
              },
            },
          },
        ],
      },
    },
    {
      id: 'store-and-print-text',
      type: 'block_problem',
      title: 'Store some text',
      graded: true,
      config: {
        mode: 'fill_blank',
        prompt: 'The box word holds the text "Hi". Change the text to Hello so the program prints Hello.',
        palette: [],
        initial: [
          {
            type: 'assign',
            slots: {
              target: [{ type: 'var', fields: { name: 'word' } }],
              value: [{ type: 'str', fields: { value: 'Hi' } }],
            },
          },
          { type: 'print', slots: { value: [{ type: 'var', fields: { name: 'word' } }] } },
        ],
        expectedOutput: 'Hello',
      },
    },
    {
      id: 'last-value-wins',
      type: 'block_problem',
      title: 'Last value wins',
      graded: true,
      config: {
        mode: 'fill_blank',
        prompt:
          'Two lines set the box n. Change the second value to 9 so that n ends up holding 9, then Run. (The last assignment wins.)',
        palette: [],
        initial: [
          {
            type: 'assign',
            slots: {
              target: [{ type: 'var', fields: { name: 'n' } }],
              value: [{ type: 'num', fields: { value: 3 } }],
            },
          },
          {
            type: 'assign',
            slots: {
              target: [{ type: 'var', fields: { name: 'n' } }],
              value: [{ type: 'num', fields: { value: 3 } }],
            },
          },
          { type: 'print', slots: { value: [{ type: 'var', fields: { name: 'n' } }] } },
        ],
        expectedOutput: '9',
      },
    },
  ],
}
