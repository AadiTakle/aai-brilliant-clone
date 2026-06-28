// Server-side structural validation for committed custom lessons. The client
// already runs the full Zod parse + Pyodide self-test before calling
// commitCustomLesson, but the callable is the trust boundary that SPENDS Sparks
// and PERSISTS the lesson, so it must independently re-check the payload. A
// caller hitting the function directly (bypassing the UI) can otherwise pay for
// — and store — a malformed or broken lesson.
//
// This mirrors the structural rules in src/lib/ai/validate.ts. It does NOT run
// the Pyodide self-test (no Python runtime in the function); the strict shape +
// grading/feedback/Parsons-indent checks are the enforceable gate here.

import { MAX_STEPS } from './lessonSpec.js'

// Hard ceiling on the stored JSON so a single commit can't persist an abusive
// payload (matches the spirit of the step cap, in bytes).
export const MAX_LESSON_JSON_BYTES = 200_000

const STEP_TYPES = ['article', 'python_sandbox', 'parsons_problem'] as const

export type LessonValidation = { ok: true } | { ok: false; errors: string[] }

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

function nonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

function validateCheckpoint(stepId: string, panelIndex: number, a: Record<string, unknown>, errors: string[]): void {
  if (!nonEmptyString(a.prompt)) {
    errors.push(`Step "${stepId}" panel ${panelIndex} checkpoint: needs a prompt.`)
  }
  const choices = a.choices
  if (!Array.isArray(choices) || choices.length < 2 || choices.length > 4 || !choices.every((c) => typeof c === 'string')) {
    errors.push(`Step "${stepId}" panel ${panelIndex} checkpoint: needs 2-4 string choices.`)
  }
  if (typeof a.answerIndex !== 'number' || !Number.isInteger(a.answerIndex) || a.answerIndex < 0 || (Array.isArray(choices) && a.answerIndex >= choices.length)) {
    errors.push(`Step "${stepId}" panel ${panelIndex} checkpoint: answerIndex must be a valid choice index.`)
  }
  const feedback = a.feedback
  if (!isPlainObject(feedback) || !nonEmptyString(feedback.correct) || !nonEmptyString(feedback.incorrect)) {
    errors.push(`Step "${stepId}" panel ${panelIndex} checkpoint: feedback needs non-empty "correct" and "incorrect".`)
  }
}

function validateArticle(step: Record<string, unknown>, stepId: string, errors: string[]): void {
  const config = step.config
  if (!isPlainObject(config) || !Array.isArray(config.panels) || config.panels.length < 1) {
    errors.push(`Step "${stepId}": an article needs at least one panel.`)
    return
  }
  config.panels.forEach((panel, panelIndex) => {
    if (!isPlainObject(panel)) {
      errors.push(`Step "${stepId}" panel ${panelIndex}: must be an object.`)
      return
    }
    const hasText = nonEmptyString(panel.text)
    const activity = panel.activity
    if (!hasText && !activity) {
      errors.push(`Step "${stepId}" panel ${panelIndex}: needs text, an activity, or both.`)
      return
    }
    if (!activity) return
    if (!isPlainObject(activity)) {
      errors.push(`Step "${stepId}" panel ${panelIndex}: activity must be an object.`)
      return
    }
    if (activity.kind === 'checkpoint') {
      validateCheckpoint(stepId, panelIndex, activity, errors)
      return
    }
    if (activity.kind === 'widget') {
      if (!nonEmptyString(activity.widget)) {
        errors.push(`Step "${stepId}" panel ${panelIndex} widget: needs a widget name.`)
      }
      if (!isPlainObject(activity.config)) {
        errors.push(`Step "${stepId}" panel ${panelIndex} widget: needs a config object.`)
      }
      return
    }
    errors.push(`Step "${stepId}" panel ${panelIndex}: activity.kind must be "checkpoint" or "widget".`)
  })
}

function validatePython(step: Record<string, unknown>, stepId: string, errors: string[]): void {
  if (step.graded !== true) {
    errors.push(`Step "${stepId}": a Python step must be graded.`)
  }
  const config = step.config
  if (!isPlainObject(config)) {
    errors.push(`Step "${stepId}": missing config.`)
    return
  }
  if (!nonEmptyString(config.prompt)) {
    errors.push(`Step "${stepId}": a Python step needs a prompt.`)
  }
  const testCases = config.testCases
  if (!Array.isArray(testCases) || testCases.length < 1) {
    errors.push(`Step "${stepId}": a graded Python step needs at least one test case.`)
    return
  }
  testCases.forEach((tc, caseIndex) => {
    if (!isPlainObject(tc)) {
      errors.push(`Step "${stepId}" test case ${caseIndex}: must be an object.`)
      return
    }
    if (typeof tc.expectedStdout !== 'string') {
      errors.push(`Step "${stepId}" test case ${caseIndex}: needs an expectedStdout string.`)
    }
    if (!nonEmptyString(tc.feedback)) {
      errors.push(`Step "${stepId}" test case ${caseIndex}: needs a failure hint (feedback).`)
    }
  })
}

/** Reconstructs the Python source a Parsons solution describes (order + indent). */
function parsonsSolutionSource(lines: { code: string; indent: number }[]): string {
  return lines.map((l) => '    '.repeat(l.indent) + l.code.trim()).join('\n')
}

function validateParsonsStructure(stepId: string, lines: { code: string; indent: number }[], errors: string[]): void {
  if (lines.length === 0) return
  if (lines[0].indent !== 0) {
    errors.push(`Step "${stepId}": Parsons first line must have indent 0.`)
  }
  for (let i = 0; i < lines.length; i++) {
    const { code, indent } = lines[i]
    if (code !== code.trim()) {
      errors.push(`Step "${stepId}" Parsons line ${i}: "code" must not contain leading/trailing spaces.`)
    }
    if (i === 0) continue
    const prev = lines[i - 1]
    const trimmed = code.trim()
    const prevOpensBlock = prev.code.trimEnd().endsWith(':')
    const isBranch = /^(elif|else|except|finally)\b/.test(trimmed)
    if (prevOpensBlock) {
      if (isBranch) {
        if (indent !== prev.indent) {
          errors.push(`Step "${stepId}" Parsons line ${i}: must align with the block above (indent ${prev.indent}).`)
        }
      } else if (indent !== prev.indent + 1) {
        errors.push(`Step "${stepId}" Parsons line ${i}: must be indent ${prev.indent + 1} inside the block above.`)
      }
    } else if (indent > prev.indent) {
      errors.push(`Step "${stepId}" Parsons line ${i}: indent ${indent} is too deep — the previous line does not open a block.`)
    }
  }
}

function validateParsons(step: Record<string, unknown>, stepId: string, errors: string[]): void {
  if (step.graded !== true) {
    errors.push(`Step "${stepId}": a Parsons problem must be graded.`)
  }
  const config = step.config
  if (!isPlainObject(config)) {
    errors.push(`Step "${stepId}": missing config.`)
    return
  }
  if (!nonEmptyString(config.prompt)) {
    errors.push(`Step "${stepId}": a Parsons problem needs a prompt.`)
  }
  if (!nonEmptyString(config.orderHint)) {
    errors.push(`Step "${stepId}": a Parsons problem needs an orderHint.`)
  }
  const lines = config.lines
  if (!Array.isArray(lines) || lines.length < 2) {
    errors.push(`Step "${stepId}": a Parsons problem needs at least two lines.`)
    return
  }
  const typed: { code: string; indent: number }[] = []
  let shapeOk = true
  for (const line of lines) {
    if (!isPlainObject(line) || !nonEmptyString(line.id) || typeof line.code !== 'string' || typeof line.indent !== 'number' || !Number.isInteger(line.indent) || line.indent < 0) {
      errors.push(`Step "${stepId}": every Parsons line needs id, code, and a non-negative integer indent.`)
      shapeOk = false
      break
    }
    typed.push({ code: line.code, indent: line.indent })
  }
  if (!shapeOk) return
  const checkIndent = config.checkIndent !== false
  if (checkIndent && !nonEmptyString(config.indentHint)) {
    errors.push(`Step "${stepId}": a Parsons problem that grades indentation needs an indentHint.`)
  }
  if (/\binput\s*\(/.test(parsonsSolutionSource(typed))) {
    errors.push(`Step "${stepId}": Parsons solution must not use input() — use literal values.`)
  }
  validateParsonsStructure(stepId, typed, errors)
}

/**
 * Defensively removes any `referenceSolution` from python_sandbox configs before
 * a lesson is persisted. The client already strips it (it is transport-only
 * ground truth, not part of the saved lesson schema), but a caller hitting
 * commitCustomLesson directly must NOT be able to store — and thereby serve to
 * learners — the model's answer. Returns a new object; never mutates the input.
 */
export function stripReferenceSolutions(lesson: unknown): unknown {
  if (!isPlainObject(lesson) || !Array.isArray(lesson.steps)) return lesson
  return {
    ...lesson,
    steps: lesson.steps.map((step) => {
      if (!isPlainObject(step) || step.type !== 'python_sandbox' || !isPlainObject(step.config)) {
        return step
      }
      const config = { ...step.config }
      delete config.referenceSolution
      return { ...step, config }
    }),
  }
}

/**
 * Structural validation of a parsed lesson object. Returns ok:false with a list
 * of human-readable errors. Mirrors the gradable/feedback/indent rules enforced
 * client-side so the callable never charges for an unplayable lesson.
 */
export function validateLessonStructure(lesson: unknown): LessonValidation {
  const errors: string[] = []
  if (!isPlainObject(lesson)) {
    return { ok: false, errors: ['Lesson must be an object.'] }
  }
  if (!nonEmptyString(lesson.title)) {
    errors.push('Lesson is missing a title.')
  }
  const steps = lesson.steps
  if (!Array.isArray(steps) || steps.length < 1) {
    return { ok: false, errors: [...errors, 'Lesson must have at least one step.'] }
  }
  if (steps.length > MAX_STEPS) {
    errors.push(`Lessons must have 1-${MAX_STEPS} steps (got ${steps.length}).`)
  }

  const ids: string[] = []
  steps.forEach((step, index) => {
    if (!isPlainObject(step)) {
      errors.push(`Step ${index}: must be an object.`)
      return
    }
    const stepId = nonEmptyString(step.id) ? step.id : `#${index}`
    if (!nonEmptyString(step.id)) {
      errors.push(`Step ${index}: needs an id.`)
    } else {
      ids.push(step.id)
    }
    if (typeof step.type !== 'string' || !STEP_TYPES.includes(step.type as (typeof STEP_TYPES)[number])) {
      errors.push(`Step "${stepId}": type must be one of ${STEP_TYPES.join(', ')}.`)
      return
    }
    if (step.type === 'article') validateArticle(step, stepId, errors)
    if (step.type === 'python_sandbox') validatePython(step, stepId, errors)
    if (step.type === 'parsons_problem') validateParsons(step, stepId, errors)
  })

  if (new Set(ids).size !== ids.length) {
    errors.push('Every step needs a unique id.')
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true }
}
