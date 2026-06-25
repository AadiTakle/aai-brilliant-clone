// L4 — True or False. Rehauled for a pure beginner.
//
// Flow:
//   4.0  meet-the-signs   — a gentle article that introduces the comparison
//                           signs ==, >, < for kids who have never seen them.
//   4.1  intro            — the comparison explorer: two iPhone-alarm-style scroll
//                           dials choose the numbers, the chosen sign sits between
//                           them, and the True/False answer updates live.
//   4.2  compare-numbers  — BUILD IT YOURSELF: store a `remainder` and print a
//                           comparison that asks "is it a multiple?" (empty slots
//                           the learner fills; blocks locked so they can't be
//                           deleted, only completed/edited).
//   4.3  exact-text       — an article showing that text comparisons must be
//                           EXACT: capitalization, spaces and symbols all matter.
export const l4TrueOrFalse = {
  id: 'l4-true-or-false',
  title: 'True or False',
  version: 2,
  steps: [
    {
      id: 'meet-the-signs',
      type: 'article',
      title: 'Meet the comparing signs',
      graded: false,
      config: {
        panels: [
          {
            text: 'Computers are great at answering **yes/no questions**. To ask one, we **compare** two numbers using a little sign:\n\n- `==` asks **"are these two exactly the same?"** (that is two equals signs, side by side!)\n- `>` asks **"is the first one bigger?"**\n- `<` asks **"is the first one smaller?"**\n\nThe answer is always one of just two words: `True` (yes) or `False` (no).',
          },
          {
            text: 'Quick check:',
            activity: {
              kind: 'checkpoint',
              prompt: 'You have 7 marbles and your friend has 7 marbles. Which sign asks whether you both have the *same* number?',
              choices: ['==', '>', '<'],
              answerIndex: 0,
              feedback: {
                correct: 'Yes! That sign asks "are these exactly the same?" — and 7 and 7 are the same, so the answer would be True.',
                incorrect: 'Think about which sign asks "are these exactly the same?" — picture a balance scale that sits perfectly level. Look again.',
              },
            },
          },
          {
            text: 'One more:',
            activity: {
              kind: 'checkpoint',
              prompt: 'A cheetah is faster than a turtle. Which sign asks whether the first number is *bigger* than the second?',
              choices: ['<', '>', '=='],
              answerIndex: 1,
              feedback: {
                correct: 'Right! That sign points its wide, open end at the bigger number, so it asks "is the first one bigger?".',
                incorrect: 'One of these signs opens wide toward the bigger side, like a hungry mouth facing the larger number. Take another look.',
              },
            },
          },
        ],
      },
    },
    {
      id: 'intro',
      type: 'article',
      title: 'Asking yes/no questions',
      graded: false,
      config: {
        panels: [
          {
            text: 'Now try it yourself. **Scroll each dial** to choose a number, pick a sign in the middle, and watch the answer flip between `True` and `False`. See if you can make it say **both**.',
            activity: {
              kind: 'widget',
              widget: 'comparison_explorer',
              config: {
                left: 3,
                right: 5,
                max: 10,
                caption: 'Note: == compares two values. A single = would store a value instead.',
              },
            },
          },
          {
            text: 'Quick check:',
            activity: {
              kind: 'checkpoint',
              prompt: 'What does `4 > 10` give?',
              choices: ['True', 'False'],
              answerIndex: 1,
              feedback: {
                correct: 'Correct — 4 is not bigger than 10, so the answer is False.',
                incorrect: 'Picture the two numbers on a number line. Is 4 really bigger than 10? Look at which one comes first.',
              },
            },
          },
        ],
      },
    },
    {
      id: 'compare-numbers',
      type: 'block_problem',
      title: 'Is it a multiple?',
      graded: true,
      config: {
        mode: 'fill_blank',
        prompt:
          'We put the number 9 into a box called i. Finish this program so it works out whether 9 is a multiple of 3. First, fill the empty remainder box with what is left over after sharing i into equal groups of 3. Then complete the yes/no question that checks whether that leftover is nothing at all. Press Run to see True or False. (You can fill in and change the blocks, but you cannot delete them.)',
        palette: ['binop', 'var', 'num'],
        lockBlocks: true,
        // Completion requires BOTH: the leftover is made with % (correct modulo)
        // and the yes/no question actually tests that leftover box (correct
        // comparator) — each with its own answer-free failure message.
        requiredConstructs: ['modulo'],
        requireCompare: { variable: 'remainder', op: '==', against: 0 },
        initial: [
          {
            type: 'assign',
            slots: {
              target: [{ type: 'var', fields: { name: 'i' } }],
              value: [{ type: 'num', fields: { value: 9 } }],
            },
          },
          {
            type: 'assign',
            slots: {
              target: [{ type: 'var', fields: { name: 'remainder' } }],
              // Empty: the learner drops in the leftover (a % block) here.
              value: [],
            },
          },
          {
            type: 'print',
            slots: {
              value: [
                {
                  type: 'compare',
                  fields: { op: '==' },
                  // Empty: the learner completes the comparison (e.g. the box vs. 0).
                  slots: { left: [], right: [] },
                },
              ],
            },
          },
        ],
        expectedOutput: 'True',
      },
    },
    {
      id: 'exact-text',
      type: 'article',
      title: 'Does the text match exactly?',
      graded: false,
      config: {
        panels: [
          {
            text: 'Python can compare words too, not just numbers — but it is **super picky**. Two pieces of text are equal only if they match **exactly**: every letter, every space, and every symbol has to be the same. Even one tiny difference makes them **not** equal.',
          },
          {
            text: '**Capitalization** counts. A big `C` and a small `c` are different letters to Python.',
            activity: {
              kind: 'checkpoint',
              prompt: 'Is `"Cat" == "cat"` True or False?',
              choices: ['True', 'False'],
              answerIndex: 1,
              feedback: {
                correct: 'Right — a big C and a small c are different to Python, so the two are not equal.',
                incorrect: 'Look very closely at the first letter of each word. Is it written the very same way in both?',
              },
            },
          },
          {
            text: '**Spaces** count too — even an invisible one tucked at the end.',
            activity: {
              kind: 'checkpoint',
              prompt: 'Is `"hi " == "hi"` True or False? (Look carefully — one has a space at the end.)',
              choices: ['True', 'False'],
              answerIndex: 1,
              feedback: {
                correct: 'Exactly — the first one has an extra space at the end, so they do not match.',
                incorrect: 'Count the characters in each one. Does one of them have something extra hiding at the end?',
              },
            },
          },
          {
            text: '**Symbols** count as well.',
            activity: {
              kind: 'checkpoint',
              prompt: 'Is `"yes!" == "yes"` True or False?',
              choices: ['True', 'False'],
              answerIndex: 1,
              feedback: {
                correct: 'Yes — the exclamation mark is an extra symbol, so the two are not the same.',
                incorrect: 'Compare them one symbol at a time. Does one carry a mark that the other one does not?',
              },
            },
          },
          {
            text: 'And when *everything* lines up exactly:',
            activity: {
              kind: 'checkpoint',
              prompt: 'Is `"dog" == "dog"` True or False?',
              choices: ['True', 'False'],
              answerIndex: 0,
              feedback: {
                correct: 'You got it — every letter matches exactly, so the two are equal.',
                incorrect: 'Read them letter by letter. When two pieces of text match perfectly, what answer should you expect?',
              },
            },
          },
        ],
      },
    },
  ],
}
