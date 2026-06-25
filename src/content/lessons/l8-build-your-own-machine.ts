// L8 — Build your own machine. Rebuilt for a pure beginner. The arc walks the
// FOUR things a function is, one ACTIVE beat at a time (the learner does or
// predicts something in every step — no long passive paragraphs):
//
//   8.1  intro             — we can build our OWN machines that take an input
//                            and give an output. Reuses the SAME animated,
//                            learner-fed machine interface from L1.1
//                            (function_machine, editable + echoInput). The `def`
//                            keyword is deliberately NOT named yet.
//   8.2 Beat 1  define-a-function — DEFINE: introduce `def NAME(param):`; the
//                            parameter is an input variable the body can use.
//                            Active: identify the parts.
//   8.2 Beat 2  pass-in    — PASS IN: step INTO a call with the program_stepper,
//                            watching the passed-in value become the parameter
//                            inside the body. Active: step + predict.
//   8.2 Beat 3  return-back — RETURN BACK: `return` hands a value to the call
//                            site, execution JUMPS back to the caller, and the
//                            value is USED (printed). Active: step + predict.
//   8.2 Beat 4  write-your-machine — WRITE + USE: the learner writes a small
//                            function AND calls it and uses its result. Answer-
//                            free, failure-specific hints for the classic
//                            mistakes (print-vs-return, body indentation, forgot
//                            to call). NEVER reveals the answer.
//
// Global rule: incorrect-answer feedback nudges toward the fix and never reveals
// (even implicitly) the answer.

type TraceStep = {
  line: number
  commentary: string
  vars?: Record<string, string | number>
  output?: string
}

// The little program both the pass-in and return-back beats step through. Kept
// identical across beats so the learner sees ONE machine from two angles.
// A blank line (index 3) sits between the machine's body and the caller so the
// "jump back" out of the function is visibly a JUMP, not a fall-through.
const DOUBLE_PROGRAM = [
  'def double(n):',
  '    result = n * 2',
  '    return result',
  '',
  'answer = double(5)',
  'print(answer)',
]

// Beat 2 — PASS IN. Start at the call (line 4), jump UP into the machine
// (line 0), watch 5 become the parameter n, then use n in the body (line 1).
// Stops before return — that is Beat 3's job.
const PASS_IN_TRACE: TraceStep[] = [
  {
    line: 4,
    commentary:
      'Start at the call. double(5) means: run the double machine, and hand it the value 5 as its input.',
    vars: {},
  },
  {
    line: 0,
    commentary:
      'Execution jumps UP into the machine. The 5 you passed in becomes the parameter n — so inside the machine, n is 5.',
    vars: { n: 5 },
  },
  {
    line: 1,
    commentary:
      'Now n works like any variable you can use: result = n * 2 = 5 * 2 = 10. The input is doing real work inside the machine.',
    vars: { n: 5, result: 10 },
  },
]

// Beat 3 — RETURN BACK. Same program, but now watch return hand the answer back
// to the call site (line 2 → line 4, jumping past the blank) and the caller USE
// it (line 5, print).
const RETURN_BACK_TRACE: TraceStep[] = [
  {
    line: 4,
    commentary: 'Call double(5) again — this time watch how the finished answer gets back OUT of the machine.',
    vars: {},
  },
  {
    line: 0,
    commentary: 'Jump into the machine. The input 5 becomes the parameter n.',
    vars: { n: 5 },
  },
  {
    line: 1,
    commentary: 'Do the work: result = 5 * 2 = 10.',
    vars: { n: 5, result: 10 },
  },
  {
    line: 2,
    commentary:
      'return result hands the value 10 BACK to the spot that called the machine, and leaves the function right away.',
    vars: { n: 5, result: 10 },
  },
  {
    line: 4,
    commentary:
      'We land back at the call. double(5) has turned INTO the value 10, so answer is now 10. The returned value came back to where we started.',
    vars: { answer: 10 },
  },
  {
    line: 5,
    commentary: 'print(answer) USES that returned value and shows 10 on the screen.',
    vars: { answer: 10 },
    output: '10',
  },
]

export const l8BuildYourOwnMachine = {
  id: 'l8-build-your-own-machine',
  title: 'Build Your Own Machine',
  version: 2,
  steps: [
    {
      // 8.1 — we can build our OWN machines. Same animated, learner-fed machine
      // as L1.1 (editable + echoInput). No `def` name-drop yet.
      id: 'intro',
      type: 'article',
      title: 'Build your own machine',
      graded: false,
      config: {
        panels: [
          {
            text: 'You have used machines that came with Python, like **`print`**. But you can also build your **own** machines! Every machine works the same way: an **input** goes in, the machine does its job, and an **output** comes out. Type something below, press Run, and watch it travel through your machine.',
            activity: {
              kind: 'widget',
              widget: 'function_machine',
              config: {
                fnName: 'machine',
                editable: true,
                echoInput: true,
                cases: [{ input: 'Hello!', output: 'Hello!' }],
                caption: 'Feed the machine an input, hit Run, and an output comes out the other side.',
              },
            },
          },
          {
            text: 'Quick check:',
            activity: {
              kind: 'checkpoint',
              prompt: 'What does every machine like this do with what you feed it?',
              choices: [
                'Takes an input and gives back an output',
                'Changes the color of the screen',
                'Erases your whole program',
              ],
              answerIndex: 0,
              feedback: {
                correct: 'Right — something goes in, the machine does its job, and something comes out.',
                incorrect:
                  'Think back to the machine you just ran: something went in, and something came out. Which choice describes that in-then-out flow?',
              },
            },
          },
        ],
      },
    },
    {
      // 8.2 Beat 1 — DEFINE. Introduce `def NAME(param):` and the parameter as an
      // input variable. Active: identify the parts of a real def line.
      id: 'define-a-function',
      type: 'article',
      title: 'Naming your machine',
      graded: false,
      config: {
        panels: [
          {
            text: 'To build a machine you write a **definition** with the keyword **`def`**. It looks like this:\n\n```\ndef double(n):\n```\n\n- **`def`** says "I am building a new machine."\n- **`double`** is the machine\u2019s name (you pick it).\n- **`n`** inside the `( )` is the **parameter** — a name for the input. Whatever value gets fed in, the machine calls it `n` and can use it inside.\n\nYou build the machine **once**, then use it as many times as you want.',
          },
          {
            text: 'Look closely at the line above and answer:',
            activity: {
              kind: 'checkpoint',
              prompt: 'In `def double(n):`, what is `n`?',
              choices: [
                'The name of the machine',
                'The input the machine receives',
                'A number being printed to the screen',
              ],
              answerIndex: 1,
              feedback: {
                correct: 'Yes — `n` is the parameter: a name for whatever input gets fed into the machine.',
                incorrect:
                  'The name right after `def` is what the machine is called. The word inside the parentheses stands for the value you feed in. Which one is `n`?',
              },
            },
          },
        ],
      },
    },
    {
      // 8.2 Beat 2 — PASS IN. Step INTO the call; the argument becomes the
      // parameter inside the body. Active: step the stepper + predict.
      id: 'pass-in',
      type: 'article',
      title: 'Feeding the machine',
      graded: false,
      config: {
        panels: [
          {
            text: 'Now watch a value get **passed in**. The line `answer = double(5)` runs the `double` machine with `5` as its input. Press **Step** and follow the `5` as it jumps into the machine and becomes the parameter `n`.',
            activity: {
              kind: 'widget',
              widget: 'program_stepper',
              config: {
                mode: 'trace',
                code: DOUBLE_PROGRAM,
                steps: PASS_IN_TRACE,
                caption: 'The value you pass in becomes the parameter — the machine\u2019s name for its input.',
              },
            },
          },
          {
            text: 'Predict:',
            activity: {
              kind: 'checkpoint',
              prompt: 'When a call passes a value into a function, what does the parameter hold inside the machine?',
              choices: [
                'Whatever value was passed in',
                'Always the number zero',
                'The name of the machine',
              ],
              answerIndex: 0,
              feedback: {
                correct: 'Right — the parameter becomes a stand-in for whatever value the caller fed in.',
                incorrect:
                  'You just stepped through it: the call handed a value to the machine. What does the parameter become once that value arrives?',
              },
            },
          },
        ],
      },
    },
    {
      // 8.2 Beat 3 — RETURN BACK. return hands a value to the call site and
      // execution jumps back; the value is then USED (printed). Active: step +
      // predict the jump-back.
      id: 'return-back',
      type: 'article',
      title: 'Handing the answer back',
      graded: false,
      config: {
        panels: [
          {
            text: 'A machine gives back its output with the keyword **`return`**. `return` does two things: it hands a value back to the spot that called the machine, and it **jumps right back** to that spot. Press **Step** and watch the answer travel back out — and then get used.',
            activity: {
              kind: 'widget',
              widget: 'program_stepper',
              config: {
                mode: 'trace',
                code: DOUBLE_PROGRAM,
                steps: RETURN_BACK_TRACE,
                caption: 'return sends a value back to the caller — and the caller can store it or print it.',
              },
            },
          },
          {
            text: 'Predict:',
            activity: {
              kind: 'checkpoint',
              prompt: 'After `return result` runs, where does the program go next?',
              choices: [
                'Back to the line that called the function',
                'Down to the next line inside the function',
                'It stops running forever',
              ],
              answerIndex: 0,
              feedback: {
                correct: 'Exactly — return jumps back to wherever the machine was called, carrying the value with it.',
                incorrect:
                  'Watch the highlight in the stepper right after return runs — it leaves the machine. Where does it land?',
              },
            },
          },
        ],
      },
    },
    {
      // 8.2 Beat 4 — WRITE + USE. The learner builds a function AND calls/uses it.
      // Answer-free, failure-specific feedback for the classic beginner mistakes.
      id: 'write-your-machine',
      type: 'python_sandbox',
      title: 'Build it yourself',
      graded: true,
      config: {
        prompt:
          'Your turn to build a machine. Finish the triple function so it gives BACK its input times 3 (use return — not print). Then, below the function, call triple on the number 4 and print what it hands back, so the program shows one number.',
        starterCode:
          'def triple(n):\n    # give back n times 3 here (use return, not print)\n    \n\n# Now call triple on 4 and print what it hands back:\n',
        successMessage:
          'You built your own machine! You defined it with def, used return to hand back an answer, then called it and used what came out — the exact same shape as print and range. That is functions.',
        testCases: [
          {
            stdin: '',
            expectedStdout: '12',
            feedback:
              'Not yet — check three things. 1) Does the machine use return (not print) to hand its answer back? 2) Is the line inside the machine indented underneath the def line? 3) Did you actually CALL triple and print what it gives back?',
          },
        ],
      },
    },
  ],
}
