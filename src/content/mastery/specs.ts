// Authored mastery-challenge specs, one per lesson. Each has 3-5 recall MCQs
// (tagged by concept) and at least one static Apply question. These are the
// no-AI source of truth: with AI enabled the Apply stage is replaced by
// performance-targeted generated questions, but everything here must stand on
// its own so the app is fully playable with AI disabled.
//
// FizzBuzz/Buzz/Pop wording is reserved for L9 (the finale) — earlier specs use
// neutral words, matching the curriculum's deliberate avoidance before L9.

// Raw (unvalidated) specs keyed by lesson id; parsed by getMasteryChallenge.
export const rawMasterySpecs: Record<string, unknown> = {
  'l1-talking-to-the-computer': {
    lessonId: 'l1-talking-to-the-computer',
    blurb: 'Show what you know about printing text with print() and quotes.',
    recall: [
      {
        concept: 'print',
        prompt: 'Which line makes the computer show the word Hello on screen?',
        choices: ['print(Hello)', 'print("Hello")', 'Hello', 'say("Hello")'],
        answerIndex: 1,
        feedback: {
          correct: 'Yes — print( ) shows it, and the quotes mark Hello as text.',
          incorrect: 'Text needs quotes around it, and print( ) is what shows it.',
        },
      },
      {
        concept: 'print',
        prompt: 'What do the quotation marks around "Hello" tell Python?',
        choices: ['To shout it', 'That it is text', 'To run it as code', 'Nothing'],
        answerIndex: 1,
        feedback: {
          correct: 'Right — quotes say "treat this as text, not code".',
          incorrect: 'Quotes wrap text so Python treats the words as a value, not code.',
        },
      },
      {
        concept: 'print',
        prompt: 'How many lines does print("A") then print("B") show?',
        choices: ['One line', 'Two lines', 'Zero lines', 'Three lines'],
        answerIndex: 1,
        feedback: {
          correct: 'Each print( ) puts its text on its own line.',
          incorrect: 'Each print( ) call ends with a new line, so two prints make two lines.',
        },
      },
    ],
    applyFallback: [
      {
        concepts: ['print'],
        prompt:
          'Print exactly two lines: first the word Hello, then the word Python. Use one print( ) for each line, and remember the quotes.',
        starterCode: '# print Hello, then Python\n',
        testCases: [
          {
            stdin: '',
            expectedStdout: 'Hello\nPython',
            feedback: 'Use two print( ) calls with the text in quotes: "Hello" then "Python".',
          },
        ],
      },
    ],
  },

  'l2-boxes-that-remember': {
    lessonId: 'l2-boxes-that-remember',
    blurb: 'Prove you can store a value in a variable and use it.',
    recall: [
      {
        concept: 'variable',
        prompt: 'What does  city = "Paris"  do?',
        choices: [
          'Prints Paris',
          'Stores "Paris" in a box named city',
          'Compares city to Paris',
          'Nothing',
        ],
        answerIndex: 1,
        feedback: {
          correct: 'Exactly — = puts the value into the variable box.',
          incorrect: 'A single = stores the value on the right into the name on the left.',
        },
      },
      {
        concept: 'variable',
        prompt: 'After  x = 5  then  x = 9 , what is in x?',
        choices: ['5', '9', '14', 'both'],
        answerIndex: 1,
        feedback: {
          correct: 'Right — the new value replaces the old one.',
          incorrect: 'A box holds one value at a time; the second assignment overwrites the first.',
        },
      },
      {
        concept: 'variable',
        prompt: 'Which is text and which is a number:  "7"  vs  7 ?',
        choices: ['Both numbers', 'Both text', '"7" is text, 7 is a number', '7 is text'],
        answerIndex: 2,
        feedback: {
          correct: 'Quotes make it text; no quotes makes it a number.',
          incorrect: 'Quotes around 7 make it text; 7 with no quotes is a number.',
        },
      },
    ],
    applyFallback: [
      {
        concepts: ['variable', 'print'],
        prompt:
          'Make a variable named color and store the text "blue" in it. Then print the variable (not the word directly).',
        starterCode: '# store "blue" in color, then print color\n',
        testCases: [
          {
            stdin: '',
            expectedStdout: 'blue',
            feedback: 'Assign with  color = "blue"  then  print(color)  — print the variable name.',
          },
        ],
      },
    ],
  },

  'l3-doing-the-math': {
    lessonId: 'l3-doing-the-math',
    blurb: 'Show you understand the remainder operator %.',
    recall: [
      {
        concept: 'modulo',
        prompt: 'What does  %  give you?',
        choices: ['The total', 'The remainder after dividing', 'The bigger number', 'A percentage'],
        answerIndex: 1,
        feedback: {
          correct: 'Yes — % is the leftover after dividing.',
          incorrect: '% gives the remainder — what is left over after the division.',
        },
      },
      {
        concept: 'modulo',
        prompt: 'What is  10 % 3 ?',
        choices: ['0', '1', '3', '10'],
        answerIndex: 1,
        feedback: {
          correct: '10 = 3+3+3 with 1 left over.',
          incorrect: '3 goes into 10 three times (9), leaving 1.',
        },
      },
      {
        concept: 'modulo',
        prompt: 'When is  n % 5 == 0  true?',
        choices: ['Never', 'When n is a multiple of 5', 'When n is bigger than 5', 'Always'],
        answerIndex: 1,
        feedback: {
          correct: 'A remainder of 0 means it divides evenly — a multiple.',
          incorrect: 'No remainder (== 0) means n divides evenly by 5, i.e. a multiple of 5.',
        },
      },
    ],
    applyFallback: [
      {
        concepts: ['modulo', 'print'],
        prompt:
          'Use the % operator to print the remainder of 17 divided by 5. The answer should be a single number on one line.',
        starterCode: '# print 17 % 5\n',
        requiredConstructs: ['modulo'],
        testCases: [
          {
            stdin: '',
            expectedStdout: '2',
            feedback: 'Print the result of  17 % 5  — the leftover after dividing.',
          },
        ],
      },
    ],
  },

  'l4-true-or-false': {
    lessonId: 'l4-true-or-false',
    blurb: 'Show you can compare values and read True / False.',
    recall: [
      {
        concept: 'comparison',
        prompt: 'What is the result of  7 > 3 ?',
        choices: ['True', 'False', '7', '3'],
        answerIndex: 0,
        feedback: {
          correct: '7 is greater than 3, so the answer is True.',
          incorrect: 'A comparison answers a yes/no question — is 7 greater than 3? Yes: True.',
        },
      },
      {
        concept: 'comparison',
        prompt: 'Which operator checks if two values are equal?',
        choices: ['=', '==', '>', '!'],
        answerIndex: 1,
        feedback: {
          correct: '== compares; a single = stores a value.',
          incorrect: '== checks equality. A single = assigns a value to a variable.',
        },
      },
      {
        concept: 'comparison',
        prompt: 'Is  "cat" == "Cat"  True?',
        choices: ['True', 'False', 'Sometimes', 'Error'],
        answerIndex: 1,
        feedback: {
          correct: 'Text matching is exact — capital C is different from lowercase c.',
          incorrect: 'String comparison is exact and case-sensitive, so "cat" and "Cat" differ.',
        },
      },
    ],
    applyFallback: [
      {
        concepts: ['comparison', 'print'],
        prompt:
          'Print the True/False result of checking whether 8 is greater than 5. Print the comparison itself so the output is either True or False.',
        starterCode: '# print whether 8 > 5\n',
        testCases: [
          {
            stdin: '',
            expectedStdout: 'True',
            feedback: 'Print the comparison directly:  print(8 > 5)  gives True.',
          },
        ],
      },
    ],
  },

  'l5-making-decisions': {
    lessonId: 'l5-making-decisions',
    blurb: 'Show you can branch with if / else.',
    recall: [
      {
        concept: 'conditional',
        prompt: 'What runs the code only when a condition is true?',
        choices: ['for', 'if', 'print', '='],
        answerIndex: 1,
        feedback: {
          correct: 'if guards a block so it runs only when the test is true.',
          incorrect: 'if checks a condition and runs its block only when true.',
        },
      },
      {
        concept: 'conditional',
        prompt: 'What makes a line run INSIDE an if?',
        choices: ['A comma', 'Indentation (spaces in front)', 'A semicolon', 'Capital letters'],
        answerIndex: 1,
        feedback: {
          correct: 'Indented lines belong to the block above them.',
          incorrect: 'Python uses indentation — pushing a line in puts it inside the if.',
        },
      },
      {
        concept: 'conditional',
        prompt: 'When does the  else  block run?',
        choices: [
          'Always',
          'Only when the if condition is false',
          'Only when it is true',
          'Never',
        ],
        answerIndex: 1,
        feedback: {
          correct: 'else is the "otherwise" path.',
          incorrect: 'else runs only when the if condition was false.',
        },
      },
    ],
    applyFallback: [
      {
        concepts: ['conditional', 'modulo'],
        prompt:
          'A variable n is set to 4 for you. Write an if/else: if n is even (n % 2 == 0) print the word even, otherwise print odd. Indent the line under each branch.',
        starterCode: 'n = 4\n# print "even" or "odd"\n',
        requiredConstructs: ['conditional'],
        testCases: [
          {
            stdin: '',
            expectedStdout: 'even',
            feedback: 'Test  n % 2 == 0 . If true, print "even" (indented); else print "odd".',
          },
        ],
      },
    ],
  },

  'l6-over-and-over-again': {
    lessonId: 'l6-over-and-over-again',
    blurb: 'Show you can repeat work with a for loop and range().',
    recall: [
      {
        concept: 'loop',
        prompt: 'What does a  for  loop let you do?',
        choices: [
          'Make a decision',
          'Repeat work without retyping it',
          'Store one value',
          'Compare numbers',
        ],
        answerIndex: 1,
        feedback: {
          correct: 'A loop repeats its body for each item.',
          incorrect: 'A for loop repeats its indented body once per item.',
        },
      },
      {
        concept: 'range',
        prompt: 'What numbers does  range(1, 4)  give?',
        choices: ['1, 2, 3, 4', '1, 2, 3', '0, 1, 2, 3', '1, 4'],
        answerIndex: 1,
        feedback: {
          correct: 'range stops BEFORE the second number.',
          incorrect: 'range(1, 4) is 1, 2, 3 — it stops before 4.',
        },
      },
      {
        concept: 'loop',
        prompt: 'In  for i in range(3):  what makes a line repeat?',
        choices: ['Being indented under the for', 'A comma', 'Quotes', 'Being on the same line'],
        answerIndex: 0,
        feedback: {
          correct: 'The indented body is what repeats each pass.',
          incorrect: 'Lines indented under the for are the loop body that repeats.',
        },
      },
    ],
    applyFallback: [
      {
        concepts: ['loop', 'range', 'print'],
        prompt:
          'Use a for loop to print the numbers 1, 2, 3, 4, 5 — one per line. Use range so you do not type each number by hand.',
        starterCode: '# loop and print 1 through 5\n',
        requiredConstructs: ['loop'],
        testCases: [
          {
            stdin: '',
            expectedStdout: '1\n2\n3\n4\n5',
            feedback: 'Use  for i in range(1, 6):  and  print(i)  indented inside it.',
          },
        ],
      },
    ],
  },

  'l7-loops-and-decisions': {
    lessonId: 'l7-loops-and-decisions',
    blurb: 'Show you can make a decision inside a loop.',
    recall: [
      {
        concept: 'conditional',
        prompt: 'To decide something for EACH number, where does the if go?',
        choices: ['Before the loop', 'Inside the loop body', 'After the loop', 'It cannot'],
        answerIndex: 1,
        feedback: {
          correct: 'An if inside the loop runs fresh each pass.',
          incorrect: 'Put the if inside the loop so it is checked for every number.',
        },
      },
      {
        concept: 'accumulator',
        prompt: 'What does  label = label + "Hi"  do?',
        choices: ['Prints Hi', 'Adds "Hi" onto the end of label', 'Deletes label', 'Compares them'],
        answerIndex: 1,
        feedback: {
          correct: 'It builds the string up by gluing more text on.',
          incorrect: 'It joins "Hi" onto whatever label already held — building it up.',
        },
      },
      {
        concept: 'loop',
        prompt: 'How many times does the if run in  for i in range(1, 6):  with an if inside?',
        choices: ['Once', 'Five times', 'Never', 'Twice'],
        answerIndex: 1,
        feedback: {
          correct: 'range(1, 6) is five values, so the body runs five times.',
          incorrect: 'The loop body (including the if) runs once per value: 1,2,3,4,5 = five times.',
        },
      },
    ],
    applyFallback: [
      {
        concepts: ['loop', 'conditional', 'modulo'],
        prompt:
          'Loop over the numbers 1 to 6. For each one, if it is a multiple of 2 print the word even, otherwise print the number itself. One result per line.',
        starterCode: '# loop 1..6: print "even" or the number\n',
        requiredConstructs: ['loop', 'conditional'],
        testCases: [
          {
            stdin: '',
            expectedStdout: '1\neven\n3\neven\n5\neven',
            feedback:
              'Inside the loop, test  i % 2 == 0 . If true print "even", else print the number i.',
          },
        ],
      },
    ],
  },

  'l8-build-your-own-machine': {
    lessonId: 'l8-build-your-own-machine',
    blurb: 'Show you can define and call your own function.',
    recall: [
      {
        concept: 'function',
        prompt: 'What keyword starts a function definition?',
        choices: ['func', 'def', 'function', 'define'],
        answerIndex: 1,
        feedback: {
          correct: 'def names a new function.',
          incorrect: 'Python uses  def name(...):  to define a function.',
        },
      },
      {
        concept: 'function',
        prompt: 'What does  return  do inside a function?',
        choices: [
          'Prints a value',
          'Hands a value back to whoever called it',
          'Ends the program',
          'Loops',
        ],
        answerIndex: 1,
        feedback: {
          correct: 'return gives a result back to the caller.',
          incorrect: 'return sends a value back out of the function to the caller.',
        },
      },
      {
        concept: 'function',
        prompt: 'In  def greet(name):  what is  name ?',
        choices: ['A variable from outside', 'The input the function receives', 'The output', 'A loop'],
        answerIndex: 1,
        feedback: {
          correct: 'The parameter is the input handed in when you call it.',
          incorrect: 'name is the parameter — the input value the call passes in.',
        },
      },
    ],
    applyFallback: [
      {
        concepts: ['function', 'print'],
        prompt:
          'Define a function named double that takes one number n and returns n times 2. Then call it with 5 and print the result. The output should be a single number.',
        starterCode: '# define double(n) -> n*2, then print double(5)\n',
        testCases: [
          {
            stdin: '',
            expectedStdout: '10',
            feedback: 'Use  def double(n):  with  return n * 2 , then  print(double(5)) .',
          },
        ],
      },
    ],
  },

  'l9-fizzbuzzpop': {
    lessonId: 'l9-fizzbuzzpop',
    blurb:
      'The finale. Review every idea that powers FizzBuzzPop, then write the whole program yourself.',
    forceStaticApply: true,
    recall: [
      {
        concept: 'loop',
        prompt: 'To handle the numbers 1 to 21, what do you reach for?',
        choices: ['One print', 'A for loop over range', 'An if only', 'A variable'],
        answerIndex: 1,
        feedback: {
          correct: 'A loop walks every number so you write the rule once.',
          incorrect: 'Use a for loop over range so the same rule runs for each number.',
        },
      },
      {
        concept: 'modulo',
        prompt: 'How do you test "is i a multiple of 3"?',
        choices: ['i / 3', 'i % 3 == 0', 'i > 3', 'i == 3'],
        answerIndex: 1,
        feedback: {
          correct: 'Remainder 0 means it divides evenly.',
          incorrect: 'Use  i % 3 == 0  — a remainder of 0 means a multiple of 3.',
        },
      },
      {
        concept: 'accumulator',
        prompt: 'For 15 (multiple of 3 and 5) you need FizzBuzz. How?',
        choices: [
          'Print Fizz then Buzz on two lines',
          'Build one label by adding Fizz then Buzz',
          'Only print Buzz',
          'Print 15',
        ],
        answerIndex: 1,
        feedback: {
          correct: 'Start an empty label and glue each matching word on.',
          incorrect: 'Build one label string: add "Fizz", then add "Buzz", then print it.',
        },
      },
      {
        concept: 'conditional',
        prompt: 'When should you print the NUMBER instead of a label?',
        choices: [
          'Always',
          'When the label is still empty (no rule matched)',
          'When it is even',
          'Never',
        ],
        answerIndex: 1,
        feedback: {
          correct: 'Empty label means nothing matched, so print the number.',
          incorrect: 'If no rule matched, the label is still "", so print the number itself.',
        },
      },
      {
        concept: 'accumulator',
        prompt: 'What should print for 21 (multiple of 3 and 7)?',
        choices: ['Fizz', 'Pop', 'FizzPop', '21'],
        answerIndex: 2,
        feedback: {
          correct: 'Add Fizz (for 3) then Pop (for 7): FizzPop.',
          incorrect: '21 is a multiple of 3 and 7, so the label becomes FizzPop.',
        },
      },
    ],
    applyFallback: [
      {
        concepts: ['loop', 'modulo', 'conditional', 'accumulator'],
        prompt:
          'FizzBuzzPop — the finale! Print the numbers 1 to 21, one per line. The rules: a multiple of 3 prints Fizz; a multiple of 5 prints Buzz; a multiple of 7 prints Pop. If a number matches more than one rule, join them in that order — so 15 prints FizzBuzz and 21 prints FizzPop. If it matches no rule, print the number itself. Start from n = 21. Everything you need, you have already used.',
        starterCode: 'n = 21\n# Write your FizzBuzzPop here\n',
        requiredConstructs: ['loop', 'modulo', 'conditional'],
        successMessage:
          'You did it — you wrote FizzBuzzPop from scratch! That is the whole arc come together: a loop, the % operator, ifs, and a label you built up yourself. Real programmers solve problems exactly like this.',
        testCases: [
          {
            stdin: '',
            expectedStdout:
              '1\n2\nFizz\n4\nBuzz\nFizz\nPop\n8\nFizz\nBuzz\n11\nFizz\n13\nPop\nFizzBuzz\n16\n17\nFizz\n19\nBuzz\nFizzPop',
            feedback:
              'Loop 1..21. Build a label: add Fizz at %3, Buzz at %5, Pop at %7. If the label is empty, print the number; otherwise print the label.',
          },
        ],
      },
    ],
  },
}
