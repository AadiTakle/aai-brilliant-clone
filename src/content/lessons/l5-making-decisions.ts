// L5 — Making Decisions. Rebuilt from the ground up for a pure beginner, the
// Brilliant way: learn by DOING, build intuition by MANIPULATION before formal
// syntax, keep prose to a one-line caption, and let each step motivate the next.
//
// The tactile heart is the new LEARNER-DRIVEN `decision_machine` widget: the
// learner scrolls a number dial and watches control flow route to the FIRST
// matching branch (or the else), with the output updating live. Everything is
// generic — "multiple of 3" / "multiple of 5", never Fizz/Buzz.
//
//   1. one-fork      — introduce `if` (1 sentence). decision_machine, a SINGLE
//                      condition, NO else: the inside line lights ONLY on
//                      multiples of 3. Check: when does the inside line run?
//   2. two-paths     — introduce `else` (1 sentence): exactly one path always
//                      runs. decision_machine, 1 condition + else. Predict check.
//   3. fix-the-indent— TYPED fix-the-bug: learn indentation by fixing it. The
//                      bugged body is flush-left under the if (a real
//                      IndentationError). requiredConstructs ['conditional'].
//   4. first-door-wins—introduce `elif` + PRIORITY. decision_machine with two
//                      conditions + else, max 15 so the learner can land on 15
//                      (a multiple of BOTH) and SEE only the first branch fire.
//   5. assemble      — Parsons: order + indent a generic if/else, checkIndent,
//                      answer-free orderHint (points Back to the worked demo) +
//                      indentHint.
//   6. finish-it     — TYPED: write a generic if/else for a given n.
//                      requiredConstructs ['conditional']. Answer-free,
//                      failure-specific feedback (which carries the predict-first
//                      nudge).
//
// Global rule: incorrect-answer feedback nudges toward the fix and never reveals
// (even implicitly) the answer.
export const l5MakingDecisions = {
  id: 'l5-making-decisions',
  title: 'Making Decisions',
  version: 3,
  steps: [
    {
      id: 'one-fork',
      type: 'article',
      title: 'One fork in the road',
      graded: false,
      config: {
        panels: [
          {
            text: 'An **`if`** lets a program do something *only when* a question is True. Scroll the dial and watch the inside line light up — but only for some numbers.',
            activity: {
              kind: 'widget',
              widget: 'decision_machine',
              config: {
                variable: 'n',
                conditions: [{ divisor: 3, label: 'say "multiple of 3"', prints: 'multiple of 3' }],
                hasElse: false,
                max: 9,
                initial: 1,
                caption: 'The if line asks a True/False question. Its inside line runs only when the answer is True.',
              },
            },
          },
          {
            text: 'Quick check:',
            activity: {
              kind: 'checkpoint',
              prompt: 'When does the line *inside* the if actually run?',
              choices: [
                "Only when the if's question is True",
                'Every time, no matter what',
                "Only when the if's question is False",
              ],
              answerIndex: 0,
              feedback: {
                correct: 'Exactly — the inside line is the if\u2019s response to a True answer, so it runs only then.',
                incorrect:
                  'Look back at the dial: the inside line lit up for some numbers but not others. What did the question have to come out as for it to light?',
              },
            },
          },
        ],
      },
    },
    {
      id: 'two-paths',
      type: 'article',
      title: 'Add a backup path',
      graded: false,
      config: {
        panels: [
          {
            text: 'Add an **`else`** and one of the two paths **always** runs — the if when its question is True, the else every other time. Scroll the dial and watch the lit line jump between them.',
            activity: {
              kind: 'widget',
              widget: 'decision_machine',
              config: {
                variable: 'n',
                conditions: [{ divisor: 3, label: 'say "multiple of 3"', prints: 'multiple of 3' }],
                hasElse: true,
                elseLabel: 'print the number',
                max: 9,
                initial: 1,
                caption: 'Exactly one path runs — never both, never neither.',
              },
            },
          },
          {
            text: 'Quick check:',
            activity: {
              kind: 'checkpoint',
              prompt: 'The dial is on **7**. 7 is not a multiple of 3 — so which path runs?',
              choices: [
                'The else — it prints the number',
                'The if — it says "multiple of 3"',
                'Both of them, one after the other',
              ],
              answerIndex: 0,
              feedback: {
                correct: 'Right — the if\u2019s question is False for 7, so the else steps in as the backup.',
                incorrect:
                  'Try 7 on the dial above and watch which line lights. The if only runs when its question is True — is it for 7?',
              },
            },
          },
        ],
      },
    },
    {
      id: 'fix-the-indent',
      type: 'python_sandbox',
      title: 'Fix the indentation',
      graded: true,
      config: {
        prompt:
          'The spaces in front of a line are how Python knows it lives *inside* the if. This program won\u2019t run. Look at the line right after `if ...:` — is it pushed in like a line inside the if should be? Fix it, then press Run.',
        // Bugged on purpose: the body line is flush-left, so Python raises an
        // IndentationError until the learner pushes it in under the if.
        starterCode: 'n = 6\nif n % 3 == 0:\nprint("multiple of 3")\n',
        requiredConstructs: ['conditional'],
        successMessage:
          'Fixed! Those few spaces are everything to Python — they are how it knows that line lives inside the if.',
        testCases: [
          {
            stdin: '',
            expectedStdout: 'multiple of 3',
            feedback:
              'Not yet — look at the line right after `if n % 3 == 0:`. A line that lives inside the if has to start further in than the if line itself. Try nudging it to the right.',
          },
        ],
      },
    },
    {
      id: 'first-door-wins',
      type: 'article',
      title: 'The first door wins',
      graded: false,
      config: {
        panels: [
          {
            text: 'Need more than two paths? Stack **`elif`** checks between the `if` and the `else`. Python reads them **top to bottom and takes the first True one, then stops**. Scroll to **15** — a multiple of *both* 3 and 5 — and watch which single line lights.',
            activity: {
              kind: 'widget',
              widget: 'decision_machine',
              config: {
                variable: 'n',
                conditions: [
                  { divisor: 3, label: 'say "multiple of 3"', prints: 'multiple of 3' },
                  { divisor: 5, label: 'say "multiple of 5"', prints: 'multiple of 5' },
                ],
                hasElse: true,
                elseLabel: 'print the number',
                max: 15,
                initial: 1,
                caption: 'if first, then elif, then else — only the first matching line runs.',
              },
            },
          },
          {
            text: 'Quick check:',
            activity: {
              kind: 'checkpoint',
              prompt: 'If more than one check would be True, which branch actually runs?',
              choices: [
                'The first True one — Python stops once it finds it',
                'The last True one',
                'All of the True ones',
              ],
              answerIndex: 0,
              feedback: {
                correct: 'Exactly — Python walks down from the top, takes the first open door, and skips the rest.',
                incorrect:
                  'On the dial, 15 matches both checks, yet only one line lit. Which one did Python reach first as it read down from the top?',
              },
            },
          },
        ],
      },
    },
    {
      id: 'assemble',
      type: 'parsons_problem',
      title: 'Assemble the decision',
      graded: true,
      config: {
        prompt:
          'Put these lines in order — and indent them — so the program says "multiple of 3" when i is a multiple of 3, and otherwise prints the number itself.',
        checkIndent: true,
        orderHint:
          'Not quite — this is built just like the decision machine you scrolled a moment ago. Press the Back button to study the order its lines run in (if first, else last), then match it here.',
        indentHint:
          'Not quite — the order is right, but remember the inside lines. A line that runs inside the if (or the else) has to be pushed in further than the if and else lines themselves.',
        lines: [
          { id: 'if', code: 'if i % 3 == 0:', indent: 0 },
          { id: 'msg', code: 'print("multiple of 3")', indent: 1 },
          { id: 'else', code: 'else:', indent: 0 },
          { id: 'num', code: 'print(i)', indent: 1 },
        ],
      },
    },
    {
      id: 'finish-it',
      type: 'python_sandbox',
      title: 'Finish the decision',
      graded: true,
      config: {
        prompt:
          'Your turn — by typing. We put 4 in n. Write a decision: **if** n is a multiple of 3, print "multiple of 3"; **otherwise** print the number itself. (Use `%` to test "is the remainder 0?" and indent the line under each branch.)',
        starterCode: 'n = 4\n',
        requiredConstructs: ['conditional'],
        successMessage:
          'Nice — you wrote an if and an else, and the right path ran. That is the whole idea behind making decisions in code.',
        testCases: [
          {
            stdin: '',
            expectedStdout: '4',
            feedback:
              'Not yet — predict it first: 4 is not a multiple of 3, so which path should run, the if or the else? Then check: do you have an if and an else? Does the if test the remainder with `%` against 0? And is the line under each branch pushed in (indented)?',
          },
        ],
      },
    },
  ],
}
