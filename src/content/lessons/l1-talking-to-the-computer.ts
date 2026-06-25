// L1 — Talking to the computer. The on-ramp for a learner who has never coded.
// Three beats:
//   1.1  print() is a FUNCTION: an input rides down the assembly line, into the
//        print machine, and the output drops out as text on the screen.
//   1.2  You build programs by dragging function blocks into them.
//   1.3  Real Python is TYPED, not blocks — the learner writes their very first
//        program and makes the computer say "Hello World!".
// Incorrect-answer feedback always nudges toward the fix and never hands over
// the answer.
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
            text: 'Think of **`print`** as a machine on an assembly line. You drop something into its parentheses, it rides down the belt *into* the machine, and out the other side comes the **output** — your words shown on the screen. Type anything you like, press Run, and watch your words travel through.',
            activity: {
              kind: 'widget',
              widget: 'function_machine',
              config: {
                fnName: 'print',
                editable: true,
                echoInput: true,
                cases: [{ input: 'Hello!', output: 'Hello!' }],
                caption: 'Type your own words, hit Run, and the print machine shows them on the screen.',
              },
            },
          },
          {
            text: 'One rule about the input: text must be wrapped in **quotes** `"like this"`. The quotes tell Python "these are words to show, not commands to run."',
            activity: {
              kind: 'checkpoint',
              prompt: 'Which line correctly prints the word Hello?',
              choices: ['print(Hello)', 'print("Hello")', 'print"Hello"'],
              answerIndex: 1,
              feedback: {
                correct: 'Yes — the input rides inside the parentheses, and the words are wrapped in quotes.',
                incorrect:
                  'Not quite. Remember the machine needs two things: parentheses to receive its input, and quotes around the words. Look again at which line has both.',
              },
            },
          },
        ],
      },
    },
    {
      id: 'print-a-string',
      type: 'block_problem',
      title: 'Add a function to your program',
      graded: true,
      config: {
        mode: 'fill_blank',
        prompt:
          'Programs are built one function at a time. Drag the print block from the palette into your program, then change the text inside it so your program says exactly: Good morning! Press Run to see it work.',
        palette: ['print'],
        initial: [],
        expectedOutput: 'Good morning!',
        // Beginner step: accept close-enough text (case / spacing / trailing
        // punctuation) so the focus stays on adding the block, not pixel-perfect typing.
        lenient: true,
      },
    },
    {
      id: 'first-program',
      type: 'python_sandbox',
      title: 'Your first real program',
      graded: true,
      config: {
        prompt:
          'Time to leave the blocks behind! Real Python is not dragged together — it is typed out as text, line by line. Write your very first program: make the computer say Hello World! Type a line that prints Hello World!, then press Run.',
        starterCode: '# Type your program here, then press Run\n',
        // Beginner step: accept close-enough text so a tiny capitalization or
        // spacing slip doesn't block their very first win.
        lenient: true,
        successMessage:
          "You did it! You just wrote and ran your very first real program — typed from scratch, all by yourself. That's a huge first step, and every program you'll ever write starts exactly like this. Welcome to coding!",
        testCases: [
          {
            stdin: '',
            expectedStdout: 'Hello World!',
            feedback:
              'Almost! Check that your program prints a line of text, and that the words match what we asked for.',
          },
        ],
      },
    },
  ],
}
