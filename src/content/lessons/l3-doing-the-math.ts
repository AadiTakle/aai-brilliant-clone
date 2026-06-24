// L3 — Doing the math. Teaches: arithmetic, the remainder operator %, that an
// expression is itself a value you can use directly (print the result without a
// temp variable), and string + string concatenation.
export const l3DoingTheMath = {
  id: 'l3-doing-the-math',
  title: 'Doing the Math',
  version: 1,
  steps: [
    {
      id: 'intro',
      type: 'article',
      title: 'Remainders',
      graded: false,
      config: {
        panels: [
          {
            text: 'Python does math with `+ - * /`. There is also **`%`** (remainder): it tells you what is left over after dividing. Step the machine and watch the remainder.',
            activity: {
              kind: 'widget',
              widget: 'remainder_machine',
              config: { divisor: 3, max: 9, caption: 'When the remainder is 0, the number divides evenly.' },
            },
          },
          {
            text: 'Numbers with remainder 0 are **multiples**. Tap every multiple of 3.',
            activity: {
              kind: 'widget',
              widget: 'multiples_grid',
              config: { upTo: 15, factor: 3 },
            },
          },
          {
            text: 'Quick check:',
            activity: {
              kind: 'checkpoint',
              prompt: 'What is 7 % 3 (the remainder of 7 divided by 3)?',
              choices: ['0', '1', '2'],
              answerIndex: 1,
              feedback: {
                correct: '7 = 3 + 3 + 1, so the remainder is 1.',
                incorrect: '3 goes into 7 twice (6), leaving 1 left over.',
              },
            },
          },
        ],
      },
    },
    {
      id: 'use-modulo-directly',
      type: 'block_problem',
      title: 'Find the remainder',
      graded: true,
      config: {
        mode: 'fill_blank',
        prompt:
          'This prints the remainder of 10 ÷ ? directly — the result of % goes straight into print, no variable needed. Change the second number to 3 so it prints 10 % 3.',
        palette: [],
        requiredConstructs: ['modulo'],
        initial: [
          {
            type: 'print',
            slots: {
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
        ],
        expectedOutput: '1',
      },
    },
    {
      id: 'concatenate-strings',
      type: 'block_problem',
      title: 'Glue words together',
      graded: true,
      config: {
        mode: 'fill_blank',
        prompt: 'Adding strings glues them end to end. Change the second word to Buzz so the program prints FizzBuzz.',
        palette: [],
        initial: [
          {
            type: 'print',
            slots: {
              value: [
                {
                  type: 'binop',
                  fields: { op: '+' },
                  slots: {
                    left: [{ type: 'str', fields: { value: 'Fizz' } }],
                    right: [{ type: 'str', fields: { value: 'Pop' } }],
                  },
                },
              ],
            },
          },
        ],
        expectedOutput: 'FizzBuzz',
      },
    },
    {
      id: 'modulo-typed',
      type: 'python_sandbox',
      title: 'Type the remainder',
      graded: true,
      config: {
        prompt: 'In real Python: print the remainder when 20 is divided by 6, using % and printing the result directly.',
        starterCode: 'print(20 % 6)\n',
        requiredConstructs: ['modulo'],
        testCases: [
          { stdin: '', expectedStdout: '2', feedback: '20 = 6 + 6 + 6 + 2, so 20 % 6 is 2.' },
        ],
      },
    },
  ],
}
