# Brilliant Lesson Rehaul — Research, Findings & Implementation Spec

> **Purpose.** This document captures the research, comparison, and concrete change
> suggestions from a lesson-by-lesson analysis of our Python curriculum against
> Brilliant.org's. It is written so a future agent can **reproduce the exact
> changes** without re-doing the research. Every change suggestion names *what* to
> add, *where* (file + insertion point + step id), the *concrete content*, *why*,
> and the *tests* to add/update.
>
> Companion docs: [ARCHITECTURE.md](ARCHITECTURE.md) (codebase map),
> `.cursor/skills/lesson-rehaul/references/curriculum-constraints.md` (hard
> guardrails + coverage contract). **Read both before implementing.**

---

## 0. How to use this document (implementer instructions)

1. Each change below is self-contained. The **single-lesson** changes are
   parallel-safe (they touch only one lesson file + that lesson's tests) and may be
   run as independent `lesson-rehaul` subagents. The **shared/larger** changes are
   flagged explicitly — do those sequentially and never inside a parallel subagent.
2. Code blocks are *proposed new content*. Match the existing authoring style in the
   target lesson file (the surrounding steps are the source of truth for exact field
   shapes). All proposed configs were checked against:
   - `src/problem-types/article/schema.ts` (widget configs),
   - `src/problem-types/block_problem/schema.ts`,
   - `src/problem-types/python_sandbox/schema.ts`.
3. **Test-driven**: for every behavioral change, first add/adjust a focused test under
   `tests/phase-9-curriculum/`, watch it fail, then implement. For new typed
   (`python_sandbox`) steps, add a test that runs a *known-correct sample solution*
   under real Python and asserts it equals the step's `expectedStdout` (this is how
   we prove the step is solvable, since sandbox steps store no solution).
4. **Gate (must be green before declaring done):**
   ```
   npm run validate-content
   npx tsc -b
   npm test
   npm run test:pyodide   # required for any runnable block/python step changes
   ```
5. **Do not** change any lesson `id` or the registration order in
   `src/content/lessons/index.ts` — both are asserted by
   `tests/phase-9-curriculum/capstone-coverage.test.ts`.
6. **Global feedback rule (hard mandate):** incorrect-answer feedback must guide
   toward the fix but NEVER reveal the answer, even implicitly. Every proposed
   `feedback` / `successMessage` below already honors this; keep it that way.

---

## 1. Research summary — how Brilliant actually teaches Python

Sources (fetched June 2026):
- Brilliant course catalog pages: `Thinking in Python` (`/courses/thinking-in-python/`),
  `Functions in Python` (`/courses/functions-in-python/`),
  `Programming with Functions` (`/courses/pixel-pusher/`),
  `Algorithms in Python`, `Recursion in Python`.
- Brilliant blog, "Coding rebooted: Computer Science on Brilliant"
  (`blog.brilliant.org/thinking-in-code/`).
- Independent reviews: Class Central (`Programming with Python`), Coddy
  (`coddy.tech/vs/brilliant`, 2026), WIGSAT (2025), utalk.

**Brilliant's core method (their own words + reviews):**
- **Plain-English pseudocode first.** They deliberately delay real syntax: "Starting
  new coders with unfamiliar languages like Python or C++ can make them log off…
  An easier way is with pseudocode." Syntax is the *last* step ("Migrate new skills
  to: Python").
- **Drag-and-drop interactive puzzles, minimal reading.** "We packed our intro
  course with interactive problem solving, and kept the reading as light as
  possible… learn through discovery."
- **No real code editor / no execution.** Multiple 2026 reviews stress this as
  Brilliant's #1 limitation: "you don't write and run real code in a real editor…
  it won't make you job-ready." This is the gap **our app already closes** (Pyodide
  runs real Python).
- **Strong narrative themes** drive motivation: cybergarden (intro), cryptography
  (Functions), image pixels (Programming with Functions), NLP (Algorithms), digital
  currency (Recursion).
- **Extremely fine-grained step granularity.** `Thinking in Python` alone is **70
  lessons / 874 exercises**. They isolate one micro-skill per lesson.
- **Substantive, misconception-targeting feedback** on wrong answers.

**Brilliant's beginner topic ordering (`Thinking in Python`):**
Variables → Conditional Logic → Boolean Logic → For Loops → Lists → While Loops →
String Tricks → Nesting Conditionals → Chaining Conditionals → Dictionaries →
Working with Data → Advanced Looping → Time Complexity → Search Algorithms.

Notable **named micro-skills** they isolate that we bundle or omit:
`Updating Variables`, **`Variable Self-Update`**, **`Variable Dependency`**,
`Boolean Expressions`/`Storing Boolean Values`/`Negating Booleans`/`Combining
Boolean Expressions` (i.e. `and`/`or`/`not`), `Structuring Loops`, **`Loop Variable
Dependency`**, `Logic Inside Loops`, **`Prioritizing Conditions`** /
`Conditional Chains` (order-matters), function `Scope`/`Local Variables`,
`Multiple Inputs`, `Function Composition`.

---

## 2. Our approach vs Brilliant — the framing that drives every recommendation

| Dimension | Our app | Brilliant |
|---|---|---|
| What learners write | **Real Python**, typed + executed (Pyodide) | Pseudocode drag-and-drop; no execution |
| Syntax exposure | Real `print`, `%`, `if:`, indentation from L1 | Hidden until the end |
| Interaction | Blocks-that-are-Python + typed sandboxes + Parsons + stepper widgets | Drag puzzles, sliders, multiple choice |
| Scale | 9 lessons → FizzBuzzPop capstone | ~70 micro-lessons |
| Theme | Generic (numbers / yes-no / FizzBuzz) | Strong story arcs |
| Feedback | Answer-free hints + real error diagnostics | "Why it's wrong" guidance, no real errors |

**Our durable advantages (keep / lean into):** real runnable code end-to-end;
indentation + runtime errors taught as real fixable things; execution-stepping
widgets (`program_stepper`, `range_machine`) that visualize *mechanics* Brilliant's
static model can't; a dedicated `%` lesson purpose-built for the endpoint; honest
construct-enforced grading.

**Where Brilliant beats us (the targets of the changes below):**
1. **Step granularity** — we bundle several new skills per lesson, creating
   difficulty cliffs (worst at L7 and L9).
2. **Narrative motivation** — our content is topic-generic; nothing pulls the
   learner forward.
3. **Conceptual completeness of fundamentals** — we omit, by design, several things
   Brilliant treats as core. Most omissions are fine for a FizzBuzz-only target, but
   two are **load-bearing for our own capstone** (variable self-update; the
   build-a-label-then-decide pattern) and must be added.

---

## 3. Per-lesson findings (what's better / worse / the gap)

Brief verdicts; the actionable edits are in §4. File map is in
`curriculum-constraints.md`.

### L1 — Talking to the Computer (`print`, strings) — `l1-talking-to-the-computer.ts`
- **Better than Brilliant:** block → real typed `print(...)` in one lesson; ends with
  a genuine "you ran a real program" payoff Brilliant never gives.
- **Worse:** no narrative hook; output is generic ("Good morning!"/"Hello World!").
- **Gap:** no "why should I care" framing; no personal ownership.

### L2 — Boxes that Remember (variables) — `l2-boxes-that-remember.ts`
- **Better:** the `value_box` "new value pushes the old out" model is excellent;
  teaching int-vs-string types early is ahead of Brilliant.
- **Worse:** we collapse into 2 block problems what Brilliant spreads over ~5 calibrated
  steps (Variables, Updating, Self-Update, Dependency).
- **Gap (load-bearing):** we never teach **variable self-update** (`x = x + 1`).
  The L7 accumulator is the first time the learner meets it. **Highest-leverage fix.**

### L3 — What's Remaining? (`%`) — `l3-doing-the-math.ts`
- **Better:** a dedicated `%` lesson is our most defensible original choice — FizzBuzz
  needs it and Brilliant-style learners hit "what's `%`?" mid-problem. Better pedagogy
  than Brilliant for this endpoint.
- **Worse:** narrow/one-operator; we dropped general arithmetic, so `%` can feel like
  the only math that exists.
- **Gap:** no acknowledgement of `+ - * /` before zooming into `%`; weak real-world hook.

### L4 — True or False (comparisons/booleans) — `l4-true-or-false.ts`
- **Better:** `==` vs `=` warning and the exact-string-match sequence are more concrete
  and beginner-protective than Brilliant.
- **Worse:** booleans taught ONLY as comparison outputs.
- **Gap (conceptual):** `True`/`False` as *values you can store*, and **`and`/`or`/`not`**,
  are entirely absent — Brilliant's cornerstone. Biggest conceptual hole.

### L5 — Making Decisions (`if`/`elif`/`else`) — `l5-making-decisions.ts`
- **Better:** strongest lesson; one-rung-at-a-time arc, the line-by-line
  `program_stepper`, predict-first framing, and teaching indentation as a real runtime
  error all beat Brilliant's static model.
- **Worse:** the `if-elif-else` step is read-only (locked) — the learner predicts but
  never *authors* an `elif`.
- **Gap:** no explicit "**order matters**" beat (Brilliant's "Prioritizing Conditions"),
  which FizzBuzz's overlap cases depend on.

### L6 — Over and Over Again (`for`/`range`) — `over-and-over-again.ts`
- **Better:** outstanding tedium-first motivation; `range(1, n+1)` collapse stepper kills
  a real misconception; off-by-one focus is right.
- **Worse:** `i` is mostly a counter/printer.
- **Gap:** **loop-variable dependency** (using `i` in a calculation each turn) is
  underexercised; no `while` (acceptable for the target).

### L7 — Loops + Decisions (accumulator, nested if) — `l7-loops-and-decisions.ts`
- **Better:** teaching **double indentation** head-on is a real-Python necessity Brilliant
  sidesteps; clear read→add→store framing.
- **Worse / Gap:** **steepest difficulty cliff.** The final typed step needs
  `loop + if/else + % + string accumulation` at once, while L2 never taught self-update
  and L4 never taught combining conditions. No `str()` (deliberate) — learners never turn
  a number into text.

### L8 — Build Your Own Machine (`def`/`return`) — `l8-build-your-own-machine.ts`
- **Better:** the stepper that jumps execution *into* a function and back is the standout;
  the L1 machine callback closes the arc; mistake-specific answer-free hints are excellent.
- **Worse:** one parameter, one return, no scope; functions are never actually *used* in L9
  (lesson is slightly orphaned).
- **Gap:** **scope / local variables** absent (Brilliant gives it a whole level).

### L9 — FizzBuzzPop (capstone) — `l9-fizzbuzzpop.ts`
- **Better:** a real, from-scratch, executed program as a finale beats Brilliant's
  drag-drop endings; construct-enforcement makes the win honest.
- **Worse / Gap:** **harshest jump in the curriculum.** Three divisors + *joined* labels
  (`FizzBuzz`, `FizzPop`) require the **build-a-label-then-decide** pattern, which was never
  taught (L5's `elif` is mutually-exclusive, not additive). Only one test case; no worked
  sub-example for `label = ""` then "print number only if label empty."

---

## 4. Change specifications (reproducible)

Changes are ordered by impact. Each is **single-lesson / parallel-safe** unless
flagged. "Insertion point" means: add a new object to that lesson's `steps` array at
the stated position (don't delete existing steps unless told to).

> **Priority order:** Change 1 (L2 self-update) → Change 2 (L9 scaffolding) →
> Change 3 (L5 author-elif + order) → Change 4 (L4 boolean values + and/or) →
> Changes 5–9 (polish). Changes 1, 2, 3 are the load-bearing ones for the capstone.

---

### CHANGE 1 — L2: teach **variable self-update** (`x = x + 1`)  ★ highest leverage
- **File:** `src/content/lessons/l2-boxes-that-remember.ts`
- **Scope:** single-lesson, purely additive.
- **Why:** The L7 accumulator (`result = result + ...`) and the L9 label build are
  the *first* places a learner meets a box using its own old value — a known cliff.
  Brilliant isolates this as its own lesson ("Variable Self-Update"). Teaching it here,
  right after reassignment, removes the novelty from L7/L9 so those lessons only
  introduce *one* new idea each.
- **Insertion point:** add **two** new steps to the END of the `steps` array, after
  the existing `last-value-wins` step (so the arc is: store → types → store text →
  last-value-wins → *self-update concept* → *self-update practice*).

**New step A — concept article (uses `program_stepper` trace mode):**
```ts
{
  id: 'a-box-can-update-itself',
  type: 'article',
  title: 'A box can update itself',
  graded: false,
  config: {
    panels: [
      {
        text: 'Here is the clever part: a box can build its **new** value out of its **own old** value. `score = score + 3` means "read what is in score right now, add 3, and put the answer back in the same box." Press **Step** and watch score use itself to grow.',
        activity: {
          kind: 'widget',
          widget: 'program_stepper',
          config: {
            mode: 'trace',
            code: ['score = 5', 'score = score + 3', 'print(score)'],
            steps: [
              { line: 0, commentary: 'Put 5 in the box called score.', vars: { score: 5 } },
              { line: 1, commentary: 'Read score\u2019s old value (5), add 3 onto it, then store the answer back in the SAME box. score goes from 5 to 8.', vars: { score: 8 } },
              { line: 2, commentary: 'Print score \u2014 the box now holds 8.', vars: { score: 8 }, output: '8' },
            ],
            caption: 'The right side is worked out first (using the old value), then the answer is stored back.',
          },
        },
      },
      {
        text: 'Quick check:',
        activity: {
          kind: 'checkpoint',
          prompt: 'The box count holds 4. After the line count = count + 1 runs, what is in count?',
          choices: ['1', '5', '4'],
          answerIndex: 1,
          feedback: {
            correct: 'Right \u2014 it read the old value (4), added 1, and stored 5 back.',
            incorrect: 'Read the right side first using the OLD value in the box, then store that answer back. What does 4 plus 1 give?',
          },
        },
      },
    ],
  },
}
```

**New step B — graded block practice (self-update with locked blocks):**
```ts
{
  id: 'add-to-the-box',
  type: 'block_problem',
  title: 'Grow the box',
  graded: true,
  config: {
    mode: 'fill_blank',
    prompt:
      'The box score starts at 10. The next line should grow score by reading its own value and adding to it. Change the amount that is added so score ends up holding 13, then Run. (You can change the number, but you cannot delete the blocks.)',
    palette: [],
    lockBlocks: true,
    requirePrintVar: 'score',
    initial: [
      {
        type: 'assign',
        slots: {
          target: [{ type: 'var', fields: { name: 'score' } }],
          value: [{ type: 'num', fields: { value: 10 } }],
        },
      },
      {
        type: 'assign',
        slots: {
          target: [{ type: 'var', fields: { name: 'score' } }],
          value: [
            {
              type: 'binop',
              fields: { op: '+' },
              slots: {
                left: [{ type: 'var', fields: { name: 'score' } }],
                right: [{ type: 'num', fields: { value: 1 } }],
              },
            },
          ],
        },
      },
      { type: 'print', slots: { value: [{ type: 'var', fields: { name: 'score' } }] } },
    ],
    expectedOutput: '13',
  },
}
```

- **Tests to add/update:**
  - `tests/phase-9-curriculum/capstone-coverage.test.ts` — only if it asserts L2's exact
    step count/ids; if it does, add the two new ids. (It should still pass the "assign
    block exists / variable_box+type_sorter articles exist" assertions unchanged.)
  - `tests/phase-9-curriculum/curriculum.pyodide.test.ts` — add `add-to-the-box` to the
    run-only block list so its compiled blocks are executed and asserted to print `13`.
  - `tests/phase-9-curriculum/widgets.test.tsx` — assert the new `program_stepper`
    trace renders (mirror the existing L7 trace assertions).

---

### CHANGE 2 — L9: add a **build-a-label-then-decide** scaffolding step before the capstone  ★
- **File:** `src/content/lessons/l9-fizzbuzzpop.ts`
- **Scope:** single-lesson, additive. **Do NOT touch the `capstone` step** (the coverage
  contract pins it).
- **Why:** FizzBuzzPop's hard, never-taught move is "build a label string across several
  ifs, then print the number only if the label is still empty." Right now the learner
  meets it for the first time in the graded capstone, with three divisors at once. A
  two-divisor (Fizz/Buzz) guided rehearsal turns the cliff into a ramp: the only *new*
  thing left in the capstone becomes "add Pop." This is the Brilliant move (3–4 graduated
  lead-ins before the finale).
- **Insertion point:** add a new step **immediately before** the object with
  `id: 'capstone'` (i.e. between `the-rules` and `capstone`).

**New step — guided Fizz/Buzz label builder:**
```ts
{
  id: 'build-a-label',
  type: 'python_sandbox',
  title: 'Build the label first',
  graded: true,
  config: {
    prompt:
      'Warm up with just two rules. Go through the numbers 1 to 15. For each number, start an empty label "" and: add "Fizz" if it is a multiple of 3, then add "Buzz" if it is a multiple of 5. After both checks, if the label is still empty print the number itself; otherwise print the label. (A number like 15 is a multiple of BOTH, so its label becomes FizzBuzz.)',
    starterCode: 'n = 15\n',
    requiredConstructs: ['loop', 'modulo', 'conditional'],
    successMessage:
      'That is the whole trick! You built a label up across two checks, then printed the number only when the label stayed empty. The capstone is this exact shape with one more rule (Pop) added.',
    testCases: [
      {
        stdin: '',
        expectedStdout:
          '1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz',
        feedback:
          'Not yet \u2014 check three things: do you reset the label to "" at the start of each number, do you ADD onto the label (not replace it) for each rule, and do you print the number only when the label is still empty?',
      },
    ],
  },
}
```

- **Reference (known-correct) solution — for the test, NOT shown to learners:**
```python
n = 15
for i in range(1, n + 1):
    label = ""
    if i % 3 == 0:
        label = label + "Fizz"
    if i % 5 == 0:
        label = label + "Buzz"
    if label == "":
        print(i)
    else:
        print(label)
```
- **Tests to add/update:**
  - Add `tests/phase-9-curriculum/l9-fizzbuzzpop.test.ts` (or extend the existing L9 test):
    run the reference solution above under Pyodide and assert its stdout equals the
    step's `expectedStdout`. This proves the step is solvable. Runs under
    `npm run test:pyodide`.
  - `tests/phase-9-curriculum/capstone-coverage.test.ts` — if it asserts L9's step count
    or that `capstone` is at a fixed index, update to allow the new step while keeping
    `capstone` as a graded `python_sandbox` with `requiredConstructs:
    ['conditional','loop','modulo']`. The reference solution in
    `tests/phase-9-curriculum/fixtures.ts` and the capstone's `expectedStdout` must stay
    unchanged.

---

### CHANGE 3 — L5: make the learner **author an `elif`**, and teach **order matters**  ★
- **File:** `src/content/lessons/l5-making-decisions.ts`
- **Scope:** single-lesson, additive (do not remove the existing read-only
  `if-elif-else` predict step — it stays as the gentle "read it" beat).
- **Why:** Today every `elif` in L5 is pre-written; the learner predicts but never
  *produces* one, and we never teach that with overlapping conditions the *order* of
  branches changes the result (Brilliant's "Prioritizing Conditions"). Both skills are
  exactly what FizzBuzzPop's combined cases (15 → FizzBuzz) lean on.

**3a — add an "order matters" checkpoint** to the existing `meet-elif` article. Append
this panel to that step's `config.panels` array (after its current last panel):
```ts
{
  text: 'One more thing about order. Because Python takes the **first** branch that is True and skips the rest, the order you write them in can change the answer when a number fits more than one check. Think about that:',
  activity: {
    kind: 'checkpoint',
    prompt: 'A program checks `if i is a multiple of 3` first, then `elif i is a multiple of 6`. For a number that is a multiple of BOTH (like 6), which branch runs?',
    choices: [
      'The multiple-of-3 branch \u2014 it comes first, so Python stops there',
      'The multiple-of-6 branch \u2014 it is more specific',
      'Both branches run',
    ],
    answerIndex: 0,
    feedback: {
      correct: 'Right \u2014 Python takes the first open door and never reaches the second, so order decides the outcome here.',
      incorrect: 'Remember Python stops at the FIRST branch whose question is True. Which of the two checks does it reach first as it reads top to bottom?',
    },
  },
}
```

**3b — add a new graded step where the learner writes the `elif` condition.** Insert
**immediately after** the existing `if-elif-else` step:
```ts
{
  id: 'add-your-own-path',
  type: 'block_problem',
  title: 'Add the middle path',
  graded: true,
  config: {
    mode: 'fill_blank',
    prompt:
      'We put the number 10 in the box i. The middle path (the elif) is empty \u2014 finish its yes/no question so the elif runs when i is a multiple of 5: fill it with i\u2019s remainder after dividing by 5, then compare that to 0. Predict first: 10 is not a multiple of 3 but it is a multiple of 5 \u2014 which path should win? Then Run. (You can fill in and change the blocks, but you cannot delete them.)',
    palette: ['binop', 'num', 'var'],
    lockBlocks: true,
    requiredConstructs: ['conditional'],
    initial: [
      {
        type: 'assign',
        slots: {
          target: [{ type: 'var', fields: { name: 'i' } }],
          value: [{ type: 'num', fields: { value: 10 } }],
        },
      },
      {
        type: 'if_block',
        slots: {
          cond: [
            {
              type: 'compare',
              fields: { op: '==' },
              slots: {
                left: [
                  {
                    type: 'binop',
                    fields: { op: '%' },
                    slots: {
                      left: [{ type: 'var', fields: { name: 'i' } }],
                      right: [{ type: 'num', fields: { value: 3 } }],
                    },
                  },
                ],
                right: [{ type: 'num', fields: { value: 0 } }],
              },
            },
          ],
          body: [{ type: 'print', slots: { value: [{ type: 'str', fields: { value: 'multiple of 3' } }] } }],
        },
      },
      {
        type: 'elif_block',
        slots: {
          // Empty: the learner builds i % 5 == 0 here.
          cond: [{ type: 'compare', fields: { op: '==' }, slots: { left: [], right: [] } }],
          body: [{ type: 'print', slots: { value: [{ type: 'str', fields: { value: 'multiple of 5' } }] } }],
        },
      },
      {
        type: 'else_block',
        slots: { body: [{ type: 'print', slots: { value: [{ type: 'var', fields: { name: 'i' } }] } }] },
      },
    ],
    expectedOutput: 'multiple of 5',
  },
}
```
- **Tests to add/update:**
  - `tests/phase-9-curriculum/curriculum.pyodide.test.ts` — add `add-your-own-path` to the
    run-only block list (a correct fill compiles + runs to `multiple of 5`).
  - `tests/phase-9-curriculum/required-constructs.test.ts` — assert the new step enforces
    `['conditional']`.
  - `capstone-coverage.test.ts` — still satisfied (`if_block`/`else_block` exist, a
    `parsons_problem` step exists); update any exact step-count assertion.

---

### CHANGE 4 — L4: teach `True`/`False` as **values**, and a gentle **`and` / `or` / `not`**
- **File:** `src/content/lessons/l4-true-or-false.ts`
- **Scope:** single-lesson, additive, **no new widget needed** (article + checkpoints only).
- **Why:** We currently teach booleans only as the *output* of a comparison. Brilliant
  treats "True/False are values you can store and combine" as a cornerstone. Storing a
  boolean and combining conditions are core habits, and they de-risk L9 (kids naturally
  want `if i % 3 == 0 and i % 5 == 0`).
- **Insertion point:** add a new article step **after** the existing `exact-text` step
  (end of the lesson), so the lesson ends on "you can store and combine these answers."

**New step — booleans as values + combining:**
```ts
{
  id: 'storing-and-combining',
  type: 'article',
  title: 'Saving and joining answers',
  graded: false,
  config: {
    panels: [
      {
        text: 'A True/False answer is a **value**, just like a number or text \u2014 so you can store it in a box and use it later. `is_ready = True` puts the answer True into a box called is_ready. Later your program can check that box to decide what to do.',
        activity: {
          kind: 'checkpoint',
          prompt: 'After the line `is_open = 5 > 3`, what is stored in the box is_open?',
          choices: ['True', 'False', 'the number 5'],
          answerIndex: 0,
          feedback: {
            correct: 'Right \u2014 5 is bigger than 3, so the comparison is True, and that True gets stored in the box.',
            incorrect: 'Work out the comparison first: is 5 bigger than 3? Whatever that answer is, THAT is what lands in the box.',
          },
        },
      },
      {
        text: 'You can also **join two questions** into one. `and` is True only when **both** halves are True. `or` is True when **at least one** half is True. (There is also `not`, which flips True to False and back.)',
        activity: {
          kind: 'checkpoint',
          prompt: 'You go to recess only if it is dry AND it is warm. Today it is dry but cold. Do you go?',
          choices: ['No \u2014 with `and`, both have to be True', 'Yes \u2014 one True is enough', 'Only if you also use `or`'],
          answerIndex: 0,
          feedback: {
            correct: 'Exactly \u2014 `and` needs BOTH sides True, and "cold" makes one side False.',
            incorrect: 'With `and`, ask: are BOTH halves True? If even one is False, the whole thing is False. Is "warm" True today?',
          },
        },
      },
    ],
  },
}
```
- **Tests to add/update:**
  - `tests/phase-9-curriculum/widgets.test.tsx` (or the L4 test) — assert the new article
    step renders with its checkpoints.
  - `capstone-coverage.test.ts` — still satisfied (`compare` block + `comparison_explorer`
    article unchanged); update any exact step-count assertion.
- **Note / optional escalation:** this teaches `and`/`or` *conceptually* only. If we later
  want learners to *write* `and`/`or` in real Python, the source-level construct checks /
  diagnostics may need awareness of boolean operators — that is a **shared change** to
  graders; STOP and report it rather than editing graders inside a single-lesson subagent.

---

### CHANGE 5 — L6: add a **loop-variable dependency** step (use `i` in a calculation)
- **File:** `src/content/lessons/over-and-over-again.ts`
- **Scope:** single-lesson, additive.
- **Why:** Today `i` is almost always just printed or counted. Brilliant isolates "Loop
  Variable Dependency" — using the loop variable to *compute* something each turn. It
  cements that `i` is real data, and it rehearses the per-turn work the L7 accumulator and
  L9 need.
- **Insertion point:** add **after** the existing `count-1-to-n` step (end of lesson), as a
  typed sandbox so it also keeps nudging learners toward real Python.
```ts
{
  id: 'times-table',
  type: 'python_sandbox',
  title: 'Use the loop number',
  graded: true,
  config: {
    prompt:
      'The loop variable is real data you can do math with. Write a loop that prints the 3 times table up to 3 \u00d7 5: print 3 times each number from 1 to 5, one result per line (so the lines are 3, 6, 9, 12, 15). (n is not given \u2014 loop over 1 to 5 and multiply.)',
    starterCode: '# Loop from 1 to 5 and print 3 times each number.\n',
    requiredConstructs: ['loop'],
    successMessage:
      'Nice \u2014 you used the loop\u2019s own number in a calculation every turn. That is how loops do real work, not just count.',
    testCases: [
      {
        stdin: '',
        expectedStdout: '3\n6\n9\n12\n15',
        feedback:
          'Almost \u2014 check that you loop over the numbers 1 to 5 and that each turn you print that number multiplied by 3 (not the number by itself).',
      },
    ],
  },
}
```
- **Reference solution (for the test):**
```python
for i in range(1, 6):
    print(i * 3)
```
- **Tests:** add a Pyodide test asserting the reference solution prints `3\n6\n9\n12\n15`;
  add construct enforcement assertion (`['loop']`); update any exact L6 step-count
  assertion in `capstone-coverage.test.ts` (the `for_each` + `range(1, n+1)` assertions
  stay satisfied by the untouched steps).

---

### CHANGE 6 — L1: add a "why care" hook + personal ownership
- **File:** `src/content/lessons/l1-talking-to-the-computer.ts`
- **Scope:** single-lesson, additive/edit.
- **Why:** L1 has no motivation hook and prints generic text. Brilliant always makes the
  first output *matter*. Cheap, high-warmth win.
- **Edit 1 — add a lead-in panel** at the TOP of the `intro` step's `config.panels`
  (before the current first panel):
```ts
{
  text: 'Every app, game, and website you use is just a program telling a computer what to do. The very first thing to learn is how to make a computer **say something back to you** \u2014 that is what this whole lesson is about. Let\u2019s make it talk.',
}
```
- **Edit 2 — personalize the final win.** In the `first-program` step, change the prompt
  so the learner prints *their own name* (keeps `lenient: true`, keeps the milestone
  `successMessage`). Suggested prompt: *"Write a line that prints a greeting with YOUR
  name in it \u2014 like `Hello, Sam!` \u2014 then press Run."* If you make this change, the
  single test case's `expectedStdout` must be relaxed or removed (any non-empty printed
  greeting should pass). Because that means **grading on "printed something non-empty"**
  rather than exact text, confirm the python grader supports an "any non-empty output"
  mode; if it does **not**, this is a **shared grader change** — STOP and report it, and
  in the meantime keep the existing exact `Hello World!` target.

---

### CHANGE 7 — L3: acknowledge everyday arithmetic before zooming into `%`
- **File:** `src/content/lessons/l3-doing-the-math.ts`
- **Scope:** single-lesson, additive (one panel).
- **Why:** L3 jumps straight to `%`, which can read as "the only math in code." A single
  panel naming `+ - * /` frames `%` as "one more, special sign" and adds a real-world hook.
- **Insertion point:** add as the FIRST panel of the `intro` step (before the modulo_picker
  panel):
```ts
{
  text: 'Computers are calculators at heart. Python adds with `+`, subtracts with `-`, multiplies with `*`, and divides with `/`. This lesson is about one more sign you have probably *used* without naming \u2014 the **left over** after sharing things into equal groups (think 7 cookies shared by 3 friends). Python writes it as `%`.',
}
```
- **Tests:** `widgets.test.tsx` / L3 article render assertion still passes; no grading
  change. `capstone-coverage` (`binop` `%` and `+`, `remainder_machine`) unaffected.

---

### CHANGE 8 — L8: add a one-panel **scope / local variables** intro  (optional)
- **File:** `src/content/lessons/l8-build-your-own-machine.ts`
- **Scope:** single-lesson, additive.
- **Why:** We never mention that a parameter / variable inside a machine is *private* to
  it. Brilliant gives scope a whole level. A single conceptual panel prevents the classic
  "why didn't my variable change outside the function?" confusion.
- **Insertion point:** add a panel to the END of the `return-back` step's `config.panels`:
```ts
{
  text: 'One quiet rule: the names **inside** a machine (like `n` and `result`) belong **only** to that machine. They are private \u2014 the rest of your program cannot see them. The only thing that comes back out is whatever you `return`. That is why machines stay tidy: what happens inside the machine stays inside the machine.',
  activity: {
    kind: 'checkpoint',
    prompt: 'After `double(5)` runs and returns, can the line `print(n)` outside the machine see n?',
    choices: ['No \u2014 n lived only inside the machine', 'Yes \u2014 n is shared everywhere', 'Only if n was 5'],
    answerIndex: 0,
    feedback: {
      correct: 'Right \u2014 names made inside a machine are private to it; only the returned value comes out.',
      incorrect: 'Think about what actually leaves the machine. Was n handed back with return, or did it stay inside?',
    },
  },
}
```

---

### CHANGE 9 — Make L8 pay off in L9 (LARGER / OPTIONAL — flag before doing)
- **Files:** `l9-fizzbuzzpop.ts` (+ possibly `fixtures.ts`, `capstone-coverage.test.ts`).
- **Scope:** **larger** — touches the coverage contract's pinned capstone. **Do NOT** do
  this inside a parallel single-lesson subagent; sequence it deliberately and get sign-off.
- **Why:** Functions (L8) are currently never used after L8 — the lesson is orphaned. An
  optional capstone variant that defines a `label(n)` helper and calls it in the loop would
  tie the whole arc together (Brilliant-style composition).
- **Caution:** changing the capstone's required constructs or expected output requires
  updating the reference solution in `tests/phase-9-curriculum/fixtures.ts` and the
  `capstone-coverage.test.ts` assertions in lockstep. Treat as a design decision, not a
  drive-by edit. Recommended only after Changes 1–8 land and are validated.

---

## 5. Appendix — reference data for the implementer

### Available article widgets (enum in `src/problem-types/article/schema.ts`)
`repeated_addition`, `loop_visualizer`, `function_machine`, `variable_box`,
`value_box`, `type_sorter`, `remainder_machine`, `modulo_picker`, `multiples_grid`,
`comparison_explorer`, `branch_visualizer`, `code_tracer`, `program_stepper`
(modes: `decision` | `loop` | `trace`), `range_machine`, `decision_machine`.
**Do not invent a new widget inside a single-lesson change** — that is a shared change.

### Step types & key config flags
- `article` — `panels[]`, each panel `{ text?, activity? }`; activity is a `checkpoint`
  (`prompt`, `choices`, `answerIndex`, `feedback`) or a `widget`.
- `block_problem` — `mode` (`sandbox`|`fill_blank`|`bugfix`), `palette[]`, `initial[]`,
  `expectedOutput`, `lockBlocks`, `lenient`, `requiredConstructs`, `requirePrintVar`,
  `requireCompare`, `reassignmentVar`.
- `python_sandbox` — `prompt`, `starterCode`, `testCases[]`
  (`stdin`, `expectedStdout`, `feedback?`), `requiredConstructs`, `lenient`,
  `successMessage`.
- `parsons_problem` — `lines[]` (`id`, `code`, `indent`), `checkIndent`, plus
  `orderHint` / `indentHint`.
- `requiredConstructs` enum: `'loop' | 'modulo' | 'conditional'` only. (`requireLoop:
  true` is the legacy alias of `['loop']`.) There is **no** construct token for `and`/`or`
  or for functions — relevant to Changes 4 and 9.

### Coverage contract assertions that MUST keep passing
(`tests/phase-9-curriculum/capstone-coverage.test.ts`)
- L1: a `print` block; a `function_machine` article; a python step with `print(2 + 3)`.
- L2: an `assign` block; `variable_box` + `type_sorter` articles.
- L3: `binop` with `%` and `binop` with `+`; a `remainder_machine` article.
- L4: a `compare` block; a `comparison_explorer` article.
- L5: `if_block` + `else_block`; a `parsons_problem` step.
- L6: a `for_each` block; a `range_call` with a `binop` in its `stop` (i.e. `range(1, n+1)`).
- L7: an accumulator (`assign` whose value is a `+` binop with a `var` on the left); a
  `code_tracer` article. **Note:** the current L7 uses `program_stepper` trace, not
  `code_tracer` — verify which the test actually asserts before editing L7, and don't
  remove whatever satisfies it.
- L8: a python step whose source contains `def ` and `return`.
- L9: the `capstone` step is a graded `python_sandbox`, `requiredConstructs =
  ['conditional','loop','modulo']`, ≥1 test case; reference solution in `fixtures.ts`
  matches the capstone `expectedStdout`.
- The nine ids appear in `EXPECTED_ORDER` in registration order.

> **All proposed changes are additive** and keep every assertion above satisfied. The
> only thing that can break is an *exact step-count / step-index* assertion — search the
> coverage test for the affected lesson id and update counts/indices to include the new
> step(s).

### Definition of done (per change)
1. New/edited tests written first and watched to fail.
2. `npm run validate-content` passes.
3. `npx tsc -b` passes.
4. `npm test` passes.
5. `npm run test:pyodide` passes (mandatory for Changes 1, 2, 3, 5 — they add runnable
   block/python steps).
6. Incorrect-answer feedback re-read to confirm it never reveals the answer.
