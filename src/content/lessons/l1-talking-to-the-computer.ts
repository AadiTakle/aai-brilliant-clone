// L1 — Talking to the computer. Teaches: output with print(), text/strings need
// quotes, calling a function, and passing an expression result straight into a
// function (print(2 + 3)). First principles: a function takes an input and does
// a job.
export const l1TalkingToTheComputer = {
  id: 'l1-talking-to-the-computer',
  title: 'Talking to the Computer',
  version: 1,
  steps: [
    {
      id: 'intro',
      type: 'article',
      title: 'Say something',
      graded: false,
      config: {
        panels: [
          {
            text: 'Meet **`print`** — a *function*. You hand it something, it does a job: it shows that thing on the screen. Feed the machine and watch.',
            activity: {
              kind: 'widget',
              widget: 'function_machine',
              config: {
                fnName: 'print',
                cases: [
                  { input: '"Hello!"', output: 'Hello!' },
                  { input: '"Python is fun"', output: 'Python is fun' },
                ],
                caption: 'Whatever you put inside the parentheses comes back out on the screen.',
              },
            },
          },
          {
            text: 'Text must be wrapped in **quotes** `"like this"`. The quotes tell Python "these are words, not commands."',
            activity: {
              kind: 'checkpoint',
              prompt: 'Which line correctly prints the word Hello?',
              choices: ['print(Hello)', 'print("Hello")', 'print"Hello"'],
              answerIndex: 1,
              feedback: {
                correct: 'Yes — text goes inside parentheses AND quotes.',
                incorrect: 'Text needs quotes, and print needs parentheses: print("Hello").',
              },
            },
          },
        ],
      },
    },
    {
      id: 'print-a-string',
      type: 'block_problem',
      title: 'Make it talk',
      graded: true,
      config: {
        mode: 'fill_blank',
        prompt: 'Drag a print block into the program and change its text so it prints exactly: Good morning!',
        palette: ['print'],
        initial: [],
        expectedOutput: 'Good morning!',
      },
    },
    {
      id: 'print-an-expression',
      type: 'python_sandbox',
      title: 'Print the answer',
      graded: true,
      config: {
        prompt:
          'Now in real Python. Type print(2 + 3) and Run. Python does the math 2 + 3 first, then hands the result (5) to print — no need to store it first.',
        starterCode: 'print(2 + 3)\n',
        testCases: [
          {
            stdin: '',
            expectedStdout: '5',
            feedback: 'print(2 + 3) computes 2 + 3 = 5, then prints 5.',
          },
        ],
      },
    },
  ],
}
