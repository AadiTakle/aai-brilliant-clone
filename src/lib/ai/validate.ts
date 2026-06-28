// The trust gate for AI-generated lessons. NOTHING the model emits is rendered
// or saved until it passes BOTH:
//   1. validateGeneratedLesson — strict Zod parse (the same `lessonSchema` the
//      whole app uses) plus structural rules (step cap, unique ids, graded steps
//      actually have something to grade).
//   2. selfTestLesson — a runtime check (Pyodide) that the lesson's GROUND TRUTH
//      actually works: every python_sandbox's model-provided referenceSolution
//      passes that step's OWN test cases AND constraints, every Parsons solution
//      runs cleanly, and every runnable function_machine script executes.
//
// The referenceSolution is transport-only: it is captured from the raw model
// output (extractReferenceSolutions) BEFORE the strict parse drops it, self-tested
// here, and never persisted or shown to the learner — mirroring the mastery Apply
// path (acceptApply.ts), where the solution lives on the generated payload but not
// on the saved question. This is what gives every generated sandbox clear ground
// truth: a step whose expected output is wrong or unsolvable fails the self-test
// and is sent back through the repair/regenerate loop.

import { z } from 'zod'
import { lessonSchema, type Lesson } from '../../content/schemas'
import {
  branchVisualizerConfigSchema,
  codeTracerConfigSchema,
  comparisonExplorerConfigSchema,
  decisionMachineConfigSchema,
  functionMachineConfigSchema,
  loopVisualizerConfigSchema,
  moduloPickerConfigSchema,
  multiplesGridConfigSchema,
  programStepperConfigSchema,
  rangeMachineConfigSchema,
  remainderMachineConfigSchema,
  repeatedAdditionConfigSchema,
  typeSorterConfigSchema,
  valueBoxConfigSchema,
  variableBoxConfigSchema,
} from '../../problem-types/article/schema'
import { buildFunctionMachineSource } from '../../problem-types/article/widgets/functionMachineSource'
import { MAX_CUSTOM_LESSON_STEPS } from './cost'
import { runPython, type PythonRunner } from '../pyodide/runner'
import { gradePython, type PythonGradeResult } from '../grading/pythonGrader'

export type ValidationResult = { ok: true; lesson: Lesson } | { ok: false; errors: string[] }

// The lesson-level schema parses a widget's `config` loosely (a plain record);
// each widget component re-parses it with its own STRICT schema at render time
// and would throw on a bad config. Re-parse here with the same strict schemas so
// a malformed widget config is rejected BEFORE Sparks are spent / the lesson is
// saved, rather than crashing when it's played. Keyed by the widget enum in
// article/schema.ts; any widget without an entry is left to its component.
const WIDGET_CONFIG_SCHEMAS: Record<string, z.ZodTypeAny> = {
  repeated_addition: repeatedAdditionConfigSchema,
  loop_visualizer: loopVisualizerConfigSchema,
  function_machine: functionMachineConfigSchema,
  variable_box: variableBoxConfigSchema,
  value_box: valueBoxConfigSchema,
  type_sorter: typeSorterConfigSchema,
  remainder_machine: remainderMachineConfigSchema,
  modulo_picker: moduloPickerConfigSchema,
  multiples_grid: multiplesGridConfigSchema,
  comparison_explorer: comparisonExplorerConfigSchema,
  branch_visualizer: branchVisualizerConfigSchema,
  code_tracer: codeTracerConfigSchema,
  program_stepper: programStepperConfigSchema,
  range_machine: rangeMachineConfigSchema,
  decision_machine: decisionMachineConfigSchema,
}

/**
 * Recursively drops object properties whose value is `null`. LLMs routinely emit
 * `"field": null` for optional fields they chose not to fill (e.g. an article
 * panel's `activity`), but the schema marks those `.optional()` (accepts missing/
 * `undefined`), not nullable. Stripping nulls makes "model set it to null" behave
 * the same as "model omitted it". Array elements are preserved (only object
 * properties are removed) so indices never shift.
 */
function stripNullsDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripNullsDeep)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === null) continue
      out[k] = stripNullsDeep(v)
    }
    return out
  }
  return value
}

/** Coerce LLM output to a string (numbers, booleans, or small objects with value/input). */
function coerceToString(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>
    if ('value' in o) return coerceToString(o.value)
    if ('input' in o) return coerceToString(o.input)
    if ('text' in o) return coerceToString(o.text)
  }
  return String(value)
}

function normalizeWidgetConfig(widget: string, config: unknown): unknown {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return config
  const c = { ...(config as Record<string, unknown>) }
  if (widget === 'function_machine' && Array.isArray(c.cases)) {
    c.cases = (c.cases as Record<string, unknown>[]).map((item) => ({
      ...item,
      input: coerceToString(item.input),
      ...(item.output !== undefined ? { output: coerceToString(item.output) } : {}),
    }))
  }
  return c
}

function normalizeActivity(activity: unknown): unknown {
  if (!activity || typeof activity !== 'object' || Array.isArray(activity)) return activity
  const a = activity as Record<string, unknown>
  if (a.kind !== 'widget' || typeof a.widget !== 'string') return activity
  return { ...a, config: normalizeWidgetConfig(a.widget, a.config) }
}

function normalizePanel(panel: unknown): unknown {
  if (!panel || typeof panel !== 'object' || Array.isArray(panel)) return panel
  const p = panel as Record<string, unknown>
  if (!p.activity) return panel
  return { ...p, activity: normalizeActivity(p.activity) }
}

function normalizeStep(step: unknown): unknown {
  if (!step || typeof step !== 'object' || Array.isArray(step)) return step
  const s = { ...(step as Record<string, unknown>) }
  if (s.type === 'article' && s.config && typeof s.config === 'object') {
    const config = s.config as Record<string, unknown>
    if (Array.isArray(config.panels)) {
      s.config = { ...config, panels: config.panels.map(normalizePanel) }
    }
  }
  if (s.type === 'parsons_problem' && s.config && typeof s.config === 'object') {
    const config = s.config as Record<string, unknown>
    const trimLine = (line: unknown) => {
      if (!line || typeof line !== 'object' || Array.isArray(line)) return line
      const l = line as Record<string, unknown>
      return typeof l.code === 'string' ? { ...l, code: l.code.trim() } : l
    }
    s.config = {
      ...config,
      ...(Array.isArray(config.lines) ? { lines: config.lines.map(trimLine) } : {}),
      ...(Array.isArray(config.distractors) ? { distractors: config.distractors.map(trimLine) } : {}),
    }
  }
  return s
}

/**
 * Fix common LLM shape mistakes before strict Zod parsing (e.g. numbers/objects
 * where a widget expects strings). Does not invent missing required fields.
 */
export function normalizeGeneratedLesson(raw: unknown): unknown {
  const cleaned = stripNullsDeep(raw)
  if (!cleaned || typeof cleaned !== 'object' || Array.isArray(cleaned)) return cleaned
  const lesson = { ...(cleaned as Record<string, unknown>) }
  if (Array.isArray(lesson.steps)) {
    lesson.steps = lesson.steps.map(normalizeStep)
  }
  return lesson
}

/**
 * Pulls each python_sandbox's `referenceSolution` (the model's GROUND TRUTH
 * answer) out of the RAW generated lesson, keyed by step id. This MUST run before
 * validateGeneratedLesson: the strict parse drops referenceSolution because it is
 * deliberately NOT part of the persisted lesson schema (the same way the mastery
 * path keeps the solution off the saved MasteryApplyQuestion). selfTestLesson then
 * executes each one to prove the step is solvable and its expected output is real.
 */
export function extractReferenceSolutions(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out
  const steps = (raw as { steps?: unknown }).steps
  if (!Array.isArray(steps)) return out
  for (const step of steps) {
    if (!step || typeof step !== 'object' || Array.isArray(step)) continue
    const s = step as Record<string, unknown>
    if (s.type !== 'python_sandbox' || typeof s.id !== 'string') continue
    const config = s.config
    if (!config || typeof config !== 'object' || Array.isArray(config)) continue
    const ref = (config as Record<string, unknown>).referenceSolution
    if (typeof ref === 'string') out[s.id] = ref
  }
  return out
}

/** True when validation/self-test failures look like widget or checkpoint formatting issues. */
export function isWidgetRelatedErrors(errors: string[]): boolean {
  return errors.some((e) =>
    /widget|function_machine|checkpoint.*feedback|cases\.\d+\.(input|output)|panel \d+ widget|Parsons (line|first line|solution)|IndentationError/i.test(
      e,
    ),
  )
}

export function validateGeneratedLesson(raw: unknown): ValidationResult {
  // Normalize model quirks before the strict parse: (1) drop null-valued optional
  // fields, (2) coerce common widget type mismatches, (3) supply a placeholder
  // top-level `id` — the canonical id is the Firestore doc id assigned at save time.
  const normalized = normalizeGeneratedLesson(raw)
  const candidate =
    normalized &&
    typeof normalized === 'object' &&
    !Array.isArray(normalized) &&
    (normalized as { id?: unknown }).id == null
      ? { ...(normalized as Record<string, unknown>), id: 'pending' }
      : normalized
  const parsed = lessonSchema.safeParse(candidate)
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`),
    }
  }

  const lesson = parsed.data
  const errors: string[] = []

  if (lesson.steps.length > MAX_CUSTOM_LESSON_STEPS) {
    errors.push(`Lesson has ${lesson.steps.length} steps; the limit is ${MAX_CUSTOM_LESSON_STEPS}.`)
  }

  const ids = lesson.steps.map((s) => s.id)
  if (new Set(ids).size !== ids.length) {
    errors.push('Every step needs a unique id.')
  }

  for (const step of lesson.steps) {
    // Every step that CAN be graded must be graded, carry real pass/fail criteria,
    // and provide an answer-free hint for when the learner gets it wrong.
    if (step.type === 'python_sandbox') {
      if (!step.graded) {
        errors.push(`Step "${step.id}": a Python step must be graded.`)
      }
      if (step.config.testCases.length === 0) {
        errors.push(`Step "${step.id}": a graded Python step needs at least one test case.`)
      }
      step.config.testCases.forEach((tc, caseIndex) => {
        if (!tc.feedback || tc.feedback.trim().length === 0) {
          errors.push(`Step "${step.id}" test case ${caseIndex}: needs a failure hint (feedback).`)
        }
      })
    }
    if (step.type === 'parsons_problem') {
      if (!step.graded) {
        errors.push(`Step "${step.id}": a Parsons problem must be graded.`)
      }
      if (!step.config.orderHint || step.config.orderHint.trim().length === 0) {
        errors.push(`Step "${step.id}": a Parsons problem needs an orderHint (failure hint).`)
      }
      if (step.config.checkIndent && (!step.config.indentHint || step.config.indentHint.trim().length === 0)) {
        errors.push(
          `Step "${step.id}": a Parsons problem that grades indentation needs an indentHint.`,
        )
      }
      const parsonsSource = parsonsSolutionSource(step.config.lines)
      if (/\binput\s*\(/.test(parsonsSource)) {
        errors.push(
          `Step "${step.id}": Parsons solution must not use input() — use literal values the learner can see.`,
        )
      }
      errors.push(...validateParsonsStructure(step.id, step.config.lines))
    }
    if (
      step.type === 'block_problem' &&
      step.graded &&
      step.config.mode !== 'sandbox' &&
      !step.config.expectedOutput
    ) {
      errors.push(`Step "${step.id}": a graded block step needs an expected output.`)
    }
    if (step.type === 'article') {
      step.config.panels.forEach((panel, panelIndex) => {
        const activity = panel.activity
        if (!activity) return
        // A checkpoint is a gradable question — it needs both a correct and an
        // incorrect message, matching the built-in lessons.
        if (activity.kind === 'checkpoint') {
          if (!activity.feedback?.incorrect?.trim()) {
            errors.push(
              `Step "${step.id}" panel ${panelIndex} checkpoint: needs incorrect-answer feedback.`,
            )
          }
          if (!activity.feedback?.correct?.trim()) {
            errors.push(
              `Step "${step.id}" panel ${panelIndex} checkpoint: needs correct-answer feedback.`,
            )
          }
          return
        }
        // Strict per-widget config check: catch a malformed widget config (which
        // the loose lesson-level parse lets through) before it can crash at play
        // time.
        const widgetSchema = WIDGET_CONFIG_SCHEMAS[activity.widget]
        if (!widgetSchema) return
        const result = widgetSchema.safeParse(activity.config)
        if (!result.success) {
          const detail = result.error.issues
            .map((i) => `${i.path.join('.') || '(config)'}: ${i.message}`)
            .join('; ')
          errors.push(
            `Step "${step.id}" panel ${panelIndex} widget "${activity.widget}": ${detail}`,
          )
        }
      })
    }
  }

  if (errors.length > 0) return { ok: false, errors }
  return { ok: true, lesson }
}

export interface SelfTestResult {
  ok: boolean
  failures: { stepId: string; reason: string }[]
}

/** Reconstructs the Python source a Parsons solution describes (order + indent). */
export function parsonsSolutionSource(lines: { code: string; indent: number }[]): string {
  return lines.map((l) => '    '.repeat(l.indent) + l.code.trim()).join('\n')
}

/**
 * Static Parsons checks that catch bad indentation BEFORE running Pyodide.
 * The indent field is the ONLY source of indentation — never put spaces in code.
 */
export function validateParsonsStructure(
  stepId: string,
  lines: { code: string; indent: number }[],
): string[] {
  const errors: string[] = []
  if (lines.length === 0) return errors

  if (lines[0].indent !== 0) {
    errors.push(
      `Step "${stepId}": Parsons first line must have "indent": 0 (got ${lines[0].indent}). Top-level code starts at the left margin.`,
    )
  }

  for (let i = 0; i < lines.length; i++) {
    const { code, indent } = lines[i]
    const trimmed = code.trim()
    if (code !== trimmed) {
      errors.push(
        `Step "${stepId}" Parsons line ${i}: "code" must not contain leading/trailing spaces — put indentation ONLY in the "indent" field.`,
      )
    }

    if (i === 0) continue
    const prev = lines[i - 1]
    const prevOpensBlock = prev.code.trimEnd().endsWith(':')
    const isBranch = /^(elif|else|except|finally)\b/.test(trimmed)

    if (prevOpensBlock) {
      if (isBranch) {
        if (indent !== prev.indent) {
          errors.push(
            `Step "${stepId}" Parsons line ${i} ("${code}"): must have "indent": ${prev.indent} to align with the block above.`,
          )
        }
      } else if (indent !== prev.indent + 1) {
        errors.push(
          `Step "${stepId}" Parsons line ${i} ("${code}"): must have "indent": ${prev.indent + 1} to run inside "${prev.code.trim()}".`,
        )
      }
    } else if (indent > prev.indent) {
      errors.push(
        `Step "${stepId}" Parsons line ${i} ("${code}"): indent ${indent} is too deep — the previous line "${prev.code}" does not open a block. Use indent ${prev.indent}.`,
      )
    }
  }

  return errors
}

/** Human-readable reason a sandbox's reference solution failed its own checks.
 * Worded to avoid the tokens isWidgetRelatedErrors keys off, so a ground-truth
 * failure routes to a normal repair pass rather than a widget-mode reset. */
function describeSandboxFailure(grade: PythonGradeResult): string {
  if (grade.missingConstructs.length > 0) {
    return `reference solution does not use required construct(s): ${grade.missingConstructs.join(', ')}`
  }
  if (grade.disallowedUsed.length > 0) {
    return `reference solution uses disallowed name(s): ${grade.disallowedUsed.join(', ')}`
  }
  if (grade.requiredMissing.length > 0) {
    return `reference solution is missing required name(s): ${grade.requiredMissing.join(', ')}`
  }
  if (grade.hardcodedOutput) {
    return 'reference solution prints the expected output as a literal instead of computing it'
  }
  const failedIndex = grade.results.findIndex((r) => !r.passed)
  const r = grade.results[failedIndex]
  const detail = r
    ? r.error
      ? `it errored: ${r.error}`
      : `expected ${JSON.stringify(r.expected)} but printed ${JSON.stringify(r.actual)}`
    : ''
  return `reference solution does not pass its own test case ${failedIndex + 1}${detail ? ` (${detail})` : ''}`
}

/**
 * Runtime ground-truth check. For every python_sandbox, the model's
 * referenceSolution must actually pass that step's OWN test cases and obey every
 * constraint it imposed (constructs, required/disallowed names, no hardcoding) —
 * this is what proves a generated sandbox is solvable and its expectedStdout is
 * real. Parsons solutions and runnable function_machine scripts are executed too.
 * A missing/empty referenceSolution is a failure (every sandbox needs ground
 * truth). Failures flow back into the generator's repair/regenerate loop.
 */
export async function selfTestLesson(
  lesson: Lesson,
  runner: PythonRunner = runPython,
  referenceSolutions: Record<string, string> = {},
): Promise<SelfTestResult> {
  const failures: { stepId: string; reason: string }[] = []
  for (const step of lesson.steps) {
    if (step.type === 'parsons_problem') {
      const source = parsonsSolutionSource(step.config.lines)
      const { error } = await runner(source)
      if (error) {
        failures.push({ stepId: step.id, reason: `Parsons solution does not run cleanly: ${error}` })
      }
    }
    // GROUND TRUTH: run the model's referenceSolution against the step's own test
    // cases + constraints. Mirrors the mastery Apply self-test (acceptApply.ts).
    if (step.type === 'python_sandbox') {
      const ref = referenceSolutions[step.id]
      if (!ref || !ref.trim()) {
        failures.push({
          stepId: step.id,
          reason: 'missing reference solution — cannot prove this step has correct ground truth',
        })
      } else {
        const grade = await gradePython(ref, step.config.testCases, runner, {
          requireLoop: step.config.requireLoop,
          requiredConstructs: step.config.requiredConstructs,
          disallowedNames: step.config.disallowedNames,
          requiredNames: step.config.requiredNames,
          forbidHardcodedOutput: step.config.forbidHardcodedOutput,
          lenient: step.config.lenient,
        })
        if (!grade.passed) {
          failures.push({ stepId: step.id, reason: describeSandboxFailure(grade) })
        }
      }
    }
    // A runnable function_machine (one with `code`) actually executes its script
    // when played, so prove the authored script + seed input runs cleanly here.
    if (step.type === 'article') {
      for (const panel of step.config.panels) {
        const activity = panel.activity
        if (!activity || activity.kind !== 'widget' || activity.widget !== 'function_machine') continue
        const parsed = functionMachineConfigSchema.safeParse(activity.config)
        if (!parsed.success) continue // shape errors are reported by validateGeneratedLesson
        const { fnName, code, cases, quoted } = parsed.data
        if (!code || !code.trim()) continue
        const seed = cases[0]?.input ?? ''
        const { error } = await runner(buildFunctionMachineSource(fnName, code, seed, quoted))
        if (error) {
          failures.push({
            stepId: step.id,
            reason: `function_machine "${fnName}" script does not run cleanly: ${error}`,
          })
        }
      }
    }
  }
  return { ok: failures.length === 0, failures }
}
