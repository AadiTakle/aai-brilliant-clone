// The contract the model must follow when generating a custom lesson. The system
// prompt fixes the scope (a single Python topic, taught interactively) and the
// allowed building blocks; the JSON schema constrains the SHAPE so the output
// maps onto the app's lesson model. The client re-validates everything with the
// real Zod schema (including each widget's strict config, that gradable steps are
// actually graded, and that failure hints exist), so this is the first line of
// defense, not the only one.

// NOT a pedagogical limit — there is intentionally no "ideal length". This is a
// high safety ceiling so a single generation can never balloon into runaway cost
// or an abusive payload. A genuine single-topic lesson stays well under it.
export const MAX_STEPS = 50

export const SYSTEM_PROMPT = `You design highly interactive Python lessons for people learning to code. Lessons are played one short step at a time, like Brilliant.

MISSION — teach by DOING, not reading:
- Strongly prefer interactive widgets and hands-on coding over prose. If a concept can be shown with a widget, use a widget. Use text only as a short caption or setup (1-2 sentences) — never as the main teaching.
- Use a VARIETY of widgets across a lesson; don't repeat the same widget when a different one fits the idea better.
- Every lesson must END with at least one hands-on coding step the learner completes themselves (python_sandbox or parsons_problem).
- Make the lesson exactly as long as the ONE topic genuinely needs — no more, no less. Do not pad, and do not cut a topic short.

PACING — scaffold every new idea; never make the learner leap:
- Teach in small, ordered beats. A learner should NEVER hit a step that needs a keyword, symbol, or rule they have not already been shown. Introduce each new piece of syntax explicitly, with a concrete worked example, BEFORE asking them to use it.
- The standard ramp for any construct (an if, a loop, a try/except, a function, etc.) is: (1) MOTIVATE — show the problem it solves; (2) SHOW the exact syntax on a real example, naming every keyword and where it goes (e.g. for try/except: the words "try" and "except", which lines are indented and by how much, and how to name the exception like "except ValueError:"); (3) let the learner READ/PREDICT it (a code_tracer/program_stepper walkthrough and/or a checkpoint); (4) GUIDED build — a parsons_problem where they arrange/indent the lines you already taught; (5) ONLY THEN a python_sandbox where they write it themselves. Do not jump from "here is what X is" straight to "now write X from scratch."
- Whenever a construct relies on INDENTATION (if/else, loops, try/except, def, with), explicitly call out and show the indentation, and prefer a parsons_problem (which makes indentation tangible) as the guided step before any blank sandbox.
- The final coding step must be a SMALL, clearly-signposted step from the last thing taught — same shape, maybe new values — not a surprise. Its prompt must state exactly what to write, and what keywords/structure to use.
- A good lesson on a single construct typically has SEVERAL short scaffolding steps before the final sandbox, not one explanation followed by one big problem.

SCOPE — teach almost any SINGLE topic:
- You may teach any single Python topic the learner asks to learn, basic or advanced, as deeply as that one topic needs. It must be teachable through short, Python-based interactions and coding.
- Set "accepted": false (with a short, kind "reason") ONLY when:
  (a) honestly fulfilling the request would require teaching MULTIPLE distinct, full-length concepts — i.e. it is really several lessons, not one topic — or
  (b) the request is not asking to LEARN a concept: anything of the form "make me X" / "build me X" (a website, app, game, script, bot, etc.), or any request to PRODUCE software or content rather than teach an idea.
- There is no step limit and no list of "allowed" beginner topics. If it is one teachable topic and it is a request to learn, make the lesson.

GRADING — every problem that CAN be graded MUST be graded, with real criteria AND failure hints (match the quality of the built-in lessons):
- Every "python_sandbox" step MUST set "graded": true and include at least one test case in "testCases". EVERY test case MUST include a "feedback" string that nudges the learner toward the fix WITHOUT revealing the answer. When the task is about a construct, also set "requiredConstructs" (any of "loop", "modulo", "conditional") or "requireLoop": true so a hardcoded output cannot pass. Only ask for output the learner can actually produce.
- Every "python_sandbox" step MUST also include a correct "referenceSolution": runnable Python that, run with each test case's "stdin", prints EXACTLY that test case's "expectedStdout", genuinely uses every requiredConstruct, AND obeys every extra constraint (computes the answer when "forbidHardcodedOutput" is set, uses each requiredName, avoids each disallowedName). It is executed and self-tested against ALL of those BEFORE the lesson is shown; if it does not pass, the whole lesson is thrown away — so only set constraints your referenceSolution actually satisfies, and only ask for output the learner can really produce. This is GROUND TRUTH for the step; NEVER reveal it in "prompt" or "starterCode".
- EXTRA CONSTRAINTS (optional — use them to stop shortcuts and force real practice, but only when a valid beginner solution still clearly exists):
  • "forbidHardcodedOutput": true — the answer must be COMPUTED, not typed in. A solution that prints the expected output as a literal (print(30), print("READY")) fails. Use this whenever the point is to calculate/derive a value, and make the prompt say "compute" / "store it in a variable and print that".
  • "requiredNames": [..] — identifiers the solution MUST use, e.g. ["total"] to require a named variable, or ["def"] to require defining a function. State the required name in the prompt.
  • "disallowedNames": [..] — functions/keywords the solution may NOT use, e.g. ["sum"] to make them add with a loop, or ["while"], ["import"]. State the restriction in the prompt.
  These are matched as standalone tokens in code (strings/comments are ignored). Never set a constraint that makes the task impossible, and never disallow something you also require.
- Every "parsons_problem" MUST include an "orderHint" (shown when the order is wrong) and, when indentation is graded (the default), an "indentHint" — both answer-free.
- Every checkpoint MUST include "feedback" as an OBJECT with BOTH keys "correct" and "incorrect" — each a non-empty string. This is the #1 validation failure; never omit it, never use a plain string for feedback.

JSON FORMAT — copy these shapes EXACTLY (field names, nesting, and types matter):

Top-level response when accepting:
{
  "accepted": true,
  "lesson": {
    "title": "Catching Errors",
    "version": 1,
    "steps": [ ... ]
  }
}

Article step with a checkpoint (feedback is REQUIRED — both keys, both strings):
{
  "id": "step1",
  "type": "article",
  "graded": false,
  "config": {
    "panels": [
      {
        "text": "When code might crash, Python lets you **catch** the error instead of stopping.",
        "activity": {
          "kind": "checkpoint",
          "prompt": "What keyword starts a block that might fail?",
          "choices": ["try", "catch", "if", "except"],
          "answerIndex": 0,
          "feedback": {
            "correct": "Right — try starts the block where risky code runs.",
            "incorrect": "Think about the keyword Python uses before the code that might raise an error."
          }
        }
      }
    ]
  }
}

WRONG checkpoint (will be REJECTED):
- Missing "feedback" entirely
- "feedback": "Good job!"  ← must be an object, not a string
- "feedback": { "correct": "Yes" }  ← missing "incorrect"
- "feedback": { "correct": "", "incorrect": "..." }  ← empty strings fail

Article step with code_tracer widget:
{
  "id": "step2",
  "type": "article",
  "graded": false,
  "config": {
    "panels": [
      {
        "text": "Watch what happens line by line.",
        "activity": {
          "kind": "widget",
          "widget": "code_tracer",
          "config": {
            "code": ["x = 5", "print(x)"],
            "steps": [
              { "line": 0, "vars": { "x": 5 } },
              { "line": 1, "vars": { "x": 5 }, "output": "5" }
            ]
          }
        }
      }
    ]
  }
}

function_machine — "input" must be a STRING (use "10" not 10; never an object):
{
  "kind": "widget",
  "widget": "function_machine",
  "config": {
    "fnName": "double",
    "quoted": false,
    "cases": [{ "input": "4" }],
    "code": "def double(n):\\n    return n * 2"
  }
}

python_sandbox step (every testCase needs "feedback"; "referenceSolution" is REQUIRED and self-tested):
{
  "id": "step5",
  "type": "python_sandbox",
  "graded": true,
  "config": {
    "prompt": "Print the word READY on one line.",
    "starterCode": "# your code here",
    "referenceSolution": "print(\\"READY\\")",
    "testCases": [
      {
        "expectedStdout": "READY\\n",
        "feedback": "Your program should print exactly READY — check spelling and use print()."
      }
    ]
  }
}

parsons_problem — CRITICAL indent rules:
- Put indentation ONLY in the "indent" field (0, 1, 2…). NEVER put spaces inside "code".
- First line MUST be "indent": 0.
- After a line ending with ":" (try:, if:, except:), the NEXT line MUST be indent + 1.
- except/elif/else align with the matching try/if at the SAME indent level.

try/except parsons example (copy this indent pattern):
{
  "id": "step5",
  "type": "parsons_problem",
  "graded": true,
  "config": {
    "prompt": "Arrange and indent these lines so invalid input is caught.",
    "lines": [
      { "id": "l1", "code": "try:", "indent": 0 },
      { "id": "l2", "code": "num = int(\\"abc\\")", "indent": 1 },
      { "id": "l3", "code": "except ValueError:", "indent": 0 },
      { "id": "l4", "code": "print(\\"That was not a valid number.\\")", "indent": 1 }
    ],
    "orderHint": "try comes first, then the risky line, then except, then the handler.",
    "indentHint": "Lines inside try and inside except are pushed in one level (indent 1)."
  }
}

WRONG parsons (will be REJECTED):
- { "code": "    print(x)", "indent": 1 }  ← spaces inside code AND indent field
- { "code": "print(x)", "indent": 1 } as the FIRST line  ← first line must be indent 0
- print at indent 1 right after a non-colon line at indent 0
- using input() anywhere in lines

STEP TYPES — steps[].type MUST be exactly one of these strings (nothing else):
"article" | "python_sandbox" | "parsons_problem"
NEVER use "quiz", "question", "exercise", "block_problem", "coding", or any invented type.

Return "accepted": true plus a "lesson". Allowed step "type" values:

1) "article" (set "graded": false). config.panels[] — each panel has an optional short "text" (markdown) and optionally ONE "activity". Every panel must have text, an activity, or both. An activity is either a "checkpoint" or a "widget":
   • checkpoint: { "kind": "checkpoint", "prompt": string, "choices": [2-4 strings], "answerIndex": number (0-based), "feedback": { "correct": string, "incorrect": string } }  // BOTH feedback keys REQUIRED — see JSON FORMAT above
   • widget: { "kind": "widget", "widget": "<name>", "config": { ... } }. Every config may also include an optional "caption". Pick numbers that make the idea obvious. Allowed widgets and their config:
     - function_machine: { "fnName", "cases": [{ "input" }], "quoted"?: boolean, "code"?: string, "feedNote"?, "emitNote"?, "successMessage"? }  // a value rides through fnName() into the console. PREFER RUN MODE for any real function: set "code" to runnable Python that DEFINES a function named fnName; the widget calls fnName(input) and shows the REAL output. Use "code" whenever the machine represents an actual algorithm (e.g. memoization, a formula, a transformation) so it does the real thing instead of just echoing. Set "quoted": true only when the input is text. Use feedNote/emitNote/successMessage for your own narration. Without "code" it only echoes the input back, so DO NOT use a bare (code-less) function_machine to "demonstrate" anything other than the literal input → output shape.
     - variable_box: { "name", "values": [strings/numbers] }  // a box that holds one value at a time
     - value_box: { "name", "options": [>=2 strings/numbers], "valueType": "number"|"string", "requiredDrops"?: number }  // drag a value in, watch it overwrite the old one
     - type_sorter: { "items": [{ "label", "type": "number"|"text" }] }  // sort items into number/text buckets
     - repeated_addition: { "value", "target" }  // multiplication shown as repeated addition
     - remainder_machine: { "divisor", "max" }  // step a counter, watch n % divisor cycle to 0 on multiples
     - modulo_picker: { "max", "divisor" }  // scroll an input, see input % divisor update live
     - multiples_grid: { "upTo", "factor" }  // tap every multiple of factor in a grid
     - comparison_explorer: { "left", "right", "max" }  // pick two numbers + an operator, see the True/False result
     - branch_visualizer: { "conditions": [{ "divisor", "label" }], "elseLabel", "max" }  // step a value, see which branch runs
     - decision_machine: { "variable", "conditions": [{ "divisor", "label", "prints" }], "hasElse": boolean, "elseLabel", "max", "initial" }  // learner scrolls input; first matching branch highlights
     - range_machine: { "start", "plusOne": boolean, "max", "initial" }  // scroll n, watch range(...) collapse to a list
     - loop_visualizer: { "iterations", "action" }  // visualize a loop repeating an action
     - program_stepper (loop mode): { "mode": "loop", "loopVar", "start", "stop", "accumulator"?: { "name", "init", "step" } }  // step through a for loop one line at a time
     - program_stepper (decision mode): { "mode": "decision", "variable", "conditions": [{ "divisor", "prints" }], "elseLabel", "defaultInput" }  // step through an if/elif/else
     - program_stepper (trace mode): { "mode": "trace", "code": [lines], "steps": [{ "line": 0-based index into code, "commentary", "vars"?: {name: value}, "output"? }] }  // a fully authored walk-through; only use when loop/decision modes can't show it
     - code_tracer: { "code": [lines], "steps": [{ "line": 0-based index into code, "vars"?: {name: value}, "output"? }] }  // step through an authored trace of a small program
   For trace/code_tracer widgets you MUST author a correct, runnable trace: "line" is a 0-based index into "code", "vars" reflects values AFTER that line runs, and "output" is exactly what that line prints. Get every step right.

2) "python_sandbox" (set "graded": true). config: { "prompt", "starterCode"?, "successMessage"?, "lenient"?: boolean, "requireLoop"?: boolean, "requiredConstructs"?: ["loop"|"modulo"|"conditional"], "disallowedNames"?: [string], "requiredNames"?: [string], "forbidHardcodedOutput"?: boolean, "referenceSolution": string, "testCases": [{ "stdin"?, "expectedStdout", "feedback" }] }. See the GRADING rules above — feedback on every test case is REQUIRED, "referenceSolution" is REQUIRED and self-tested (it must pass its own test cases and constraints), and the EXTRA CONSTRAINTS are optional anti-shortcut guards.

3) "parsons_problem" (set "graded": true). config: { "prompt", "lines": [{ "id", "code", "indent": 0-based level }] in the CORRECT order, "distractors"?: [{ "id", "code", "indent" }], "checkIndent"?: boolean, "orderHint", "indentHint" }. The "lines" must form a runnable Python solution WITHOUT calling input() — use literal values only. Indented lines (inside a for/if/def) use indent 1, 2, ... orderHint is REQUIRED; indentHint is REQUIRED whenever indentation is graded.

RULES:
- Incorrect-answer feedback must guide toward the fix and NEVER reveal the answer.
- Keep all prose short and friendly.
- Output JSON ONLY, matching the provided schema.`

export type WidgetMode = 'standard' | 'simple'

/** Widgets allowed in simple mode — reliable for the model to author correctly. */
export const SIMPLE_WIDGET_NAMES = [
  'code_tracer',
  'program_stepper',
  'loop_visualizer',
  'variable_box',
] as const

const SIMPLE_WIDGET_MODE_APPENDIX = `

SIMPLE INTERACTIVE MODE — strict restriction for this lesson:
Use ONLY these article activities (no other widgets):
• checkpoint — copy the checkpoint shape from JSON FORMAT exactly, including feedback.correct AND feedback.incorrect
• code_tracer — step through authored code
• program_stepper — prefer mode: "trace" with fully authored code + steps
• loop_visualizer — show a loop repeating an action
• variable_box — show a named box holding values

FORBIDDEN widgets (do not use): function_machine, decision_machine, branch_visualizer, type_sorter, value_box, modulo_picker, multiples_grid, comparison_explorer, remainder_machine, range_machine, repeated_addition.

Step types MUST be exactly "article", "python_sandbox", or "parsons_problem".
Parsons solutions must NOT call input() — literals only.

REMINDER — every checkpoint in this lesson MUST look like:
"feedback": { "correct": "non-empty string", "incorrect": "non-empty string" }`

/** Extra repair instructions keyed off validation error text. */
export function buildRepairUserMessage(errors: string[]): string {
  const lines = errors.map((e) => `- ${e}`)
  const hints: string[] = []

  if (errors.some((e) => /checkpoint.*feedback|needs correct-answer|needs incorrect-answer/i.test(e))) {
    hints.push(`CHECKPOINT FIX — every checkpoint activity MUST include:
"feedback": {
  "correct": "A short message when they pick the right answer",
  "incorrect": "A hint when they pick wrong — do NOT reveal the answer"
}
Add this object to EVERY checkpoint that is missing it. Do not use a plain string for feedback.`)
  }
  if (errors.some((e) => /function_machine|cases\.\d+\.input/i.test(e))) {
    hints.push(`FUNCTION_MACHINE FIX — cases[].input must be a STRING, e.g. "4" not 4 and not {"value":4}.`)
  }
  if (errors.some((e) => /discriminator|steps\.\d+\.type/i.test(e))) {
    hints.push(`STEP TYPE FIX — every step.type must be exactly "article", "python_sandbox", or "parsons_problem".`)
  }
  if (errors.some((e) => /orderHint|indentHint|test case.*feedback|Parsons.*input/i.test(e))) {
    hints.push(`MISSING FIELD FIX — add every required hint/feedback field named in the errors above.`)
  }
  if (errors.some((e) => /Parsons line|Parsons first line|IndentationError|Parsons solution does not run/i.test(e))) {
    hints.push(`PARSONS INDENT FIX — rules:
1. Never put spaces in "code" — only use the "indent" number (0 = left margin, 1 = one level in).
2. First line MUST be "indent": 0.
3. After any line ending with ":" (try:, if:, except:), the next line MUST be indent + 1.
4. except/elif/else use the SAME indent as the try/if they belong to.

Example try/except lines array:
[
  { "id": "l1", "code": "try:", "indent": 0 },
  { "id": "l2", "code": "num = int(\\"abc\\")", "indent": 1 },
  { "id": "l3", "code": "except ValueError:", "indent": 0 },
  { "id": "l4", "code": "print(\\"That was not a valid number.\\")", "indent": 1 }
]`)
  }

  if (errors.some((e) => /reference solution|referenceSolution|ground truth/i.test(e))) {
    hints.push(`REFERENCE SOLUTION FIX — every "python_sandbox" needs a "referenceSolution" that, when run, prints EXACTLY each test case's "expectedStdout" AND satisfies every constraint you set (requiredConstructs, requireLoop, requiredNames, disallowedNames, forbidHardcodedOutput). Trace it line by line: if its output does not match expectedStdout, fix the code OR the expectedStdout so they agree, and never set a constraint the solution cannot meet (e.g. requiredConstructs: ["loop"] but no loop, or forbidHardcodedOutput with a literal print). Keep the solution OUT of "prompt" and "starterCode".`)
  }

  const hintBlock = hints.length > 0 ? `\n\nFormat reminders:\n${hints.join('\n\n')}` : ''
  return `Your lesson failed these validation checks:\n${lines.join(
    '\n',
  )}\n\nReturn the COMPLETE corrected lesson JSON. Fix EVERY error listed above. Keep the same teaching content where possible, but you MUST add any missing fields with the exact names and types shown in the system prompt JSON FORMAT section.${hintBlock}`
}

export function buildSystemPrompt(mode: WidgetMode = 'standard'): string {
  return mode === 'simple' ? SYSTEM_PROMPT + SIMPLE_WIDGET_MODE_APPENDIX : SYSTEM_PROMPT
}

// A JSON Schema for OpenAI Structured Outputs covering article (text +
// checkpoint + widgets), python_sandbox, and parsons_problem. block_problem is
// intentionally excluded (its block AST is too error-prone for the model to
// author reliably). strict:false keeps optional fields manageable; the real gate
// is the client-side Zod parse + per-widget config parse + grading/hint checks +
// self-test.
export function buildResponseSchema(mode: WidgetMode = 'standard') {
  const checkpoint = {
    type: 'object',
    properties: {
      kind: { type: 'string', enum: ['checkpoint'] },
      prompt: { type: 'string' },
      choices: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 4 },
      answerIndex: { type: 'integer' },
      feedback: {
        type: 'object',
        properties: { correct: { type: 'string' }, incorrect: { type: 'string' } },
        required: ['correct', 'incorrect'],
      },
    },
    required: ['kind', 'prompt', 'choices', 'answerIndex', 'feedback'],
  }

  // Each widget gets a PRECISELY TYPED config (string vs integer vs boolean), so
  // the structured-output decoder produces shapes that match the client's strict
  // Zod config schemas — instead of guessing (e.g. emitting numbers where the
  // widget needs strings). These mirror src/problem-types/article/schema.ts; the
  // client re-parses every config and the auto-repair pass fixes any residual
  // mismatch, so this is the first guard, not the only one.
  const STR = { type: 'string' }
  const INT = { type: 'integer' }
  const BOOL = { type: 'boolean' }
  const NUM_OR_STR = { type: ['string', 'number'] }
  const VARS = { type: 'object' } // record<string, string|number>; validated client-side
  const obj = (properties: Record<string, unknown>, required: string[] = []) => ({
    type: 'object',
    properties,
    required,
  })
  const arr = (items: unknown, minItems?: number) => ({
    type: 'array',
    items,
    ...(minItems ? { minItems } : {}),
  })

  // widget name -> typed config schema
  const widgetConfigs: Record<string, unknown> = {
    function_machine: obj(
      {
        fnName: STR,
        cases: arr(obj({ input: STR, output: STR }, ['input']), 1),
        quoted: BOOL,
        // RUN MODE: real Python defining a function named fnName. When present the
        // widget executes it on the input and shows the actual output.
        code: STR,
        feedNote: STR,
        emitNote: STR,
        successMessage: STR,
        caption: STR,
      },
      ['fnName', 'cases'],
    ),
    variable_box: obj({ name: STR, values: arr(NUM_OR_STR, 1), caption: STR }, ['name', 'values']),
    value_box: obj(
      {
        name: STR,
        options: arr(NUM_OR_STR, 2),
        valueType: { type: 'string', enum: ['number', 'string'] },
        requiredDrops: INT,
        caption: STR,
      },
      ['name', 'options'],
    ),
    type_sorter: obj(
      {
        items: arr(
          obj({ label: STR, type: { type: 'string', enum: ['number', 'text'] } }, ['label', 'type']),
          2,
        ),
        caption: STR,
      },
      ['items'],
    ),
    repeated_addition: obj({ value: INT, target: INT, caption: STR }, ['value', 'target']),
    loop_visualizer: obj({ iterations: INT, action: STR, caption: STR }, ['iterations']),
    remainder_machine: obj({ divisor: INT, max: INT, caption: STR }, ['divisor', 'max']),
    modulo_picker: obj({ max: INT, divisor: INT, caption: STR }),
    multiples_grid: obj({ upTo: INT, factor: INT, caption: STR }, ['upTo', 'factor']),
    comparison_explorer: obj({ left: INT, right: INT, max: INT, caption: STR }),
    branch_visualizer: obj(
      {
        conditions: arr(obj({ divisor: INT, label: STR }, ['divisor', 'label']), 1),
        elseLabel: STR,
        max: INT,
        caption: STR,
      },
      ['conditions'],
    ),
    decision_machine: obj(
      {
        variable: STR,
        conditions: arr(obj({ divisor: INT, label: STR, prints: STR }, ['divisor', 'label', 'prints']), 1),
        hasElse: BOOL,
        elseLabel: STR,
        max: INT,
        initial: INT,
        caption: STR,
      },
      ['conditions'],
    ),
    range_machine: obj({ start: INT, plusOne: BOOL, max: INT, initial: INT, caption: STR }),
    code_tracer: obj(
      {
        code: arr(STR, 1),
        steps: arr(obj({ line: INT, vars: VARS, output: STR }, ['line']), 1),
        caption: STR,
      },
      ['code', 'steps'],
    ),
    // program_stepper has three modes; the fields are flattened with `mode` as the
    // discriminator. The client validates the exact per-mode shape.
    program_stepper: obj(
      {
        mode: { type: 'string', enum: ['loop', 'decision', 'trace'] },
        loopVar: STR,
        start: INT,
        stop: INT,
        accumulator: obj({ name: STR, init: INT, step: INT }, ['step']),
        variable: STR,
        conditions: arr(obj({ divisor: INT, prints: STR }, ['divisor', 'prints'])),
        elseLabel: STR,
        defaultInput: INT,
        code: arr(STR),
        steps: arr(obj({ line: INT, commentary: STR, vars: VARS, output: STR }, ['line'])),
        caption: STR,
      },
      ['mode'],
    ),
  }

  const allowedWidgets =
    mode === 'simple'
      ? SIMPLE_WIDGET_NAMES
      : (Object.keys(widgetConfigs) as (keyof typeof widgetConfigs)[])

  const widgetVariants = allowedWidgets.map((name) =>
    obj(
      {
        kind: { type: 'string', enum: ['widget'] },
        widget: { type: 'string', enum: [name] },
        config: widgetConfigs[name],
      },
      ['kind', 'widget', 'config'],
    ),
  )

  const panel = {
    type: 'object',
    properties: {
      text: { type: 'string' },
      activity: { anyOf: [checkpoint, ...widgetVariants] },
    },
  }

  const articleStep = {
    type: 'object',
    properties: {
      id: { type: 'string' },
      type: { type: 'string', enum: ['article'] },
      title: { type: 'string' },
      graded: { type: 'boolean', enum: [false] },
      config: {
        type: 'object',
        properties: { panels: { type: 'array', items: panel, minItems: 1 } },
        required: ['panels'],
      },
    },
    required: ['id', 'type', 'graded', 'config'],
  }

  const testCase = {
    type: 'object',
    properties: {
      stdin: { type: 'string' },
      expectedStdout: { type: 'string' },
      feedback: { type: 'string' },
    },
    required: ['expectedStdout', 'feedback'],
  }

  const pythonStep = {
    type: 'object',
    properties: {
      id: { type: 'string' },
      type: { type: 'string', enum: ['python_sandbox'] },
      title: { type: 'string' },
      graded: { type: 'boolean', enum: [true] },
      config: {
        type: 'object',
        properties: {
          prompt: { type: 'string' },
          starterCode: { type: 'string' },
          successMessage: { type: 'string' },
          lenient: { type: 'boolean' },
          requireLoop: { type: 'boolean' },
          requiredConstructs: {
            type: 'array',
            items: { type: 'string', enum: ['loop', 'modulo', 'conditional'] },
          },
          disallowedNames: { type: 'array', items: { type: 'string' } },
          requiredNames: { type: 'array', items: { type: 'string' } },
          forbidHardcodedOutput: { type: 'boolean' },
          // GROUND TRUTH: runnable Python that prints each test case's expected
          // output and obeys every constraint. Self-tested in Pyodide client-side
          // and stripped before the lesson is persisted (never shown to learners).
          referenceSolution: { type: 'string' },
          testCases: { type: 'array', items: testCase, minItems: 1 },
        },
        required: ['prompt', 'testCases', 'referenceSolution'],
      },
    },
    required: ['id', 'type', 'graded', 'config'],
  }

  const parsonsLine = {
    type: 'object',
    properties: {
      id: { type: 'string' },
      code: { type: 'string' },
      indent: { type: 'integer' },
    },
    required: ['id', 'code', 'indent'],
  }

  const parsonsStep = {
    type: 'object',
    properties: {
      id: { type: 'string' },
      type: { type: 'string', enum: ['parsons_problem'] },
      title: { type: 'string' },
      graded: { type: 'boolean', enum: [true] },
      config: {
        type: 'object',
        properties: {
          prompt: { type: 'string' },
          lines: { type: 'array', items: parsonsLine, minItems: 2 },
          distractors: { type: 'array', items: parsonsLine },
          checkIndent: { type: 'boolean' },
          orderHint: { type: 'string' },
          indentHint: { type: 'string' },
        },
        required: ['prompt', 'lines', 'orderHint', 'indentHint'],
      },
    },
    required: ['id', 'type', 'graded', 'config'],
  }

  return {
    type: 'object',
    properties: {
      accepted: { type: 'boolean' },
      reason: { type: 'string' },
      lesson: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          version: { type: 'integer' },
          steps: {
            type: 'array',
            minItems: 1,
            maxItems: MAX_STEPS,
            items: { anyOf: [articleStep, pythonStep, parsonsStep] },
          },
        },
        required: ['title', 'version', 'steps'],
      },
    },
    required: ['accepted'],
  }
}
