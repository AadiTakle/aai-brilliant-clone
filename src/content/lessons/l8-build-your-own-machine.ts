// L8 — Build your own machine. Teaches: defining a function with def and giving
// back a value with return; reinforces that print and range are also functions.
// Typed Python (def is awkward to express as blocks for this age group).
export const l8BuildYourOwnMachine = {
  id: 'l8-build-your-own-machine',
  title: 'Build Your Own Machine',
  version: 1,
  steps: [
    {
      id: 'intro',
      type: 'article',
      title: 'Make your own function',
      graded: false,
      config: {
        panels: [
          {
            text: 'You have used built-in functions like `print` and `range`. With **`def`** you can build your own machine that turns an input into an output. Here is a `double` machine.',
            activity: {
              kind: 'widget',
              widget: 'function_machine',
              config: {
                fnName: 'double',
                cases: [
                  { input: '4', output: '8' },
                  { input: '10', output: '20' },
                ],
                caption: 'double(n) gives back n times 2 using return.',
              },
            },
          },
          {
            text: 'Quick check:',
            activity: {
              kind: 'checkpoint',
              prompt: 'Which keyword starts the definition of a new function?',
              choices: ['def', 'for', 'print'],
              answerIndex: 0,
              feedback: {
                correct: 'Yes — def names a new function and lists its inputs.',
                incorrect: 'def creates a function; for makes a loop and print shows output.',
              },
            },
          },
        ],
      },
    },
    {
      id: 'define-double',
      type: 'python_sandbox',
      title: 'Finish the machine',
      graded: true,
      config: {
        prompt:
          'Finish double(n) so it returns n * 2. Then print(double(6)) hands the returned value (12) to print.',
        starterCode: 'def double(n):\n    return \n\nprint(double(6))\n',
        testCases: [
          { stdin: '', expectedStdout: '12', feedback: 'return n * 2 sends back twice the input; double(6) gives 12.' },
        ],
      },
    },
  ],
}
