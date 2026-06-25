// L7 — Loops and decisions together. Rebuilt for a pure beginner heading straight
// into the FizzBuzzPop capstone, and deliberately moving OFF blocks toward typed
// Python. The arc teaches the accumulator pattern (read a variable, add to it,
// store it back) and how an `if`/`else` lives inside a `for` (double indentation).
//
// To keep things at this level we accumulate WORDS, never numbers — so there is no
// str() (turning a number into text) anywhere. The running example is a pseudo-
// FizzBuzz: for each number, glue on "yes" when it is a multiple of 3 and "no"
// when it is not.
//
//   1. intro                       — the accumulator demo (program_stepper trace)
//                                     with per-step commentary teaching read → add
//                                     → store, building "yes no".
//   2. accumulate-in-a-loop        — worked demo: a loop that adds the same word
//                                     each turn (single indent), then the SAME with
//                                     an if/else nested inside that DECIDES yes/no —
//                                     pointing out DOUBLE indentation. Each demo is
//                                     kept short (<= 15 steps to click through).
//   3. order-loop-and-if           — parsons: assemble a loop + if/else that
//                                     ACCUMULATES "yes"/"no" into a string
//                                     (double-indented body), with an answer-free
//                                     both-need-indentation hint.
//   4. accumulate-multiples-of-three — TYPED python_sandbox: write a loop + if/else
//                                     that accumulates "yes"/"no" into a spaced
//                                     string and prints it. Generic (no Fizz).
//
// Global rule: incorrect-answer feedback nudges toward the fix and never reveals
// (even implicitly) the answer.

type TraceStep = {
  line: number
  commentary: string
  vars?: Record<string, string | number>
  output?: string
}

const quote = (s: string) => `"${s}"`

// Worked-demo trace #1: loop a few times and add the SAME word (plus a space) onto
// a string every turn. Single indentation: the accumulate line sits only inside
// the for loop. Kept short so the whole thing is <= 15 steps to click through.
function buildEveryTrace(stop: number, token: string): TraceStep[] {
  const steps: TraceStep[] = [
    {
      line: 0,
      commentary:
        'Start with an empty text box called result — nothing inside it yet. The loop will grow it, just like the demo a moment ago.',
      vars: { result: quote('') },
    },
  ]
  let result = ''
  for (let i = 0; i < stop; i++) {
    steps.push({
      line: 1,
      commentary: i === 0 ? 'The loop begins: i becomes 0.' : `Back to the top: i becomes ${i}.`,
      vars: { i, result: quote(result) },
    })
    const prev = result
    result = result + token + ' '
    steps.push({
      line: 2,
      commentary: `Read result, glue ${quote(token)} and a space onto the end, then store it back. result grows from ${quote(prev)} to ${quote(result)}.`,
      vars: { i, result: quote(result) },
    })
  }
  steps.push({
    line: 3,
    commentary:
      'The loop is finished. Print result once, at the very end — the console shows the whole string the loop built up for you.',
    vars: { i: stop - 1, result: quote(result) },
    output: result,
  })
  return steps
}

// Worked-demo trace #2: the same idea, but now an `if`/`else` inside the loop
// DECIDES which word to add — "yes" for the multiples of `divisor`, "no" for the
// rest. The accumulate lines are now indented TWICE (inside the for AND inside the
// if/else) — the new idea this step exists to land. Kept short (<= 15 steps).
function buildYesNoTrace(stop: number, divisor: number): TraceStep[] {
  const steps: TraceStep[] = [
    {
      line: 0,
      commentary:
        'Again we begin with an empty result. This time an if/else inside the loop decides which word to add.',
      vars: { result: quote('') },
    },
  ]
  let result = ''
  for (let i = 0; i < stop; i++) {
    steps.push({
      line: 1,
      commentary: i === 0 ? 'The loop begins: i becomes 0.' : `Back to the top: i becomes ${i}.`,
      vars: { i, result: quote(result) },
    })
    const isMultiple = i % divisor === 0
    steps.push({
      line: 2,
      commentary: `Check the if: is ${i} % ${divisor} equal to 0? That is ${isMultiple ? 'True' : 'False'}.`,
      vars: { i, result: quote(result) },
    })
    const prev = result
    if (isMultiple) {
      result = result + 'yes '
      steps.push({
        line: 3,
        commentary: `True — so run the line INSIDE the if. Look how far it is pushed in: indented TWICE, once because it lives inside the for loop and again because it lives inside the if. Add "yes " → result grows from ${quote(prev)} to ${quote(result)}.`,
        vars: { i, result: quote(result) },
      })
    } else {
      result = result + 'no '
      steps.push({
        line: 5,
        commentary: `False — so skip the if and run the else line instead. It is indented twice as well. Add "no " → result grows from ${quote(prev)} to ${quote(result)}.`,
        vars: { i, result: quote(result) },
      })
    }
  }
  steps.push({
    line: 6,
    commentary:
      'The loop is finished. Print result — "yes" for every multiple of 3 and "no" for the rest, built up one word at a time.',
    vars: { i: stop - 1, result: quote(result) },
    output: result,
  })
  return steps
}

export const l7LoopsAndDecisions = {
  id: 'l7-loops-and-decisions',
  title: 'Loops and Decisions',
  version: 2,
  steps: [
    {
      // 7.1 — the accumulator demo, stepped through the program_stepper with
      // per-step commentary (the code_tracer showed the values but never explained
      // the read → add → store move). Generic words now (no Fizz/Buzz).
      id: 'intro',
      type: 'article',
      title: 'Building up an answer',
      graded: false,
      config: {
        panels: [
          {
            text: 'A variable can **build up** an answer: read its old value, add something onto it, and store it back. `result = result + "yes "` means "the new result is the old result with `yes` glued onto the end." Press **Step** and watch `result` grow one piece at a time.',
            activity: {
              kind: 'widget',
              widget: 'program_stepper',
              config: {
                mode: 'trace',
                code: ['result = ""', 'result = result + "yes "', 'result = result + "no "', 'print(result)'],
                steps: [
                  {
                    line: 0,
                    commentary:
                      'Make a box called result and put an empty string "" inside it — text with nothing in it yet. This is what we will build up.',
                    vars: { result: quote('') },
                  },
                  {
                    line: 1,
                    commentary:
                      'Read result\u2019s old value (""), glue "yes " onto the end, then store the result back. Now result holds "yes ".',
                    vars: { result: quote('yes ') },
                  },
                  {
                    line: 2,
                    commentary:
                      'The exact same move again: read the old value ("yes "), add "no " onto the end, store it back. result grows to "yes no ".',
                    vars: { result: quote('yes no ') },
                  },
                  {
                    line: 3,
                    commentary:
                      'Print result. The console shows "yes no" — an answer we built up one piece at a time, using this read-add-store move.',
                    vars: { result: quote('yes no ') },
                    output: 'yes no ',
                  },
                ],
                caption: 'This "accumulator" pattern — read, add, store back — is a move you will reach for again and again.',
              },
            },
          },
          {
            text: 'Quick check:',
            activity: {
              kind: 'checkpoint',
              prompt: 'If result is "yes " and we run result = result + "no ", what is result now?',
              choices: ['"no "', '"yes no "', '"yes "'],
              answerIndex: 1,
              feedback: {
                correct: 'Right — the old value "yes " with "no " glued onto the end.',
                incorrect:
                  'Remember the order: it reads the OLD value first, then sticks the new piece onto the end. Glue them in that order and see what you get.',
              },
            },
          },
        ],
      },
    },
    {
      // 7.2 worked demo (before the parsons): accumulation INSIDE a loop, then the
      // same with an if/else nested in — to make double indentation concrete before
      // the learner has to produce it. Both demos kept short (<= 15 steps).
      id: 'accumulate-in-a-loop',
      type: 'article',
      title: 'Building up inside a loop',
      graded: false,
      config: {
        panels: [
          {
            text: 'The real power comes from putting that read-add-store move **inside a loop** so it repeats. Here a loop runs four times and, for now, adds the same word `"no"` — with a space after it — onto `result` every turn. Press **Step** and watch `result` grow. (Nothing prints until the very end.)',
            activity: {
              kind: 'widget',
              widget: 'program_stepper',
              config: {
                mode: 'trace',
                code: ['result = ""', 'for i in range(4):', '    result = result + "no "', 'print(result)'],
                steps: buildEveryTrace(4, 'no'),
                caption: 'The loop repeats the accumulate step for you — no copy-pasting.',
              },
            },
          },
          {
            text: 'Now put an `if`/`else` **inside** the loop so it **decides** the word: `"yes"` for the multiples of 3, `"no"` for the rest. Look closely at the two lines that add to `result`: each is pushed in **twice** — once because it lives inside the `for`, and again because it lives inside the `if` or the `else`. That **double indentation** is new, and the next two steps will have you build it yourself.',
            activity: {
              kind: 'widget',
              widget: 'program_stepper',
              config: {
                mode: 'trace',
                code: [
                  'result = ""',
                  'for i in range(4):',
                  '    if i % 3 == 0:',
                  '        result = result + "yes "',
                  '    else:',
                  '        result = result + "no "',
                  'print(result)',
                ],
                steps: buildYesNoTrace(4, 3),
                caption: 'A line inside an if (or else) that is inside a loop is indented twice.',
              },
            },
          },
        ],
      },
    },
    {
      // 7.3 — parsons: assemble a loop + if/else that ACCUMULATES "yes"/"no" into a
      // string, tying back to 7.1. Body is double-indented. Generic wording (no
      // Fizz). Answer-free indentation hint.
      id: 'order-loop-and-if',
      type: 'parsons_problem',
      title: 'Assemble the accumulator',
      graded: true,
      config: {
        prompt:
          'Arrange the lines so the program walks the numbers 0 to 6 and, for each one, adds "yes " onto a text box called result when the number is a multiple of 3 and "no " when it is not — then prints result at the end. Watch the indentation: the lines that add to result live inside the loop AND inside the if or else.',
        checkIndent: true,
        orderHint:
          'Not quite — this program is built almost exactly like the yes/no loop in the worked demo right before this. Press the Back button to revisit it, study the order its lines run in, then match it here.',
        indentHint:
          'Not quite — remember that BOTH a for loop and an if/else block need the lines inside them indented. The lines that add to result live inside the if (or else), which itself lives inside the for, so think about how far in they have to go.',
        lines: [
          { id: 'init', code: 'result = ""', indent: 0 },
          { id: 'for', code: 'for i in range(7):', indent: 0 },
          { id: 'if', code: 'if i % 3 == 0:', indent: 1 },
          { id: 'acc-yes', code: 'result = result + "yes "', indent: 2 },
          { id: 'else', code: 'else:', indent: 1 },
          { id: 'acc-no', code: 'result = result + "no "', indent: 2 },
          { id: 'print', code: 'print(result)', indent: 0 },
        ],
      },
    },
    {
      // 7.4 — TYPED practice, moving toward complete typed Python. Loop + if/else
      // that accumulates "yes"/"no" into a spaced string, then prints. Generic (no
      // Fizz). Answer-free failure hints, plus a specific "run together / missing
      // spaces" hint via diagnostics.
      id: 'accumulate-multiples-of-three',
      type: 'python_sandbox',
      title: 'Build the sequence yourself',
      graded: true,
      config: {
        prompt:
          'Your turn — by typing. Go through the numbers 0 to 6. For every multiple of 3, add the word "yes" (with a space after it) onto a line of text called result; for every other number, add "no " instead. When the loop is done, print result so it shows one line like "yes no no ...". (Start result as an empty string "", and use an if/else with % to decide which word.)',
        starterCode: 'result = ""\n',
        requiredConstructs: ['loop', 'conditional', 'modulo'],
        successMessage:
          'Yes! You looped, used an if/else with % to decide yes or no for each number, and built the answer up in a string — a powerful pattern you will reuse a lot.',
        testCases: [
          {
            stdin: '',
            expectedStdout: 'yes no no yes no no yes',
            feedback:
              'Not yet — check three things: are you looping through the numbers 0 to 6, are you using an if/else with % to choose "yes" for multiples of 3 and "no" otherwise, and are you adding each word (with a space) onto result?',
          },
        ],
      },
    },
  ],
}
