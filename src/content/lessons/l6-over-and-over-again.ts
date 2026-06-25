// L6 — Over and Over Again. Rebuilt for a pure beginner meeting their first loop.
//
// The arc walks from "repeating by hand is tedious" up to writing a counting
// loop from scratch, one idea at a time:
//   1. intro              — feel the tedium (drag +3 to 15), then watch a loop do
//                           it for you. Reassures: the for-line spelling is next.
//   2. for-loop-syntax    — the three parts of `for i in range(5):` taught as
//                           mini-beats (the variable i, the range, indentation)
//                           and then assembled.
//   3. fix-the-loop-indent— a typed fix-the-bug that drills the indentation rule
//                           (flush-left body → IndentationError), L5-style.
//   4. fill-the-loop      — drop a print into a ready loop so it says Hello 5x.
//   5. fix-the-loop       — a buggy loop printing the wrong numbers; fix it.
//   6. count-with-n       — the DEMO: pick n on a wheel and watch range(1, n + 1)
//                           collapse to a single value before the loop runs.
//   7. print-hi-loop      — write a loop FROM SCRATCH that prints "Hi" four times.
//   8. count-1-to-n       — n is given; write a loop that prints 1..n.
//
// Global rule: incorrect-answer feedback nudges toward the fix and never reveals
// (even implicitly) the answer.
export const l6OverAndOverAgain = {
  id: 'l6-over-and-over-again',
  title: 'Over and Over Again',
  version: 2,
  steps: [
    {
      id: 'intro',
      type: 'article',
      title: 'Doing things again and again',
      graded: false,
      config: {
        panels: [
          {
            // Part 1 — an interactive tedium demo. The learner must DRAG "+3"
            // blocks into the equation, one at a time, until the total hits 15.
            // Repeating the same drag over and over is the whole point.
            text: 'Let\u2019s get to **15** by adding **3** again and again. Drag a **+3** block into the equation \u2014 then do it again, and again, and again.',
            activity: {
              kind: 'widget',
              widget: 'repeated_addition',
              config: {
                value: 3,
                target: 5,
                caption: 'Five separate drags just to add the same 3 each time. Tedious, right?',
              },
            },
          },
          {
            // Part 2 — reuse the program-stepping system to walk a real for-loop
            // that does the same "+3, five times" for the learner. Shows i and a
            // growing console with per-step commentary, and reassures that the
            // for-loop syntax itself is explained in the very next step.
            text: 'Adding 3 by hand five times was **tedious**. In math, when we repeat addition we reach for **multiplication** (3 \u00d7 5 = 15). In code, when we repeat an action we reach for a **loop**. Step through this loop and watch it add 3 for you, five times \u2014 no repeating yourself. Don\u2019t worry about how the `for` line is spelled yet; we\u2019ll **explain the for-loop syntax in the very next step**.',
            activity: {
              kind: 'widget',
              widget: 'program_stepper',
              config: {
                mode: 'loop',
                loopVar: 'i',
                start: 0,
                stop: 5,
                accumulator: { name: 'total', init: 0, step: 3 },
                caption:
                  'Press Step to move one line at a time. The for-loop syntax is explained next \u2014 for now, just watch it work.',
              },
            },
          },
        ],
      },
    },
    {
      // NEW 6.2 — teach the spelling of `for i in range(5):` as three mini-beats
      // (the loop variable, the range, the indentation), then assemble it.
      id: 'for-loop-syntax',
      type: 'article',
      title: 'How a for-loop is spelled',
      graded: false,
      config: {
        panels: [
          {
            // Beat (a): the loop VARIABLE. Step a plain counting loop so the box
            // called i visibly takes each value 0,1,2,3,4 as the loop turns.
            text: "A loop needs a little helper that keeps track of which turn we are on. We call it the **loop variable**, and by habit we name it `i`. Each time the loop goes around, `i` automatically becomes the next number. Step through this loop and keep your eyes on the box called `i` \u2014 watch it change to 0, then 1, then 2, all on its own.",
            activity: {
              kind: 'widget',
              widget: 'program_stepper',
              config: {
                mode: 'loop',
                loopVar: 'i',
                start: 0,
                stop: 5,
                caption: 'You never set i yourself \u2014 the loop hands it the next value every turn.',
              },
            },
          },
          {
            // Beat (b): the RANGE. Use the number wheel to build range(n) and see
            // it produce 0..n-1, reinforcing that it STOPS BEFORE n.
            text: "But where do those numbers come from? From `range`. Writing `range(n)` makes a little supply of numbers to loop over: it starts at **0** and stops **just before** `n`. Scroll the wheel to choose `n`, then press **Step** to watch `range(n)` turn into its actual numbers.",
            activity: {
              kind: 'widget',
              widget: 'range_machine',
              config: {
                start: 0,
                plusOne: false,
                max: 7,
                initial: 5,
                caption: 'Notice the last number is always one less than n \u2014 range stops before n.',
              },
            },
          },
          {
            // Beat (c): INDENTATION (teach), then a quick check.
            text: "There is one more part: the work you want repeated goes on the next line, pushed in with **spaces**. Those spaces (the **indentation**) are how Python knows that line belongs *inside* the loop:\n\n```\nfor i in range(5):\n    print(i)     \u2190 indented, so it repeats\n```\n\nThe `print(i)` line is indented, so it runs once on every turn. If you forget the spaces, Python gets confused and refuses to run.",
            activity: {
              kind: 'checkpoint',
              prompt: 'How do you tell Python which line should repeat inside the loop?',
              choices: [
                'Indent it \u2014 push it in with spaces under the for line',
                'Write it before the for line',
                'Put it in quotes',
              ],
              answerIndex: 0,
              feedback: {
                correct: 'Right \u2014 the spaces in front are how Python sees that the line lives inside the loop.',
                incorrect:
                  'Look again at the example: the line that repeats sits further in from the left than the for line. What did we add to the front of it to do that?',
              },
            },
          },
          {
            // Assemble: label the parts of the full for-line.
            text: 'Put the three parts together and you get a real for-loop:\n\n```\nfor i in range(5):\n    print(i)\n```\n\n`for` starts the loop, `i` is the box that changes each turn, `range(5)` is the supply of numbers, the `:` opens the loop, and the indented line is what repeats.',
            activity: {
              kind: 'checkpoint',
              prompt: 'In `for i in range(5):`, what is `range(5)` there to do?',
              choices: [
                'Give the loop the numbers 0, 1, 2, 3, 4 to go through',
                'Print the number 5',
                'Add 5 to something',
              ],
              answerIndex: 0,
              feedback: {
                correct: 'Exactly \u2014 range(5) is the supply of numbers the loop walks through, one per turn.',
                incorrect:
                  'Think back to the wheel demo: range turned into a row of numbers to loop over. Does it print or add anything by itself?',
              },
            },
          },
        ],
      },
    },
    {
      // NEW 6.2c — a typed fix-the-bug drilling indentation, exactly like L5's.
      // The body is flush-left in the starter, so Python raises an
      // IndentationError until the learner pushes print(i) in under the for line.
      // (It also happens to show range(1, n + 1) as already-correct context.)
      id: 'fix-the-loop-indent',
      type: 'python_sandbox',
      title: 'Fix the indentation',
      graded: true,
      config: {
        prompt:
          'This loop should print the numbers 1, 2, 3, 4, 5, but Python refuses to run it. Look at the line right under the `for ...:` line \u2014 is it pushed in the way a line that lives inside a loop has to be? Fix it, then press Run.',
        starterCode: 'n = 5\nfor i in range(1, n + 1):\nprint(i)\n',
        requiredConstructs: ['loop'],
        successMessage:
          'Fixed! Those few spaces are everything to Python \u2014 they are how it knows that line lives inside the loop and should repeat.',
        testCases: [
          {
            stdin: '',
            expectedStdout: '1\n2\n3\n4\n5',
            feedback:
              'Not yet \u2014 look at the line right after the `for` line. Lines that run inside a loop have to start further in than the for line itself. Try nudging it to the right with some spaces.',
          },
        ],
      },
    },
    {
      id: 'fill-the-loop',
      type: 'block_problem',
      title: 'Finish the loop',
      graded: true,
      config: {
        mode: 'fill_blank',
        prompt: 'Make this program say "Hello!" five times.',
        palette: ['print'],
        initial: [
          {
            type: 'for_each',
            slots: {
              var: [{ type: 'var', fields: { name: 'i' } }],
              iter: [
                {
                  type: 'range_call',
                  slots: {
                    start: [{ type: 'num', fields: { value: 0 } }],
                    stop: [{ type: 'num', fields: { value: 5 } }],
                  },
                },
              ],
              body: [],
            },
          },
        ],
        expectedOutput: 'Hello!\nHello!\nHello!\nHello!\nHello!',
        requireLoop: true,
      },
    },
    {
      id: 'fix-the-loop',
      type: 'block_problem',
      title: 'Fix the loop',
      graded: true,
      config: {
        mode: 'bugfix',
        prompt:
          'This loop should print the numbers 0, 1, 2, 3, 4 \u2014 but right now its output is wrong. Find the problem and fix it.',
        palette: [],
        initial: [
          {
            type: 'for_each',
            slots: {
              var: [{ type: 'var', fields: { name: 'i' } }],
              iter: [
                {
                  type: 'range_call',
                  slots: {
                    start: [{ type: 'num', fields: { value: 0 } }],
                    stop: [{ type: 'num', fields: { value: 3 } }],
                  },
                },
              ],
              body: [{ type: 'print', slots: { value: [{ type: 'var', fields: { name: 'i' } }] } }],
            },
          },
        ],
        expectedOutput: '0\n1\n2\n3\n4',
        requireLoop: true,
      },
    },
    {
      // 6.5 — count-with-n repurposed into a DEDICATED demonstration of how the
      // variable expression in a range collapses to a single value before the
      // loop runs. Interactive: the learner picks n on the wheel and steps the
      // collapse range(1, n + 1) → range(1, 5 + 1) → range(1, 6) → 1..5.
      id: 'count-with-n',
      type: 'article',
      title: 'When the range does math first',
      graded: false,
      config: {
        panels: [
          {
            text: "Sometimes the numbers in a range depend on a box, like counting from 1 all the way **up to** `n`. To include `n` itself, we write `range(1, n + 1)`. That `n + 1` looks like a puzzle \u2014 but Python solves it **before the loop runs**.\n\nHere is the trick: Python takes the `n + 1`, swaps `n` for its value, does the math, and turns the whole thing into **one plain number**. Only then does the loop start. Scroll the wheel to pick `n`, then press **Step** and watch the expression collapse, one move at a time, into the numbers the loop will use.",
            activity: {
              kind: 'widget',
              widget: 'range_machine',
              config: {
                start: 1,
                plusOne: true,
                max: 9,
                initial: 5,
                caption: 'n + 1 becomes a single value first \u2014 the loop never sees the math, only the numbers.',
              },
            },
          },
        ],
      },
    },
    {
      // 6.6 — write a loop FROM SCRATCH that prints "Hi" a fixed number of times.
      // Rich, failure-type-specific, answer-free feedback distinguishes: no loop
      // (requiredConstructs ['loop'] → construct hint), wrong count (line-count
      // diagnostic), bad indentation (IndentationError diagnostic), wrong text.
      id: 'print-hi-loop',
      type: 'python_sandbox',
      title: 'Write your own loop',
      graded: true,
      config: {
        prompt:
          'Your turn \u2014 with nothing to start from. Write a loop that prints the word "Hi" four times, each on its own line. (No typing from the keyboard is needed; just make the loop print.)',
        starterCode: '# Write a loop here that prints "Hi" four times, one per line.\n',
        requiredConstructs: ['loop'],
        successMessage: 'You did it \u2014 one loop, written from scratch, doing the repeating for you.',
        testCases: [
          {
            stdin: '',
            expectedStdout: 'Hi\nHi\nHi\nHi',
            feedback:
              'Check two things: are you using a loop (not four separate print lines), and does it go around the right number of times?',
          },
        ],
      },
    },
    {
      // 6.7 — count from 1 to n with the input abstracted away. n is GIVEN; the
      // learner only constructs the loop. Natural solution: range(1, n + 1).
      // Off-by-one is the signature mistake, and the output diagnostics catch it
      // with answer-free guidance.
      id: 'count-1-to-n',
      type: 'python_sandbox',
      title: 'Count from 1 to n',
      graded: true,
      config: {
        prompt:
          'The box `n` already has a value \u2014 use it. Write a loop that prints every number from 1 up to `n`, each on its own line. (No input to read; n is given.)',
        starterCode: 'n = 5\n',
        requiredConstructs: ['loop'],
        successMessage:
          'Great \u2014 your loop counts all the way to n, and it would still work if n were a different number.',
        testCases: [
          {
            stdin: '',
            expectedStdout: '1\n2\n3\n4\n5',
            feedback:
              'Almost \u2014 check where your numbers start and where they stop. Remember a range stops just before its end value, so reaching n takes a little care.',
          },
        ],
      },
    },
  ],
}
