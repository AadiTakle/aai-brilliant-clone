// L3 — What's Remaining? Teaches ONE idea well: the remainder operator %.
//
// Flow:
//   3.1  intro              — spin a dial to pick a number and watch `% 3` leave a
//                             remainder (modulo_picker), then spot the pattern among
//                             the numbers whose remainder was 0 (checkpoint).
//   3.2  fix-the-remainder  — a bugged program that should find the remainder of
//                             10 ÷ 3 using a `remainder` variable; fix the value
//                             (blocks locked: edit, don't delete).
//   3.4  type-the-remainder — write it yourself in real Python from a bare scaffold.
//
// Concatenation used to live here; it now belongs to a later lesson so L3 stays
// focused entirely on the modulo operator.
export const l3DoingTheMath = {
  id: 'l3-doing-the-math',
  title: "What's Remaining?",
  version: 2,
  steps: [
    {
      id: 'intro',
      type: 'article',
      title: 'What is left over?',
      graded: false,
      config: {
        panels: [
          {
            text: 'Python has a special math sign: **`%`**. It tells you the **remainder** — the amount left over after a number is shared into equal groups. Spin the dial to pick a number and watch what `% 3` leaves behind.',
            activity: {
              kind: 'widget',
              widget: 'modulo_picker',
              config: { max: 15, divisor: 3 },
            },
          },
          {
            text: 'Some of the numbers you tried left a remainder of **0**. Take a close look.',
            activity: {
              kind: 'checkpoint',
              prompt:
                'The inputs that left a remainder of 0 were 0, 3, 6, 9, 12, and 15. What do all of these numbers have in common?',
              choices: [
                'They are all even numbers',
                'They are all multiples of 3',
                'They all end in 0 or 5',
              ],
              answerIndex: 1,
              feedback: {
                correct:
                  'Exactly! When a number % 3 is 0, that number is a multiple of 3 — it splits into groups of 3 with nothing left over.',
                incorrect:
                  'Not quite — try dividing each of those numbers by 3 and see what they all share.',
              },
            },
          },
        ],
      },
    },
    {
      id: 'fix-the-remainder',
      type: 'block_problem',
      title: 'Fix the remainder',
      graded: true,
      config: {
        mode: 'bugfix',
        prompt:
          'This program should find the remainder of 10 ÷ 3 and store it in a box called remainder, then print it — but it prints the wrong number. Change a value so it correctly finds the remainder of 10 divided by 3. Remember: the % operator gives the remainder left over after a division. (You can edit the numbers, but you cannot delete the blocks.)',
        palette: [],
        lockBlocks: true,
        requiredConstructs: ['modulo'],
        // Printing must go through the box: typing the answer (e.g. 1) straight into
        // print() instead of printing `remainder` is rejected with an answer-free
        // hint — same guard used for the print in L2's store-and-print-text.
        requirePrintVar: 'remainder',
        initial: [
          {
            type: 'assign',
            slots: {
              target: [{ type: 'var', fields: { name: 'remainder' } }],
              value: [
                {
                  type: 'binop',
                  fields: { op: '%' },
                  slots: {
                    left: [{ type: 'num', fields: { value: 10 } }],
                    right: [{ type: 'num', fields: { value: 4 } }],
                  },
                },
              ],
            },
          },
          { type: 'print', slots: { value: [{ type: 'var', fields: { name: 'remainder' } }] } },
        ],
        expectedOutput: '1',
      },
    },
    {
      id: 'type-the-remainder',
      type: 'python_sandbox',
      title: 'Type the remainder',
      graded: true,
      config: {
        prompt:
          'Now write it yourself in real Python. Finish the program so the box called remainder ends up holding the remainder of 10 divided by 3, then prints it. You choose the right math to make that happen.',
        starterCode:
          '# Goal: find the remainder of 10 divided by 3.\nremainder =   # write the math that gives the remainder here\nprint(remainder)\n',
        requiredConstructs: ['modulo'],
        successMessage: 'Nice work — you figured out the remainder all on your own!',
        testCases: [
          {
            stdin: '',
            expectedStdout: '1',
            feedback:
              'Not yet — this is a job for the remainder operator % you met earlier in this lesson. Use it to fill in the value of remainder.',
          },
        ],
      },
    },
  ],
}
