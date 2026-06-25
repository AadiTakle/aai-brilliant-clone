import { describe, it, expect } from 'vitest'
import { getLesson, listLessons } from '../../src/content/loader'
import type { Lesson, Step } from '../../src/content/schemas'
import { gradePython } from '../../src/lib/grading/pythonGrader'
import {
  functionMachineConfigSchema,
  programStepperConfigSchema,
} from '../../src/problem-types/article/schema'
import type { PythonRunner } from '../../src/lib/pyodide/runner'

const constRunner = (stdout: string): PythonRunner => async () => ({ stdout, error: null })

function l8(): Lesson {
  const lesson = getLesson('l8-build-your-own-machine')
  if (!lesson) throw new Error('missing lesson: l8-build-your-own-machine')
  return lesson
}

function stepById(id: string): Step {
  const step = l8().steps.find((s) => s.id === id)
  if (!step) throw new Error(`missing step: ${id}`)
  return step
}

function widgetActivities(step: Step) {
  if (step.type !== 'article') return []
  return step.config.panels.flatMap((p) => (p.activity?.kind === 'widget' ? [p.activity] : []))
}

function checkpointActivities(step: Step) {
  if (step.type !== 'article') return []
  return step.config.panels.flatMap((p) => (p.activity?.kind === 'checkpoint' ? [p.activity] : []))
}

function widgetsOf(step: Step): string[] {
  return widgetActivities(step).map((a) => a.widget)
}

function articleText(step: Step): string {
  if (step.type !== 'article') return ''
  return step.config.panels.map((p) => p.text ?? '').join('\n')
}

// The single number the Beat-4 reference solution prints (triple(4)).
const TRIPLE_OUTPUT = '12'
// The value the pass-in / return-back traces build (double(5)).
const DOUBLE_OUTPUT = '10'

describe('[L8] Build Your Own Machine — structure + ordering', () => {
  it('keeps the lesson id and its 8th-place registration order', () => {
    expect(l8().id).toBe('l8-build-your-own-machine')
    expect(listLessons().map((l) => l.id)[7]).toBe('l8-build-your-own-machine')
  })

  it('walks intro(8.1) → define → pass-in → return-back → write+use (four 8.2 beats)', () => {
    expect(l8().steps.map((s) => s.id)).toEqual([
      'intro',
      'define-a-function',
      'pass-in',
      'return-back',
      'write-your-machine',
    ])
  })

  it('still teaches def/return in its typed Python source (coverage contract)', () => {
    const src = l8()
      .steps.filter((s): s is Extract<Step, { type: 'python_sandbox' }> => s.type === 'python_sandbox')
      .map((s) => s.config.starterCode + '\n' + s.config.testCases.map((t) => t.expectedStdout).join('\n'))
      .join('\n')
    expect(src).toContain('def ')
    expect(src).toContain('return')
  })
})

describe('[L8] 8.1 — the 1.1-style animated machine, no def name-drop', () => {
  it('uses the function_machine widget in the editable/echo (L1.1) interface', () => {
    const step = stepById('intro')
    expect(step.type).toBe('article')
    expect(widgetsOf(step)).toContain('function_machine')
    const widget = widgetActivities(step).find((a) => a.widget === 'function_machine')!
    const cfg = functionMachineConfigSchema.parse(widget.config)
    // The "new" interface from 1.1 is the editable, learner-fed, echoing machine.
    expect(cfg.editable).toBe(true)
    expect(cfg.echoInput).toBe(true)
  })

  it('does NOT name-drop the def keyword before it is actually used', () => {
    const step = stepById('intro')
    // The word "define" is fine; the keyword `def` must not appear yet.
    expect(articleText(step).toLowerCase()).not.toMatch(/\bdef\b/)
    // No checkpoint in 8.1 quizzes the def keyword either.
    for (const c of checkpointActivities(step)) {
      expect(c.prompt.toLowerCase()).not.toMatch(/\bdef\b/)
      for (const choice of c.choices) expect(choice.toLowerCase()).not.toMatch(/\bdef\b/)
    }
  })

  it('frames the idea as building our own input→output machine', () => {
    const step = stepById('intro')
    expect(articleText(step).toLowerCase()).toMatch(/input/)
    expect(articleText(step).toLowerCase()).toMatch(/output/)
  })
})

describe('[L8] 8.2 Beat 1 — DEFINE: def NAME(param)', () => {
  it('introduces the def keyword and the parameter, with an active identify task', () => {
    const step = stepById('define-a-function')
    expect(step.type).toBe('article')
    const text = articleText(step).toLowerCase()
    expect(text).toMatch(/\bdef\b/)
    // The body can USE the parameter as an input variable — say so.
    expect(text).toMatch(/parameter|input/)
    // Active: at least one checkpoint that has the learner identify a part.
    const checks = checkpointActivities(step)
    expect(checks.length).toBeGreaterThan(0)
    const idChecks = checks.filter((c) => /def\s+\w+\(/.test(c.prompt))
    expect(idChecks.length).toBeGreaterThan(0)
  })
})

describe('[L8] 8.2 Beat 2 — PASS IN: the call hands a value to the parameter', () => {
  it('steps INTO a function call via program_stepper, binding the argument to the parameter', () => {
    const step = stepById('pass-in')
    expect(step.type).toBe('article')
    expect(widgetsOf(step)).toContain('program_stepper')
    const widget = widgetActivities(step).find((a) => a.widget === 'program_stepper')!
    const cfg = programStepperConfigSchema.parse(widget.config)
    expect(cfg.mode).toBe('trace')
    if (cfg.mode !== 'trace') return
    const code = cfg.code.join('\n')
    // The traced program both defines a function and calls it.
    expect(code).toMatch(/def\s+\w+\(\w+\):/)
    expect(code).toMatch(/\w+\(\d+\)/)
    // Every step carries commentary.
    expect(cfg.steps.every((s) => s.commentary.trim().length > 0)).toBe(true)
    // A step jumps UP to the def line (line 0) AFTER the call line, and its
    // commentary explains the passed-in value becoming the parameter.
    const callLineIdx = cfg.code.findIndex((l) => /^\w+\s*=?\s*\w*\(\d+\)/.test(l) || /\w+\(\d+\)/.test(l))
    const jumpStepIdx = cfg.steps.findIndex((s) => s.line === 0)
    expect(jumpStepIdx).toBeGreaterThan(0)
    const jump = cfg.steps[jumpStepIdx]
    expect((jump.vars ?? {}).n).toBe(5)
    expect(jump.commentary.toLowerCase()).toMatch(/parameter|becomes|passed/)
    expect(callLineIdx).toBeGreaterThanOrEqual(0)
  })

  it('has an active predict checkpoint about what the parameter holds', () => {
    const step = stepById('pass-in')
    expect(checkpointActivities(step).length).toBeGreaterThan(0)
  })
})

describe('[L8] 8.2 Beat 3 — RETURN BACK: return hands a value to the caller, who uses it', () => {
  it('shows return jumping back to the call site and the value being used (printed)', () => {
    const step = stepById('return-back')
    expect(step.type).toBe('article')
    const widget = widgetActivities(step).find((a) => a.widget === 'program_stepper')!
    const cfg = programStepperConfigSchema.parse(widget.config)
    expect(cfg.mode).toBe('trace')
    if (cfg.mode !== 'trace') return
    const code = cfg.code.join('\n')
    expect(code).toMatch(/\breturn\b/)
    expect(code).toMatch(/print\(/)
    // The "jump back" is visible: the step on the return line is FOLLOWED by a
    // step that highlights the CALL line (execution leaves the function body and
    // lands back at the caller, instead of falling through to the next line).
    const returnLineIdx = cfg.code.findIndex((l) => /\breturn\b/.test(l))
    expect(returnLineIdx).toBeGreaterThanOrEqual(0)
    const callLineIdx = cfg.code.findIndex((l) => /\w+\(\d+\)/.test(l))
    expect(callLineIdx).toBeGreaterThanOrEqual(0)
    const returnStepIdx = cfg.steps.findIndex((s) => s.line === returnLineIdx)
    expect(returnStepIdx).toBeGreaterThanOrEqual(0)
    const next = cfg.steps[returnStepIdx + 1]
    expect(next).toBeDefined()
    expect(next.line).toBe(callLineIdx)
    expect(next.line).not.toBe(returnLineIdx + 1)
    // Commentary names the jump back.
    expect(cfg.steps[returnStepIdx].commentary.toLowerCase()).toMatch(/back|return/)
    // The returned value is ultimately printed (used by the caller).
    const printed = cfg.steps.map((s) => s.output).filter(Boolean).join('')
    expect(printed).toContain(DOUBLE_OUTPUT)
  })

  it('has an active predict checkpoint about where execution goes after return', () => {
    const step = stepById('return-back')
    const checks = checkpointActivities(step)
    expect(checks.length).toBeGreaterThan(0)
    expect(checks.some((c) => /return/i.test(c.prompt))).toBe(true)
  })
})

describe('[L8] 8.2 Beat 4 — WRITE + USE your own machine', () => {
  it('is a graded python_sandbox where the learner writes a function AND calls/uses it', () => {
    const step = stepById('write-your-machine')
    expect(step.type).toBe('python_sandbox')
    if (step.type !== 'python_sandbox') return
    expect(step.graded).toBe(true)
    expect(step.config.testCases[0].expectedStdout).toBe(TRIPLE_OUTPUT)
    // The scaffold names def + return so the learner builds (not just reads), but
    // never contains the finished body or the call (they must write those).
    expect(step.config.starterCode).toContain('def ')
    expect(step.config.starterCode.toLowerCase()).toContain('return')
    expect(step.config.starterCode).not.toMatch(/return\s+n\s*\*\s*3/)
    expect(step.config.starterCode).not.toMatch(/triple\(\s*\d/)
    expect(step.config.successMessage && step.config.successMessage.length > 0).toBe(true)
  })

  it('gives an answer-free, failure-specific hint covering print-vs-return, indentation, and forgetting to call', () => {
    const step = stepById('write-your-machine')
    if (step.type !== 'python_sandbox') throw new Error('not python')
    const feedback = (step.config.testCases[0].feedback ?? '').toLowerCase()
    expect(feedback).toMatch(/return/)
    expect(feedback).toMatch(/print/)
    expect(feedback).toMatch(/indent/)
    expect(feedback).toMatch(/call/)
    // GLOBAL RULE: it never reveals the answer (the expression or the number).
    expect(feedback).not.toContain(TRIPLE_OUTPUT)
    expect(feedback).not.toMatch(/n\s*\*\s*3/)
  })

  it('blank fails, and a real function that is defined, returns, and is called passes', async () => {
    const step = stepById('write-your-machine')
    if (step.type !== 'python_sandbox') throw new Error('not python')

    const blank = await gradePython('', step.config.testCases, constRunner(''))
    expect(blank.passed).toBe(false)

    const ref = 'def triple(n):\n    return n * 3\n\nprint(triple(4))'
    const ok = await gradePython(ref, step.config.testCases, constRunner(TRIPLE_OUTPUT))
    expect(ok.passed).toBe(true)
  })
})

describe('[L8] global no-answer rule', () => {
  it('no checkpoint incorrect feedback reveals the correct choice', () => {
    for (const step of l8().steps) {
      for (const c of checkpointActivities(step)) {
        const correct = c.choices[c.answerIndex].toLowerCase()
        const incorrect = (c.feedback?.incorrect ?? '').toLowerCase()
        // Single-character answers (e.g. a digit) make a substring check
        // meaningless; only enforce it for real phrases.
        if (incorrect && correct.length >= 3) expect(incorrect).not.toContain(correct)
      }
    }
  })
})
