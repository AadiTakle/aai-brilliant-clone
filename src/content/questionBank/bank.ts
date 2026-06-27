// =============================================================================
// THE QUESTION BANK — the one place to add recall questions.
//
// HOW TO ADD A QUESTION
// ---------------------
// Append ONE object to the array for its concept below. Shape:
//
//   {
//     concept: 'print',                 // MUST match the array's key
//     prompt: 'What does print() do?',
//     choices: ['Shows text', 'Adds numbers'],   // 2-4 choices
//     answerIndex: 0,                   // index of the CORRECT choice here
//     feedback: { incorrect: 'An answer-free nudge to retry from.' },
//     difficulty: 'easy',               // optional: 'easy' | 'medium' | 'hard'
//   }
//
// That's it. Every consumer (mastery recall, mastery checkpoints, daily
// challenges) picks it up automatically. Answer order is RANDOMIZED at render
// time (see src/lib/checkpoints/itemBank.ts → shuffleChoices), so `answerIndex`
// is simply where the correct choice sits in the order you typed it — the
// correct answer is preserved through the shuffle.
//
// Notes:
//   - `feedback.incorrect` is the nudge shown after a wrong try; `feedback.correct`
//     is optional (the renderer falls back to a generic "Correct!").
//   - Keep MODULO questions free of `==` (the cp-foundations checkpoint draws
//     modulo BEFORE comparison/`==` is taught — see the bank tests).
//   - The L9 FizzBuzzPop finale keeps its own AUTHORED recall in
//     src/content/mastery/specs.ts and is intentionally NOT sourced from this
//     neutral bank, so Fizz/Buzz/Pop wording does not belong here.
// =============================================================================

import type { MasteryConcept } from '../mastery/types'
import type { BankQuestion } from './types'

export const QUESTION_BANK: Record<MasteryConcept, BankQuestion[]> = {
  // ---------------------------------------------------------------------------
  // PRINT
  // ---------------------------------------------------------------------------
  print: [
    // Migrated from l1-talking-to-the-computer (specs.ts) — as-is.
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
    // New.
    {
      concept: 'print',
      difficulty: 'easy',
      prompt: 'What appears on screen when you run print("Hi")?',
      choices: ['Hi', '"Hi"', 'print(Hi)', 'nothing'],
      answerIndex: 0,
      feedback: { incorrect: `The quotes do their job and then step aside — what's left once they mark the text?` },
    },
    {
      concept: 'print',
      difficulty: 'easy',
      prompt: 'Which line is written correctly?',
      choices: ['print("Hi")', 'Print("Hi")', 'PRINT("Hi")', 'Print["Hi"]'],
      answerIndex: 0,
      feedback: { incorrect: 'Python is picky about capital letters — this command is all lowercase.' },
    },
    {
      concept: 'print',
      difficulty: 'easy',
      prompt: `What's missing here?  print("Hello"`,
      choices: ['a closing )', 'another word', 'a number', 'nothing'],
      answerIndex: 0,
      feedback: { incorrect: 'Every opening parenthesis needs a partner to close it.' },
    },
    {
      concept: 'print',
      difficulty: 'medium',
      prompt: 'What does print("2 + 2") show?',
      choices: ['2 + 2', '4', 'an error', '22'],
      answerIndex: 0,
      feedback: { incorrect: 'Look closely at the quotes — what do they tell Python about everything inside them?' },
    },
    {
      concept: 'print',
      difficulty: 'easy',
      prompt: 'In print("Hi"), what do the parentheses ( ) do?',
      choices: ['Hold the thing you want to show', 'Make the text bold', 'Do math', `Nothing, they're optional`],
      answerIndex: 0,
      feedback: { incorrect: 'Think of them as the basket that carries what print should display.' },
    },
    {
      concept: 'print',
      difficulty: 'easy',
      prompt: `You run print("one") then print("two"). What's on screen?`,
      choices: ['one, then two — on two lines', 'two, then one', 'one two on one line', 'just two'],
      answerIndex: 0,
      feedback: { incorrect: 'Lines run top to bottom, and each print() makes its own line.' },
    },
    {
      concept: 'print',
      difficulty: 'easy',
      prompt: 'Which part of print("Hello") is the text that actually shows on screen?',
      choices: ['the part in quotes, "Hello"', 'print', 'the ( )', 'the whole line'],
      answerIndex: 0,
      feedback: { incorrect: `It's the part wrapped in quotes — that's what print puts on screen.` },
    },
    {
      concept: 'print',
      difficulty: 'easy',
      prompt: 'What does print(7) show?',
      choices: ['7', '"7"', 'seven', 'nothing'],
      answerIndex: 0,
      feedback: { incorrect: `Numbers don't need quotes — print shows the value just as it is.` },
    },
    {
      concept: 'print',
      difficulty: 'easy',
      prompt: 'What is print( ) used for?',
      choices: ['To show something on the screen', 'To save a file', 'To do math', 'To delete text'],
      answerIndex: 0,
      feedback: { incorrect: 'Think about what you want the computer to do with your words.' },
    },
    {
      concept: 'print',
      difficulty: 'medium',
      prompt: 'What does print() with nothing inside it do?',
      choices: ['Prints a blank (empty) line', 'Shows an error', 'Prints the word print', 'Does nothing at all'],
      answerIndex: 0,
      feedback: { incorrect: `There's no text to show — but print still moves down to a new line.` },
    },
    {
      concept: 'print',
      difficulty: 'easy',
      prompt: 'Which line shows the word cat on screen?',
      choices: ['print("cat")', 'print(cat)', 'cat', 'show("cat")'],
      answerIndex: 0,
      feedback: { incorrect: 'Words need quotes so Python treats them as text, and print() displays them.' },
    },
  ],

  // ---------------------------------------------------------------------------
  // VARIABLE
  // ---------------------------------------------------------------------------
  variable: [
    // Migrated from l2-boxes-that-remember (specs.ts) — as-is.
    {
      concept: 'variable',
      prompt: 'What does  city = "Paris"  do?',
      choices: ['Prints Paris', 'Stores "Paris" in a box named city', 'Compares city to Paris', 'Nothing'],
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
    // New.
    {
      concept: 'variable',
      difficulty: 'easy',
      prompt: 'What does the = in  score = 10  do?',
      choices: ['Puts 10 into a box named score', 'Prints 10', 'Adds 10 to score', 'Deletes score'],
      answerIndex: 0,
      feedback: { incorrect: `It's not a question — it places the value on the right into the name on the left.` },
    },
    {
      concept: 'variable',
      difficulty: 'easy',
      prompt: 'After  name = "Sam" , what does  print(name)  show?',
      choices: ['Sam', 'name', '"Sam"', '"name"'],
      answerIndex: 0,
      feedback: { incorrect: `print shows what's stored inside the box, not the box's name.` },
    },
    {
      concept: 'variable',
      difficulty: 'medium',
      prompt: `What's the difference between  print(city)  and  print("city") ?`,
      choices: [
        `print(city) shows what's stored in the box; print("city") shows the word city`,
        'They do the same thing',
        'print(city) is always an error',
        'print("city") shows the stored value',
      ],
      answerIndex: 0,
      feedback: { incorrect: `Quotes mean the literal word; no quotes means 'look inside the box with that name'.` },
    },
    {
      concept: 'variable',
      difficulty: 'easy',
      prompt: 'A variable is best described as…',
      choices: ['a labeled box that holds a value', 'a math problem', 'a way to print', 'a kind of loop'],
      answerIndex: 0,
      feedback: { incorrect: 'Think storage — a named container you fill now and use later.' },
    },
    {
      concept: 'variable',
      difficulty: 'medium',
      prompt: 'After  pet = "cat"  then  pet = "dog" , what does  print(pet)  show?',
      choices: ['dog', 'cat', 'cat dog', 'both'],
      answerIndex: 0,
      feedback: { incorrect: 'A box holds one value at a time — which line set it last?' },
    },
    {
      concept: 'variable',
      difficulty: 'easy',
      prompt: 'Which line stores the number 5 in a box called age?',
      choices: ['age = 5', '5 = age', 'age 5', 'print(age) = 5'],
      answerIndex: 0,
      feedback: { incorrect: 'The name goes on the left of the =, the value on the right.' },
    },
    {
      concept: 'variable',
      difficulty: 'easy',
      prompt: `In  color = "blue" , which part is the variable's name?`,
      choices: ['color', '"blue"', '=', 'the whole line'],
      answerIndex: 0,
      feedback: { incorrect: 'It is the label on the left of the = sign.' },
    },
    {
      concept: 'variable',
      difficulty: 'easy',
      prompt: 'In  color = "blue" , which part is the value being stored?',
      choices: ['"blue"', 'color', '=', 'none of it'],
      answerIndex: 0,
      feedback: { incorrect: `It's what's on the right of the = — the thing put into the box.` },
    },
    {
      concept: 'variable',
      difficulty: 'medium',
      prompt: 'You write  x = 3 , then later  x = 8 . How many values does x hold now?',
      choices: ['one (just 8)', 'two (3 and 8)', 'none', 'both at once'],
      answerIndex: 0,
      feedback: { incorrect: 'A box keeps only the most recent value placed in it.' },
    },
    {
      concept: 'variable',
      difficulty: 'easy',
      prompt: 'Is  7  (no quotes) text or a number?',
      choices: ['a number', 'text', 'both', 'neither'],
      answerIndex: 0,
      feedback: { incorrect: `No quotes means it's a number you could do math with.` },
    },
    {
      concept: 'variable',
      difficulty: 'easy',
      prompt: 'Is  "hello"  text or a number?',
      choices: ['text', 'a number', 'a variable name', 'a command'],
      answerIndex: 0,
      feedback: { incorrect: 'Quotes wrap words, so Python treats it as text.' },
    },
  ],

  // ---------------------------------------------------------------------------
  // MODULO — keep every question free of `==` (drawn before comparison is taught).
  // ---------------------------------------------------------------------------
  modulo: [
    // Migrated from l3-doing-the-math (specs.ts) — two as-is, plus the reworded
    // third (the original "n % 5 == 0" wording is dropped to stay ==-free).
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
      difficulty: 'medium',
      prompt: 'When does  n % 5  give  0 ?',
      choices: ['When n is a multiple of 5', 'Never', 'When n is bigger than 5', 'Always'],
      answerIndex: 0,
      feedback: { incorrect: 'No remainder means n divides evenly by 5, i.e. a multiple of 5.' },
    },
    // New (all ==-free).
    {
      concept: 'modulo',
      difficulty: 'easy',
      prompt: 'What is  6 % 2 ?',
      choices: ['0', '1', '2', '3'],
      answerIndex: 0,
      feedback: { incorrect: '2 divides 6 evenly — how much is left over?' },
    },
    {
      concept: 'modulo',
      difficulty: 'easy',
      prompt: 'What is  7 % 2 ?',
      choices: ['1', '0', '2', '3'],
      answerIndex: 0,
      feedback: { incorrect: `2 goes into 7 three times (6) — what's left?` },
    },
    {
      concept: 'modulo',
      difficulty: 'easy',
      prompt: 'What does a remainder of  0  tell you?',
      choices: ['It divides evenly — no leftovers', 'The number is big', 'There was an error', 'The number is odd'],
      answerIndex: 0,
      feedback: { incorrect: 'Zero left over means it split into equal groups perfectly.' },
    },
    {
      concept: 'modulo',
      difficulty: 'medium',
      prompt: 'You share 13 candies equally among 4 kids. How many are left over?',
      choices: ['1', '0', '3', '4'],
      answerIndex: 0,
      feedback: { incorrect: '4 groups of 3 use 12 — how many candies remain?' },
    },
    {
      concept: 'modulo',
      difficulty: 'easy',
      prompt: 'What is  9 % 3 ?',
      choices: ['0', '1', '3', '9'],
      answerIndex: 0,
      feedback: { incorrect: `3 divides 9 evenly — what's left?` },
    },
    {
      concept: 'modulo',
      difficulty: 'easy',
      prompt: '8 % 2  is  0 . That tells you 8 is…',
      choices: ['even', 'odd', 'prime', 'negative'],
      answerIndex: 0,
      feedback: { incorrect: 'A 0 remainder when dividing by 2 means it splits into pairs — even.' },
    },
    {
      concept: 'modulo',
      difficulty: 'medium',
      prompt: 'What is  5 % 5 ?',
      choices: ['0', '1', '5', '25'],
      answerIndex: 0,
      feedback: { incorrect: 'A number divided by itself leaves nothing over.' },
    },
    {
      concept: 'modulo',
      difficulty: 'medium',
      prompt: 'What is  3 % 5 ?',
      choices: ['3', '0', '1', '2'],
      answerIndex: 0,
      feedback: { incorrect: '5 does not fit into 3 at all, so the whole 3 is left over.' },
    },
    {
      concept: 'modulo',
      difficulty: 'easy',
      prompt: 'Which operator gives the leftover after dividing?',
      choices: ['%', '+', '*', '='],
      answerIndex: 0,
      feedback: { incorrect: `It's the percent-looking sign — the remainder operator.` },
    },
    {
      concept: 'modulo',
      difficulty: 'easy',
      prompt: '12 % 4  is  0 . What does that mean?',
      choices: [
        '4 divides 12 evenly (12 is a multiple of 4)',
        '12 is bigger than 4',
        '4 is odd',
        `there's a remainder of 4`,
      ],
      answerIndex: 0,
      feedback: { incorrect: 'No remainder means it splits evenly — a multiple.' },
    },
    {
      concept: 'modulo',
      difficulty: 'medium',
      prompt: 'What is  8 % 5 ?',
      choices: ['3', '1', '0', '5'],
      answerIndex: 0,
      feedback: { incorrect: '5 fits into 8 once (5), and the rest is left over.' },
    },
  ],

  // ---------------------------------------------------------------------------
  // COMPARISON
  // ---------------------------------------------------------------------------
  comparison: [
    // Migrated from l4-true-or-false (specs.ts) — as-is.
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
    // New.
    {
      concept: 'comparison',
      difficulty: 'easy',
      prompt: 'What is  3 > 10 ?',
      choices: ['False', 'True', '3', '10'],
      answerIndex: 0,
      feedback: { incorrect: 'Is 3 actually bigger than 10? Answer honestly.' },
    },
    {
      concept: 'comparison',
      difficulty: 'easy',
      prompt: 'What is  6 == 6 ?',
      choices: ['True', 'False', '6', '12'],
      answerIndex: 0,
      feedback: { incorrect: `Are both sides exactly equal? Then it's True.` },
    },
    {
      concept: 'comparison',
      difficulty: 'easy',
      prompt: 'What is  6 == 9 ?',
      choices: ['False', 'True', '15', '6'],
      answerIndex: 0,
      feedback: { incorrect: `Are the two values the same? If not, it's False.` },
    },
    {
      concept: 'comparison',
      difficulty: 'medium',
      prompt: `What's the difference between  =  and  == ?`,
      choices: [
        '= stores a value; == checks if two values are equal',
        `They're the same`,
        '= compares, == stores',
        'Both store',
      ],
      answerIndex: 0,
      feedback: { incorrect: 'One puts a value in a box; the other asks a yes/no question.' },
    },
    {
      concept: 'comparison',
      difficulty: 'easy',
      prompt: 'What does a comparison like  4 > 2  give you?',
      choices: ['True or False', 'a number', 'text', 'an error'],
      answerIndex: 0,
      feedback: { incorrect: 'Comparisons answer a yes/no question.' },
    },
    {
      concept: 'comparison',
      difficulty: 'medium',
      prompt: 'Is  "dog" == "dog"  True?',
      choices: ['True', 'False', 'Sometimes', 'Error'],
      answerIndex: 0,
      feedback: { incorrect: 'Same letters, same case — an exact match.' },
    },
    {
      concept: 'comparison',
      difficulty: 'medium',
      prompt: 'Why is  "Hi" == "hi"  False?',
      choices: [
        'Capital H and lowercase h are different',
        `They're actually equal`,
        `Strings can't be compared`,
        `It's a typo`,
      ],
      answerIndex: 0,
      feedback: { incorrect: 'String matching is exact — uppercase and lowercase do not match.' },
    },
    {
      concept: 'comparison',
      difficulty: 'easy',
      prompt: 'What is  5 < 8 ?',
      choices: ['True', 'False', '5', '8'],
      answerIndex: 0,
      feedback: { incorrect: `< asks 'is the left one smaller?'` },
    },
    {
      concept: 'comparison',
      difficulty: 'easy',
      prompt: 'What is  10 > 10 ?',
      choices: ['False', 'True', '10', '0'],
      answerIndex: 0,
      feedback: { incorrect: '> means strictly bigger — is 10 bigger than itself?' },
    },
    {
      concept: 'comparison',
      difficulty: 'medium',
      prompt: 'You want to check whether  age  equals 10. Which is right?',
      choices: ['age == 10', 'age = 10', 'age 10', 'age => 10'],
      answerIndex: 0,
      feedback: { incorrect: `Double equals asks 'are these equal?' — single equals would store instead.` },
    },
    {
      concept: 'comparison',
      difficulty: 'easy',
      prompt: 'The answer to a comparison is always one of which two values?',
      choices: ['True or False', '0 or 1', 'Yes or Maybe', 'big or small'],
      answerIndex: 0,
      feedback: { incorrect: 'Comparisons only ever come out True or False.' },
    },
  ],

  // ---------------------------------------------------------------------------
  // CONDITIONAL
  // ---------------------------------------------------------------------------
  conditional: [
    // Migrated from l5-making-decisions (specs.ts) — as-is.
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
      choices: ['Always', 'Only when the if condition is false', 'Only when it is true', 'Never'],
      answerIndex: 1,
      feedback: {
        correct: 'else is the "otherwise" path.',
        incorrect: 'else runs only when the if condition was false.',
      },
    },
    // New.
    {
      concept: 'conditional',
      difficulty: 'easy',
      prompt: 'What does  elif  let you do?',
      choices: ['Check another condition if the first if was false', 'Repeat code', 'Store a value', 'End the program'],
      answerIndex: 0,
      feedback: { incorrect: `It's 'else, but with its own question to check next'.` },
    },
    {
      concept: 'conditional',
      difficulty: 'medium',
      prompt: `What prints?  n = 4 / if n > 5: print("big") / else: print("small")`,
      choices: ['small', 'big', 'nothing', 'error'],
      answerIndex: 0,
      feedback: { incorrect: 'Is 4 greater than 5? Take the matching branch.' },
    },
    {
      concept: 'conditional',
      difficulty: 'medium',
      prompt: 'In an  if / elif / else , if TWO conditions are true, which block runs?',
      choices: ['The first true one (Python stops there)', 'The last true one', 'Both', 'None'],
      answerIndex: 0,
      feedback: { incorrect: 'Python takes the first open door and skips the rest.' },
    },
    {
      concept: 'conditional',
      difficulty: 'easy',
      prompt: 'What punctuation goes at the end of an  if  line?',
      choices: ['a colon :', 'a period .', 'a comma ,', 'nothing'],
      answerIndex: 0,
      feedback: { incorrect: 'Headers like if/else end with a colon before their indented block.' },
    },
    {
      concept: 'conditional',
      difficulty: 'medium',
      prompt: `What prints?  n = 6 / if n % 2 == 0: print("even") / else: print("odd")`,
      choices: ['even', 'odd', '6', 'nothing'],
      answerIndex: 0,
      feedback: { incorrect: 'What is 6 % 2? A remainder of 0 makes the if true.' },
    },
    {
      concept: 'conditional',
      difficulty: 'easy',
      prompt: 'If the  if  condition is True, does the  else  block also run?',
      choices: ['No — only the if block runs', 'Yes, both run', 'Only else runs', 'Always'],
      answerIndex: 0,
      feedback: { incorrect: 'else is the "otherwise" path — skipped when the if already matched.' },
    },
    {
      concept: 'conditional',
      difficulty: 'medium',
      prompt: 'Why must the line under an  if  be indented?',
      choices: ['Indentation tells Python the line runs inside the if', 'To look nice', 'It is optional', 'To run it twice'],
      answerIndex: 0,
      feedback: { incorrect: 'Indentation is how Python groups which lines belong to the if.' },
    },
    {
      concept: 'conditional',
      difficulty: 'medium',
      prompt: `What prints?  score = 10 / if score > 8: print("A") / elif score > 5: print("B") / else: print("C")`,
      choices: ['A', 'B', 'C', 'nothing'],
      answerIndex: 0,
      feedback: { incorrect: 'Check top to bottom; take the first condition that is true.' },
    },
    {
      concept: 'conditional',
      difficulty: 'medium',
      prompt: `What prints?  score = 7 / if score > 8: print("A") / elif score > 5: print("B") / else: print("C")`,
      choices: ['B', 'A', 'C', 'nothing'],
      answerIndex: 0,
      feedback: { incorrect: `7 isn't greater than 8, but it is greater than 5 — which branch is that?` },
    },
    {
      concept: 'conditional',
      difficulty: 'easy',
      prompt: `What's the role of  else ?`,
      choices: ['It runs when none of the if/elif conditions were true', 'It always runs', 'It checks a new condition', 'It repeats'],
      answerIndex: 0,
      feedback: { incorrect: `It's the catch-all 'otherwise' branch.` },
    },
    {
      concept: 'conditional',
      difficulty: 'medium',
      prompt: 'An  if  checks a condition. What kind of value must that condition produce?',
      choices: ['True or False', 'a number to print', 'text', 'a remainder'],
      answerIndex: 0,
      feedback: { incorrect: 'if needs a yes/no answer to decide whether to run its block.' },
    },
  ],

  // ---------------------------------------------------------------------------
  // LOOP
  // ---------------------------------------------------------------------------
  loop: [
    // Migrated from l6-over-and-over-again (2) + l7-loops-and-decisions (1) — as-is.
    {
      concept: 'loop',
      prompt: 'What does a  for  loop let you do?',
      choices: ['Make a decision', 'Repeat work without retyping it', 'Store one value', 'Compare numbers'],
      answerIndex: 1,
      feedback: {
        correct: 'A loop repeats its body for each item.',
        incorrect: 'A for loop repeats its indented body once per item.',
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
    // New.
    {
      concept: 'loop',
      difficulty: 'easy',
      prompt: `What prints?  for i in range(3): print("hi")`,
      choices: ['hi three times (on 3 lines)', 'hi once', 'hi 3', 'nothing'],
      answerIndex: 0,
      feedback: { incorrect: 'range(3) gives 3 values, so the indented line runs 3 times.' },
    },
    {
      concept: 'loop',
      difficulty: 'easy',
      prompt: 'In  for i in range(5): , how many times does the loop body run?',
      choices: ['5', '4', '6', '1'],
      answerIndex: 0,
      feedback: { incorrect: 'range(5) produces 5 values: 0,1,2,3,4.' },
    },
    {
      concept: 'loop',
      difficulty: 'medium',
      prompt: `What prints?  for i in range(3): print(i)`,
      choices: ['0 1 2 (separate lines)', '1 2 3', '3', '0 1 2 3'],
      answerIndex: 0,
      feedback: { incorrect: 'range(3) counts 0,1,2, and each i is printed.' },
    },
    {
      concept: 'loop',
      difficulty: 'easy',
      prompt: 'What is the indented part under a  for  line called?',
      choices: ['the loop body (the part that repeats)', 'the header', 'the condition', 'the variable'],
      answerIndex: 0,
      feedback: { incorrect: 'It is the work that runs each time through.' },
    },
    {
      concept: 'loop',
      difficulty: 'easy',
      prompt: 'In  for i in range(4): , what is  i  the first time through?',
      choices: ['0', '1', '4', 'the word i'],
      answerIndex: 0,
      feedback: { incorrect: 'range starts counting at 0 by default.' },
    },
    {
      concept: 'loop',
      difficulty: 'medium',
      prompt: `Why use a loop instead of writing print("go") five times?`,
      choices: ['A loop repeats the work without retyping it', 'It is slower', 'It only works once', 'No difference'],
      answerIndex: 0,
      feedback: { incorrect: `Loops shine when you'd otherwise copy the same line over and over.` },
    },
    {
      concept: 'loop',
      difficulty: 'medium',
      prompt: 'What keeps the lines after a loop from repeating?',
      choices: [`They aren't indented under the for`, 'A comma', 'Quotes', 'Nothing'],
      answerIndex: 0,
      feedback: { incorrect: 'Only indented lines belong to the loop; un-indented lines run once after it.' },
    },
    {
      concept: 'loop',
      difficulty: 'medium',
      prompt: `What prints?  for i in range(2): print("a") print("b")  (both indented)`,
      choices: ['a b a b', 'a b', 'a a b b', 'a b a'],
      answerIndex: 0,
      feedback: { incorrect: 'Both indented lines repeat together, once per pass — two passes here.' },
    },
    {
      concept: 'loop',
      difficulty: 'easy',
      prompt: 'A  for  loop is mainly for…',
      choices: ['doing something repeatedly', 'making a decision', 'storing one value', 'comparing two numbers'],
      answerIndex: 0,
      feedback: { incorrect: 'Think repetition — running the same block multiple times.' },
    },
    {
      concept: 'loop',
      difficulty: 'medium',
      prompt: `How many lines does this print?  for i in range(3): print(i)`,
      choices: ['3', '1', '0', '4'],
      answerIndex: 0,
      feedback: { incorrect: 'One print per pass, and range(3) makes 3 passes.' },
    },
    {
      concept: 'loop',
      difficulty: 'easy',
      prompt: 'What goes right after  range(...)  on a  for  line?',
      choices: ['a colon :', 'a comma', 'a period', 'nothing'],
      answerIndex: 0,
      feedback: { incorrect: 'Like if/else, a for header ends with a colon before its indented body.' },
    },
  ],

  // ---------------------------------------------------------------------------
  // RANGE
  // ---------------------------------------------------------------------------
  range: [
    // Migrated from l6-over-and-over-again (specs.ts) — as-is.
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
    // New.
    {
      concept: 'range',
      difficulty: 'easy',
      prompt: 'What numbers does  range(3)  give?',
      choices: ['0, 1, 2', '1, 2, 3', '0, 1, 2, 3', '3'],
      answerIndex: 0,
      feedback: { incorrect: 'With one number, range starts at 0 and stops before it.' },
    },
    {
      concept: 'range',
      difficulty: 'easy',
      prompt: 'What numbers does  range(0, 3)  give?',
      choices: ['0, 1, 2', '0, 1, 2, 3', '1, 2, 3', '0, 3'],
      answerIndex: 0,
      feedback: { incorrect: 'Starts at 0, stops before 3.' },
    },
    {
      concept: 'range',
      difficulty: 'medium',
      prompt: 'What numbers does  range(2, 6)  give?',
      choices: ['2, 3, 4, 5', '2, 3, 4, 5, 6', '3, 4, 5', '2, 6'],
      answerIndex: 0,
      feedback: { incorrect: 'Starts at 2, stops before 6.' },
    },
    {
      concept: 'range',
      difficulty: 'easy',
      prompt: 'range(5) — what is the first number?',
      choices: ['0', '1', '5', '4'],
      answerIndex: 0,
      feedback: { incorrect: 'One-argument range always starts at 0.' },
    },
    {
      concept: 'range',
      difficulty: 'easy',
      prompt: 'range(1, 5) — what is the last number?',
      choices: ['4', '5', '1', '6'],
      answerIndex: 0,
      feedback: { incorrect: 'range stops one before the end value.' },
    },
    {
      concept: 'range',
      difficulty: 'medium',
      prompt: 'How many numbers does  range(4)  produce?',
      choices: ['4', '5', '3', '0'],
      answerIndex: 0,
      feedback: { incorrect: '0,1,2,3 — that is four values.' },
    },
    {
      concept: 'range',
      difficulty: 'medium',
      prompt: 'How many numbers does  range(2, 5)  produce?',
      choices: ['3', '4', '2', '5'],
      answerIndex: 0,
      feedback: { incorrect: '2,3,4 — count them.' },
    },
    {
      concept: 'range',
      difficulty: 'medium',
      prompt: 'You want the numbers 1, 2, 3, 4, 5. Which range is right?',
      choices: ['range(1, 6)', 'range(1, 5)', 'range(5)', 'range(0, 5)'],
      answerIndex: 0,
      feedback: { incorrect: 'To END at 5, stop one past it — range stops before the end.' },
    },
    {
      concept: 'range',
      difficulty: 'medium',
      prompt: 'You want to count 1 through  n . Which is right?',
      choices: ['range(1, n + 1)', 'range(1, n)', 'range(n)', 'range(0, n)'],
      answerIndex: 0,
      feedback: { incorrect: 'To include n itself, the stop must be one more than n.' },
    },
    {
      concept: 'range',
      difficulty: 'easy',
      prompt: 'Does  range(1, 4)  include the number 4?',
      choices: ['No — it stops before 4', 'Yes', 'Only sometimes', 'It includes 4 but not 1'],
      answerIndex: 0,
      feedback: { incorrect: 'range stops just before its end value.' },
    },
    {
      concept: 'range',
      difficulty: 'medium',
      prompt: 'What numbers does  range(0, 5)  give?',
      choices: ['0, 1, 2, 3, 4', '0, 1, 2, 3, 4, 5', '1, 2, 3, 4, 5', '0, 5'],
      answerIndex: 0,
      feedback: { incorrect: 'Starts at 0, stops before 5.' },
    },
    {
      concept: 'range',
      difficulty: 'medium',
      prompt: 'To make a loop run exactly 10 times, which range works?',
      choices: ['range(10)', 'range(1, 10)', 'range(11)', 'range(0, 9)'],
      answerIndex: 0,
      feedback: { incorrect: 'range(10) gives 0…9 — ten values.' },
    },
    {
      concept: 'range',
      difficulty: 'hard',
      prompt: 'Why might  range(1, 5)  surprise you if you wanted 1 through 5?',
      choices: ['It stops at 4, not 5 (one short)', 'It starts at 0', 'It skips even numbers', 'It repeats'],
      answerIndex: 0,
      feedback: { incorrect: 'The end is exclusive — to reach 5 you would need range(1, 6).' },
    },
  ],

  // ---------------------------------------------------------------------------
  // ACCUMULATOR — neutral wording only (no Fizz/Buzz/Pop; that's L9-authored).
  // ---------------------------------------------------------------------------
  accumulator: [
    // Migrated from l7-loops-and-decisions (specs.ts) — the neutral one, as-is.
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
    // New.
    {
      concept: 'accumulator',
      difficulty: 'easy',
      prompt: 'You start with  word = "a" , then run  word = word + "b" . What is in  word ?',
      choices: ['"ab"', '"a"', '"b"', '"ba"'],
      answerIndex: 0,
      feedback: { incorrect: `It reads the old value first ('a'), then glues 'b' onto the end.` },
    },
    {
      concept: 'accumulator',
      difficulty: 'medium',
      prompt: 's = "" , then  s = s + "x" , then  s = s + "y" . What is  s ?',
      choices: ['"xy"', '"yx"', '"x"', '""'],
      answerIndex: 0,
      feedback: { incorrect: 'Each line adds onto whatever s already held, left to right.' },
    },
    {
      concept: 'accumulator',
      difficulty: 'easy',
      prompt: 'Why often start an accumulator with  result = "" ?',
      choices: ['to begin with an empty string to add onto', 'to erase the program', 'to print a blank line', 'because loops require it'],
      answerIndex: 0,
      feedback: { incorrect: 'You need something to add to — start empty, then glue pieces on.' },
    },
    {
      concept: 'accumulator',
      difficulty: 'medium',
      prompt: 's  holds  "go" . Which line makes  s  become  "go!" ?',
      choices: ['s = s + "!"', 's = "!" + s', 's = "!"', 's = s + s'],
      answerIndex: 0,
      feedback: { incorrect: 'Add the new piece after the old value, not before.' },
    },
    {
      concept: 'accumulator',
      difficulty: 'medium',
      prompt: `What prints?  s = "" / for i in range(3): s = s + "*" / print(s)`,
      choices: ['***', '*', '(nothing)', '* * *'],
      answerIndex: 0,
      feedback: { incorrect: `Each pass adds one '*' onto s — three passes.` },
    },
    {
      concept: 'accumulator',
      difficulty: 'easy',
      prompt: 's  starts as  "" . After  s = s + "ab" , what is in  s ?',
      choices: ['"ab"', '""', '"s"', '"ab ab"'],
      answerIndex: 0,
      feedback: { incorrect: 'Adding to an empty string just leaves the new piece.' },
    },
    {
      concept: 'accumulator',
      difficulty: 'medium',
      prompt: 'name = "Sam" , then  name = name + "!" . What is  name ?',
      choices: ['"Sam!"', '"!Sam"', '"Sam"', '"!"'],
      answerIndex: 0,
      feedback: { incorrect: 'Old value first, then the new piece glued on the end.' },
    },
    {
      concept: 'accumulator',
      difficulty: 'medium',
      prompt: `What prints?  s = "go" / for i in range(2): s = s + "!" / print(s)`,
      choices: ['go!!', 'go!', '!!', 'go'],
      answerIndex: 0,
      feedback: { incorrect: `Two passes each add one '!' to what s already holds.` },
    },
    {
      concept: 'accumulator',
      difficulty: 'easy',
      prompt: 'x  holds  "cat" . After  x = x + "?" , what is in  x ?',
      choices: ['"cat?"', '"?cat"', '"cat"', '"?"'],
      answerIndex: 0,
      feedback: { incorrect: `The '?' is glued onto the end of what x already held.` },
    },
    {
      concept: 'accumulator',
      difficulty: 'medium',
      prompt: 'result  holds  "Fi" . You run  result = result + "ve" . What is in it?',
      choices: ['"Five"', '"veFi"', '"ve"', '"Fi"'],
      answerIndex: 0,
      feedback: { incorrect: `It keeps the old 'Fi' and glues 've' onto the end.` },
    },
    {
      concept: 'accumulator',
      difficulty: 'medium',
      prompt: `What prints?  out = "" / for i in range(3): out = out + "ab" / print(out)`,
      choices: ['ababab', 'ab', 'abab', '(nothing)'],
      answerIndex: 0,
      feedback: { incorrect: `Each of the 3 passes adds 'ab' onto out.` },
    },
    {
      concept: 'accumulator',
      difficulty: 'medium',
      prompt: 'box  holds  "X"  and  piece  holds  "Y" . After  box = box + piece , what is in  box ?',
      choices: ['"XY"', '"YX"', '"Y"', '"X"'],
      answerIndex: 0,
      feedback: { incorrect: 'Old contents first, then piece added on the end.' },
    },
    {
      concept: 'accumulator',
      difficulty: 'hard',
      prompt: `What prints?  s = "1" / for i in range(2): s = s + "0" / print(s)`,
      choices: ['100', '10', '1', '000'],
      answerIndex: 0,
      feedback: { incorrect: `Start with '1', then two passes each add a '0' — joined as text, not added as math.` },
    },
  ],

  // ---------------------------------------------------------------------------
  // FUNCTION
  // ---------------------------------------------------------------------------
  function: [
    // Migrated from l8-build-your-own-machine (specs.ts) — as-is.
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
      choices: ['Prints a value', 'Hands a value back to whoever called it', 'Ends the program', 'Loops'],
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
    // New.
    {
      concept: 'function',
      difficulty: 'easy',
      prompt: 'What does  def  do?',
      choices: ['Defines a new function', 'Calls a function', 'Stores a number', 'Repeats code'],
      answerIndex: 0,
      feedback: { incorrect: 'It is how you create your own machine.' },
    },
    {
      concept: 'function',
      difficulty: 'medium',
      prompt: `What prints?  def double(n): return n * 2 / print(double(4))`,
      choices: ['8', '4', '2', 'double'],
      answerIndex: 0,
      feedback: { incorrect: 'double(4) hands back 4×2; print shows it.' },
    },
    {
      concept: 'function',
      difficulty: 'easy',
      prompt: 'How do you RUN a function called  greet ?',
      choices: ['greet()', 'def greet', 'return greet', 'print greet'],
      answerIndex: 0,
      feedback: { incorrect: 'Call it by writing its name with parentheses.' },
    },
    {
      concept: 'function',
      difficulty: 'medium',
      prompt: 'What goes at the end of a  def  line?',
      choices: ['a colon :', 'a comma', 'a period', 'nothing'],
      answerIndex: 0,
      feedback: { incorrect: 'Like if/for, a def header ends with a colon before its indented body.' },
    },
    {
      concept: 'function',
      difficulty: 'medium',
      prompt: `What's the difference between  return  and  print ?`,
      choices: [
        'return hands a value back; print shows it on screen',
        'return shows it; print hands it back',
        'both show it on screen',
        'both hand a value back',
      ],
      answerIndex: 0,
      feedback: { incorrect: 'return gives a value to the caller; print just displays it.' },
    },
    {
      concept: 'function',
      difficulty: 'medium',
      prompt: 'Given  def add_one(x): return x + 1 , what does  add_one(5)  hand back?',
      choices: ['6', '5', '1', 'add_one'],
      answerIndex: 0,
      feedback: { incorrect: 'It returns x + 1, and x is 5.' },
    },
    {
      concept: 'function',
      difficulty: 'medium',
      prompt: 'You call  greet("Sam")  for  def greet(name): … . Inside the function, what is  name ?',
      choices: ['"Sam"', '"name"', 'greet', 'nothing'],
      answerIndex: 0,
      feedback: { incorrect: 'The value you pass in becomes the input name inside the function.' },
    },
    {
      concept: 'function',
      difficulty: 'medium',
      prompt: `What prints?  def square(n): return n * n / print(square(3))`,
      choices: ['9', '6', '3', 'square'],
      answerIndex: 0,
      feedback: { incorrect: 'square(3) returns 3×3.' },
    },
    {
      concept: 'function',
      difficulty: 'easy',
      prompt: 'Why make a function instead of repeating the same code?',
      choices: ['to reuse it whenever you need it', 'to slow the program', 'to delete code', 'to print twice'],
      answerIndex: 0,
      feedback: { incorrect: 'Define it once, then call it as many times as you like.' },
    },
    {
      concept: 'function',
      difficulty: 'medium',
      prompt: 'After  def double(n): return n * 2 , what does  double(5)  equal?',
      choices: ['10', '5', '2', '7'],
      answerIndex: 0,
      feedback: { incorrect: 'It hands back 5×2.' },
    },
    {
      concept: 'function',
      difficulty: 'medium',
      prompt: 'In a function, where does the work go?',
      choices: ['indented under the def line', 'before the def line', 'on the same line as def', 'after you call it'],
      answerIndex: 0,
      feedback: { incorrect: 'The function body is the indented block beneath the def header.' },
    },
  ],
}
