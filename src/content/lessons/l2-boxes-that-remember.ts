// L2 — Boxes that remember. Teaches: variables as named boxes, assignment with
// =, reassignment (the box forgets the old value / last write wins), printing a
// variable, and the int-vs-string distinction.
//
// Flow:
//   2.1  intro              — drag a NUMBER into a box; watch a new value overwrite the old (value_box).
//   2.2a strings-and-types  — drag TEXT into a box (strings), then sort number vs text (type_sorter).
//   2.2b store-and-print-text — use a variable inside a print block (blocks locked: edit, don't delete).
//   2.3  last-value-wins    — two assignments; the last one wins (blocks locked + reassignment hint).
export const l2BoxesThatRemember = {
  id: 'l2-boxes-that-remember',
  title: 'Boxes that Remember',
  version: 2,
  steps: [
    {
      id: 'intro',
      type: 'article',
      title: 'A box with a name',
      graded: false,
      config: {
        panels: [
          {
            text: 'A **variable** is a labelled box that holds one value. `score = 10` means "put 10 in the box called score." Drag a number into the box — then drag in a different one and watch what happens.',
            activity: {
              kind: 'widget',
              widget: 'value_box',
              config: {
                name: 'score',
                valueType: 'number',
                options: [0, 10, 25],
                caption: 'Drag a value into the box. Each new value pushes the old one out.',
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
                incorrect: 'A box holds just one value at a time — picture which line ran last and what it put in the box.',
              },
            },
          },
        ],
      },
    },
    {
      id: 'strings-and-types',
      type: 'article',
      title: 'Numbers and text',
      graded: false,
      config: {
        panels: [
          {
            text: 'A box can hold **text**, too. Text in quotes is called a **string**, like `"Hi"`. Drag some text into the box, then drag in different text and watch it get replaced.',
            activity: {
              kind: 'widget',
              widget: 'value_box',
              config: {
                name: 'word',
                valueType: 'string',
                options: ['Hi', 'Hello', 'Bye'],
                caption: 'Just like numbers, the box keeps only the most recent text.',
              },
            },
          },
          {
            text: 'Values have **types**. A *number* (like `42`) can do math. *Text* in quotes (like `"cat"`) is a **string**. Sort each one that appears.',
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
                caption: 'Quotes around it? That makes it a string. No quotes, just digits? That is a number.',
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
        prompt:
          'The box word holds the text "Hi", and the next line prints whatever is in word. Edit the stored text so the program prints Hello, then Run. (You can change the words, but you cannot delete the blocks.)',
        palette: [],
        lockBlocks: true,
        // Printing must go through the box: typing "Hello" straight into print()
        // (skipping the variable) is rejected with a unique, answer-free hint.
        requirePrintVar: 'word',
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
          'Both lines store a value in the box n, and the last line prints it. The box should end up holding 9. Make that happen, then Run. (You can change the values, but you cannot delete the lines.)',
        palette: [],
        lockBlocks: true,
        reassignmentVar: 'n',
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
