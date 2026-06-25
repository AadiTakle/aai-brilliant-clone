// L9 — Capstone: FizzBuzzPop. The learner writes the whole program from a nearly
// blank editor. Every construct used here was taught earlier (see the coverage
// matrix in documentation/python-curriculum-spec.md). The grader enforces that a
// loop, the % operator, and a conditional are actually used — not hardcoded.
export const l9FizzBuzzPop = {
  id: 'l9-fizzbuzzpop',
  title: 'FizzBuzzPop',
  version: 1,
  steps: [
    {
      id: 'the-rules',
      type: 'article',
      title: 'The challenge',
      graded: false,
      config: {
        panels: [
          {
            text:
              'Time to put it all together! Print the numbers **1 to 21**, one per line, but:\n\n- multiple of **3** → print **Fizz**\n- multiple of **5** → print **Buzz**\n- multiple of **7** → print **Pop**\n- more than one → join them (15 → **FizzBuzz**, 21 → **FizzPop**)\n- none → print the **number**',
          },
          {
            text: 'Plan first:',
            activity: {
              kind: 'checkpoint',
              prompt: 'What should print for 15 (a multiple of both 3 and 5)?',
              choices: ['Fizz', 'Buzz', 'FizzBuzz', '15'],
              answerIndex: 2,
              feedback: {
                correct: 'Right — 15 matches 3 and 5, so glue Fizz and Buzz into FizzBuzz.',
                incorrect: '15 is a multiple of 3 AND 5, so join both labels: FizzBuzz.',
              },
            },
          },
        ],
      },
    },
    {
      id: 'capstone',
      type: 'python_sandbox',
      title: 'Write FizzBuzzPop',
      graded: true,
      config: {
        prompt:
          'FizzBuzzPop — the finale! Print the numbers 1 to 21, one per line. The rules: a multiple of 3 prints Fizz; a multiple of 5 prints Buzz; a multiple of 7 prints Pop. If a number matches more than one rule, join them in that order — so 15 prints FizzBuzz and 21 prints FizzPop. If it matches no rule, print the number itself. Start from n = 21. Everything you need, you have already used.',
        starterCode: 'n = 21\n# Write your FizzBuzzPop here\n',
        requiredConstructs: ['loop', 'modulo', 'conditional'],
        successMessage:
          'You did it — you wrote FizzBuzzPop from scratch! That is the whole arc come together: a loop, the % operator, ifs, and a label you built up yourself. Real programmers solve problems exactly like this. 🎉',
        testCases: [
          {
            stdin: '',
            expectedStdout:
              '1\n2\nFizz\n4\nBuzz\nFizz\nPop\n8\nFizz\nBuzz\n11\nFizz\n13\nPop\nFizzBuzz\n16\n17\nFizz\n19\nBuzz\nFizzPop',
          },
        ],
      },
    },
  ],
}
