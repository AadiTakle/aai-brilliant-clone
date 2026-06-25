import { z } from 'zod'

// An article is a sequence of panels. Each panel has at most a short line of
// text guidance and a single activity (a widget or a checkpoint) — Brilliant
// style. Panels are revealed one at a time; completing a panel's activity
// unlocks "Continue".

export const checkpointSchema = z.object({
  kind: z.literal('checkpoint'),
  prompt: z.string().min(1),
  choices: z.array(z.string().min(1)).min(2),
  answerIndex: z.number().int().nonnegative(),
  feedback: z
    .object({
      correct: z.string().optional(),
      incorrect: z.string().optional(),
    })
    .optional(),
})

export const widgetSchema = z.object({
  kind: z.literal('widget'),
  widget: z.enum([
    'repeated_addition',
    'loop_visualizer',
    'function_machine',
    'variable_box',
    'value_box',
    'type_sorter',
    'remainder_machine',
    'modulo_picker',
    'multiples_grid',
    'comparison_explorer',
    'branch_visualizer',
    'code_tracer',
    'program_stepper',
    'range_machine',
    'decision_machine',
  ]),
  // Loose here; each widget component parses its own config with the strict
  // schemas below (problem-type owns its schema).
  config: z.record(z.string(), z.unknown()).default({}),
})

export const activitySchema = z.discriminatedUnion('kind', [checkpointSchema, widgetSchema])

export const panelSchema = z
  .object({
    text: z.string().optional(),
    activity: activitySchema.optional(),
  })
  .refine((p) => Boolean(p.text) || Boolean(p.activity), {
    message: 'A panel must have text, an activity, or both.',
  })

export const articleConfigSchema = z.object({
  panels: z.array(panelSchema).min(1),
})

// Strict per-widget config schemas, parsed by the widget components at render.
export const repeatedAdditionConfigSchema = z.object({
  value: z.number().int().positive(),
  target: z.number().int().positive(),
  caption: z.string().optional(),
})

export const loopVisualizerConfigSchema = z.object({
  iterations: z.number().int().positive(),
  action: z.string().default('print("Hello!")'),
  caption: z.string().optional(),
})

// --- Phase 9 widget config schemas (Python from Scratch curriculum) ---

// A function shown as a "machine": feed an input, see the output appear.
export const functionMachineConfigSchema = z.object({
  fnName: z.string().min(1),
  cases: z.array(z.object({ input: z.string(), output: z.string() })).min(1),
  caption: z.string().optional(),
  // Opt-in: render the input as an editable text field (seeded from cases[0].input)
  // so the learner types what to feed the machine. Off by default (preset cases).
  editable: z.boolean().default(false),
  // Opt-in: on Run, the output box types out exactly what the learner entered
  // (a console-style echo) instead of showing the preset case output. Off by default.
  echoInput: z.boolean().default(false),
})

// A named box that stores one value at a time; storing a new value forgets the old.
export const variableBoxConfigSchema = z.object({
  name: z.string().min(1),
  values: z.array(z.union([z.string(), z.number()])).min(1),
  caption: z.string().optional(),
})

// Interactive variable box: the learner DRAGS one of a few preset values into a
// box. On drop the value slides into the box and overwrites whatever was there
// — the whole point of assignment. Reusable for numbers (valueType 'number') and
// text (valueType 'string', shown in quotes).
export const valueBoxConfigSchema = z.object({
  name: z.string().min(1),
  // The preset values the learner can drag in. At least two, so an overwrite can
  // actually be witnessed.
  options: z.array(z.union([z.string(), z.number()])).min(2),
  // How the values are typed/rendered. 'string' wraps each value in quotes.
  valueType: z.enum(['number', 'string']).default('number'),
  // How many drops are needed before the activity is considered complete. The
  // default of 2 forces the learner to see one value replace another.
  requiredDrops: z.number().int().positive().default(2),
  caption: z.string().optional(),
})

// Sort each item into the "number" or "text" bucket.
export const typeSorterConfigSchema = z.object({
  items: z.array(z.object({ label: z.string().min(1), type: z.enum(['number', 'text']) })).min(2),
  caption: z.string().optional(),
})

// Step a counter and watch the remainder (n % divisor) cycle, hitting 0 on multiples.
export const remainderMachineConfigSchema = z.object({
  divisor: z.number().int().positive(),
  max: z.number().int().positive(),
  caption: z.string().optional(),
})

// An iPhone-alarm-style scrollable number picker. The learner selects an input
// 0..max and the output box live-updates to (input % divisor), cycling through
// 0,1,…,divisor-1. Built off the L2 box idea (a real box visual). Reusable via
// configurable `max` and `divisor`.
export const moduloPickerConfigSchema = z.object({
  max: z.number().int().positive().default(15),
  divisor: z.number().int().positive().default(3),
  caption: z.string().optional(),
})

// A 1..upTo grid; the learner taps every multiple of `factor`.
export const multiplesGridConfigSchema = z.object({
  upTo: z.number().int().positive(),
  factor: z.number().int().positive(),
  caption: z.string().optional(),
})

// Pick two numbers (via scroll dials 0..max) and an operator; see the boolean
// result update live. Reuses the ModuloPicker scroll-selector mechanism.
export const comparisonExplorerConfigSchema = z.object({
  left: z.number().int().default(3),
  right: z.number().int().default(5),
  // Each dial shows the integers 0..max.
  max: z.number().int().positive().default(10),
  caption: z.string().optional(),
})

// Step a value and see which if/elif/else branch runs (first matching divisor).
export const branchVisualizerConfigSchema = z.object({
  conditions: z.array(z.object({ divisor: z.number().int().positive(), label: z.string().min(1) })).min(1),
  elseLabel: z.string().default('print the number'),
  max: z.number().int().positive().default(15),
  caption: z.string().optional(),
})

// Step through an authored trace: highlight the current line, show variables + output.
export const codeTracerConfigSchema = z.object({
  code: z.array(z.string()).min(1),
  steps: z
    .array(
      z.object({
        line: z.number().int().nonnegative(),
        vars: z.record(z.string(), z.union([z.string(), z.number()])).default({}),
        output: z.string().optional(),
      }),
    )
    .min(1),
  caption: z.string().optional(),
})

// The program-stepping system has two modes that share one widget:
//
//  - `decision` (default): a READ-ONLY if/elif/else "decision machine". Input
//    handling is abstracted into a side number field; the learner types ANY
//    number and STEPS through one line at a time (no "run it all"). Each step
//    highlights the current line, shows commentary, and reflects which branch
//    the entered number takes. (L5.)
//  - `loop`: a READ-ONLY `for` loop. There is no input — the learner just STEPS
//    through the iterations, watching the loop variable `i` and the console grow
//    with per-step commentary on what each line does. (L6.)
//
// In both modes the displayed code and the per-step execution are GENERATED from
// this config so they can never drift apart.

// Decision mode (L5). `mode` defaults to 'decision' so existing configs that
// omit it keep parsing unchanged.
export const programStepperDecisionConfigSchema = z.object({
  mode: z.literal('decision').default('decision'),
  // The input variable name the program reads (e.g. `n`).
  variable: z.string().min(1).default('n'),
  // The ordered divisibility branches: `if/elif n % divisor == 0: print(prints)`.
  // The first matching branch wins (the rest are skipped), exactly like Python.
  conditions: z
    .array(
      z.object({
        divisor: z.number().int().positive(),
        // The literal text the branch prints, e.g. "Fizz".
        prints: z.string().min(1),
      }),
    )
    .min(1),
  // A short, human label for the else branch used only in commentary; the else
  // itself always prints the number (the variable).
  elseLabel: z.string().min(1).default('the number itself'),
  // The number pre-filled into the input field.
  defaultInput: z.number().int().default(6),
  caption: z.string().optional(),
})

// Loop mode (L6). A `for i in range(start, stop)` walk-through. An optional
// accumulator turns the body into `name = name + step; print(name)` (a running
// total), otherwise the body is simply `print(i)`.
export const programStepperLoopConfigSchema = z.object({
  mode: z.literal('loop'),
  loopVar: z.string().min(1).default('i'),
  start: z.number().int().nonnegative().default(0),
  stop: z.number().int().positive(),
  accumulator: z
    .object({
      name: z.string().min(1).default('total'),
      init: z.number().int().default(0),
      step: z.number().int(),
    })
    .optional(),
  caption: z.string().optional(),
})

// Trace mode (L7). A fully authored walk-through of an arbitrary little program:
// the displayed `code` lines and the per-step execution are both given, so it can
// show things the generated loop/decision modes cannot — a straight-line string
// accumulator (`label = label + "Fizz"`), or a loop with an `if` nested inside it
// (which makes the body DOUBLE-indented). Each step highlights a line, carries
// commentary, and may show variables and printed output. There is no input field;
// the learner just steps. Purely additive — loop/decision configs are unaffected.
export const programStepperTraceConfigSchema = z.object({
  mode: z.literal('trace'),
  code: z.array(z.string()).min(1),
  steps: z
    .array(
      z.object({
        line: z.number().int().nonnegative(),
        commentary: z.string().min(1),
        vars: z.record(z.string(), z.union([z.string(), z.number()])).default({}),
        output: z.string().optional(),
      }),
    )
    .min(1),
  caption: z.string().optional(),
})

// Loop first so a `mode: 'loop'` config matches the loop shape; trace next so a
// `mode: 'trace'` config matches; a decision config (no `mode`, or
// `mode: 'decision'`) falls through to the decision shape.
export const programStepperConfigSchema = z.union([
  programStepperLoopConfigSchema,
  programStepperTraceConfigSchema,
  programStepperDecisionConfigSchema,
])

// A number-wheel range builder / collapse demo (L6). The learner scrolls the
// shared NumberWheel to pick `n`, then STEPS the `range(...)` call as it
// collapses to a concrete list of numbers — substitute n → (compute) → expand.
//
//  - `plusOne: false` (default): the simple form `range(n)` → 0..n-1, used to
//    show that range stops BEFORE n (L6 syntax beat).
//  - `plusOne: true` with `start: 1`: the expression form `range(1, n + 1)` →
//    1..n, used to demonstrate how the `n + 1` expression collapses to a single
//    value before the loop runs (L6 dedicated demo).
export const rangeMachineConfigSchema = z.object({
  // The (literal) start of the range. Shown only when it is not 0.
  start: z.number().int().nonnegative().default(0),
  // When true the stop argument is `n + 1` (expression form); otherwise `n`.
  plusOne: z.boolean().default(false),
  // The wheel shows every integer 0..max.
  max: z.number().int().positive().default(9),
  // The value `n` starts on.
  initial: z.number().int().nonnegative().default(5),
  caption: z.string().optional(),
})

// The LEARNER-DRIVEN decision machine (L5). The learner scrolls a number DIAL
// (the shared NumberWheel) to choose the input value; the widget evaluates the
// `if` / `elif` / ... conditions TOP-TO-BOTTOM and live-highlights the FIRST
// matching branch (or the else, when present), showing the resulting output as
// they scroll. Unlike the read-only program_stepper, the learner drives it.
//
// It generalises the branch_visualizer for three shapes:
//   - 1 condition, no else  (`hasElse: false`)  → `if` only; nothing prints on a miss.
//   - 1 condition + else                         → exactly one path always runs.
//   - N conditions + else                        → if / elif / ... / else.
export const decisionMachineConfigSchema = z.object({
  // The input variable name shown in the program (e.g. `n`).
  variable: z.string().min(1).default('n'),
  // The ordered divisibility branches: `if/elif variable % divisor == 0: print(...)`.
  // The FIRST matching branch wins (the rest are skipped), exactly like Python.
  conditions: z
    .array(
      z.object({
        divisor: z.number().int().positive(),
        // A short, human label for what the branch does, e.g. 'say "multiple of 3"'.
        label: z.string().min(1),
        // The literal text the branch prints, e.g. 'multiple of 3'.
        prints: z.string().min(1),
      }),
    )
    .min(1),
  // Whether the program ends with a final `else`. When false there is NO else,
  // so on a miss nothing prints (the `if`-only shape).
  hasElse: z.boolean().default(true),
  // A short, human label for the else branch; the else itself prints the number.
  elseLabel: z.string().min(1).default('print the number'),
  // The dial shows every integer 0..max; the learner scrolls to choose the input.
  max: z.number().int().positive().default(15),
  // The value the dial starts on.
  initial: z.number().int().nonnegative().default(1),
  caption: z.string().optional(),
})

export type ArticleConfig = z.infer<typeof articleConfigSchema>
export type Panel = z.infer<typeof panelSchema>
export type Activity = z.infer<typeof activitySchema>
export type CheckpointBlock = z.infer<typeof checkpointSchema>
export type RepeatedAdditionConfig = z.infer<typeof repeatedAdditionConfigSchema>
export type LoopVisualizerConfig = z.infer<typeof loopVisualizerConfigSchema>
export type FunctionMachineConfig = z.infer<typeof functionMachineConfigSchema>
export type VariableBoxConfig = z.infer<typeof variableBoxConfigSchema>
export type ValueBoxConfig = z.infer<typeof valueBoxConfigSchema>
export type TypeSorterConfig = z.infer<typeof typeSorterConfigSchema>
export type RemainderMachineConfig = z.infer<typeof remainderMachineConfigSchema>
export type ModuloPickerConfig = z.infer<typeof moduloPickerConfigSchema>
export type MultiplesGridConfig = z.infer<typeof multiplesGridConfigSchema>
export type ComparisonExplorerConfig = z.infer<typeof comparisonExplorerConfigSchema>
export type BranchVisualizerConfig = z.infer<typeof branchVisualizerConfigSchema>
export type CodeTracerConfig = z.infer<typeof codeTracerConfigSchema>
export type ProgramStepperConfig = z.infer<typeof programStepperConfigSchema>
export type ProgramStepperDecisionConfig = z.infer<typeof programStepperDecisionConfigSchema>
export type ProgramStepperLoopConfig = z.infer<typeof programStepperLoopConfigSchema>
export type ProgramStepperTraceConfig = z.infer<typeof programStepperTraceConfigSchema>
export type RangeMachineConfig = z.infer<typeof rangeMachineConfigSchema>
export type DecisionMachineConfig = z.infer<typeof decisionMachineConfigSchema>
