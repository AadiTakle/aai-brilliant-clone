import { describe, it, expect } from 'vitest'
import { getLesson, listLessons } from '../../src/content/loader'
import type { Lesson, Step } from '../../src/content/schemas'
import { gradePython } from '../../src/lib/grading/pythonGrader'
import { gradeParsons } from '../../src/lib/grading/parsonsGrader'
import type { PythonRunner } from '../../src/lib/pyodide/runner'

const constRunner = (stdout: string): PythonRunner => async () => ({ stdout, error: null })

function l5(): Lesson {
  const lesson = getLesson('l5-making-decisions')
  if (!lesson) throw new Error('missing lesson: l5-making-decisions')
  return lesson
}

function stepById(id: string): Step {
  const step = l5().steps.find((s) => s.id === id)
  if (!step) throw new Error(`missing step: ${id}`)
  return step
}

function widgetsOf(step: Step): string[] {
  if (step.type !== 'article') return []
  return step.config.panels.flatMap((p) => (p.activity?.kind === 'widget' ? [p.activity.widget] : []))
}

function widgetConfig(step: Step, widget: string): Record<string, unknown> | undefined {
  if (step.type !== 'article') return undefined
  for (const p of step.config.panels) {
    if (p.activity?.kind === 'widget' && p.activity.widget === widget) {
      return p.activity.config as Record<string, unknown>
    }
  }
  return undefined
}

function checkpointsOf(step: Step) {
  if (step.type !== 'article') return []
  return step.config.panels.flatMap((p) => (p.activity?.kind === 'checkpoint' ? [p.activity] : []))
}

describe('[L5] Making Decisions — structure + ordering', () => {
  it('keeps the lesson id and its 5th-place registration order', () => {
    expect(l5().id).toBe('l5-making-decisions')
    expect(listLessons().map((l) => l.id)[4]).toBe('l5-making-decisions')
  })

  it('is a tight 6-step arc: one-fork → two-paths → fix-indent → first-door-wins → assemble → finish-it', () => {
    expect(l5().steps.map((s) => s.id)).toEqual([
      'one-fork',
      'two-paths',
      'fix-the-indent',
      'first-door-wins',
      'assemble',
      'finish-it',
    ])
  })

  it('is interactive in almost every step (no wall-of-text article panels)', () => {
    // Every article panel either drives a widget or asks a checkpoint — there are
    // no read-only prose-only panels in this rebuilt lesson.
    for (const step of l5().steps) {
      if (step.type !== 'article') continue
      for (const panel of step.config.panels) {
        expect(Boolean(panel.activity)).toBe(true)
      }
    }
  })
})

describe('[L5] 1 — one fork (if only, no else)', () => {
  it('introduces if with a SINGLE-condition decision_machine that has no else', () => {
    const step = stepById('one-fork')
    expect(step.type).toBe('article')
    expect(step.graded).toBe(false)
    expect(widgetsOf(step)).toContain('decision_machine')
    const cfg = widgetConfig(step, 'decision_machine')!
    expect(cfg.hasElse).toBe(false)
    expect((cfg.conditions as { divisor: number }[]).map((c) => c.divisor)).toEqual([3])
  })

  it('ends by asking WHEN the inside line runs (answer: when True)', () => {
    const cp = checkpointsOf(stepById('one-fork')).at(-1)!
    expect(cp.prompt.toLowerCase()).toMatch(/when/)
    expect(cp.prompt.toLowerCase()).toMatch(/inside/)
    expect(cp.choices[cp.answerIndex].toLowerCase()).toContain('true')
  })
})

describe('[L5] 2 — two paths (if + else)', () => {
  it('adds else via a 1-condition + else decision_machine and asks a predict-which-path check', () => {
    const step = stepById('two-paths')
    expect(step.type).toBe('article')
    expect(widgetsOf(step)).toContain('decision_machine')
    const cfg = widgetConfig(step, 'decision_machine')!
    expect(cfg.hasElse).toBe(true)
    expect((cfg.conditions as { divisor: number }[]).length).toBe(1)
    const cp = checkpointsOf(step)[0]
    // The correct answer is the else path (the False / opposite case).
    expect(cp.choices[cp.answerIndex].toLowerCase()).toContain('else')
  })
})

describe('[L5] 3 — fix-the-indent (typed)', () => {
  it('is a typed fix-the-bug whose starter body is flush-left under the if (a real IndentationError)', () => {
    const step = stepById('fix-the-indent')
    expect(step.type).toBe('python_sandbox')
    if (step.type !== 'python_sandbox') return
    expect(step.graded).toBe(true)
    expect(step.config.requiredConstructs).toContain('conditional')
    expect(step.config.testCases[0].expectedStdout).toBe('multiple of 3')
    const lines = step.config.starterCode.split('\n')
    const ifIdx = lines.findIndex((l) => l.trim().startsWith('if '))
    expect(ifIdx).toBeGreaterThanOrEqual(0)
    const body = lines[ifIdx + 1]
    expect(body.trim().startsWith('print(')).toBe(true)
    // The bug: the body is flush-left (no leading whitespace) under the if.
    expect(body.startsWith(' ')).toBe(false)
    // The prompt/feedback never hand over the corrected (indented) line.
    expect(step.config.prompt).not.toContain('    print(')
    expect(step.config.testCases[0].feedback ?? '').not.toContain('    print(')
  })

  it('grades wrong while the body is unindented, correct once it is indented', async () => {
    const step = stepById('fix-the-indent')
    if (step.type !== 'python_sandbox') throw new Error('not python')
    const bugged: PythonRunner = async () => ({
      stdout: '',
      error: "IndentationError: expected an indented block after 'if' statement on line 2",
    })
    const buggedRun = await gradePython(step.config.starterCode, step.config.testCases, bugged, {
      requiredConstructs: step.config.requiredConstructs,
    })
    expect(buggedRun.passed).toBe(false)

    const fixed = 'n = 6\nif n % 3 == 0:\n    print("multiple of 3")'
    const fixedRun = await gradePython(fixed, step.config.testCases, constRunner('multiple of 3'), {
      requiredConstructs: step.config.requiredConstructs,
    })
    expect(fixedRun.passed).toBe(true)
    expect(fixedRun.missingConstructs).toEqual([])
  })
})

describe('[L5] 4 — first door wins (elif + priority)', () => {
  it('uses a TWO-condition + else decision_machine reaching 15 so a both-match number is visible', () => {
    const step = stepById('first-door-wins')
    expect(step.type).toBe('article')
    expect(widgetsOf(step)).toContain('decision_machine')
    const cfg = widgetConfig(step, 'decision_machine')!
    expect((cfg.conditions as { divisor: number }[]).map((c) => c.divisor)).toEqual([3, 5])
    expect(cfg.hasElse).toBe(true)
    // The dial must reach 15 (a multiple of BOTH) so first-match-wins is seeable.
    expect(cfg.max).toBe(15)
  })

  it('checks that the FIRST true branch wins', () => {
    const cp = checkpointsOf(stepById('first-door-wins'))[0]
    expect(cp.prompt.toLowerCase()).toMatch(/more than one|first|true/)
    expect(cp.choices[cp.answerIndex].toLowerCase()).toContain('first')
  })
})

describe('[L5] 5 — assemble (parsons, generic)', () => {
  it('keeps a parsons_problem with checkIndent, generic wording, and answer-free order + indent hints', () => {
    const step = stepById('assemble')
    expect(step.type).toBe('parsons_problem')
    if (step.type !== 'parsons_problem') return
    expect(step.config.checkIndent).toBe(true)
    const code = step.config.lines.map((l) => l.code).join('\n')
    expect(code).not.toMatch(/Fizz|Buzz/)
    expect(code).toContain('multiple of 3')
    // Answer-free hints exist and point back to the worked demo.
    expect(step.config.orderHint).toBeTruthy()
    expect(step.config.orderHint!.toLowerCase()).toMatch(/back/)
    expect(step.config.indentHint).toBeTruthy()
  })

  it('grades the intended order + indentation as correct, and a flat arrangement as wrong', () => {
    const step = stepById('assemble')
    if (step.type !== 'parsons_problem') throw new Error('not parsons')
    const solution = step.config.lines.map((l) => ({ id: l.id, indent: l.indent }))
    expect(gradeParsons(solution, solution, true).correct).toBe(true)
    const flat = step.config.lines.map((l) => ({ id: l.id, indent: 0 }))
    expect(gradeParsons(flat, solution, true).correct).toBe(false)
  })
})

describe('[L5] 6 — finish-it (typed if/else, no elif)', () => {
  it('is a graded typed step enforcing conditional, with a trimmed generic prompt', () => {
    const step = stepById('finish-it')
    expect(step.type).toBe('python_sandbox')
    if (step.type !== 'python_sandbox') return
    expect(step.graded).toBe(true)
    expect(step.config.requiredConstructs).toContain('conditional')
    expect(step.config.testCases[0].expectedStdout).toBe('4')
    // elif is no longer taught: it must not appear in the prompt, success, or feedback.
    expect(step.config.prompt.toLowerCase()).not.toContain('elif')
    expect((step.config.successMessage ?? '').toLowerCase()).not.toContain('elif')
    expect((step.config.testCases[0].feedback ?? '').toLowerCase()).not.toContain('elif')
    // The "predict out loud" nudge moved OUT of the prompt and INTO the failure hint.
    expect(step.config.prompt.toLowerCase()).not.toContain('predict')
    expect((step.config.testCases[0].feedback ?? '').toLowerCase()).toContain('predict')
    expect(step.config.prompt).not.toMatch(/Fizz|Buzz/)
    // The prompt/feedback never spell out the full answer line.
    expect(step.config.prompt).not.toContain('print(n)')
    expect(step.config.testCases[0].feedback ?? '').not.toContain('print(n)')
  })

  it('the bare starter fails; a correct if/else for n = 4 prints the number "4"', async () => {
    const step = stepById('finish-it')
    if (step.type !== 'python_sandbox') throw new Error('not python')
    // Bare starter prints nothing → wrong.
    const bareRun = await gradePython(step.config.starterCode, step.config.testCases, constRunner(''), {
      requiredConstructs: step.config.requiredConstructs,
    })
    expect(bareRun.passed).toBe(false)

    // 4 is not a multiple of 3, so the else path prints the number itself.
    const solution = 'n = 4\nif n % 3 == 0:\n    print("multiple of 3")\nelse:\n    print(n)'
    const done = await gradePython(solution, step.config.testCases, constRunner('4'), {
      requiredConstructs: step.config.requiredConstructs,
    })
    expect(done.passed).toBe(true)
    expect(done.missingConstructs).toEqual([])
  })
})

describe('[L5] global rules', () => {
  it('never mentions Fizz or Buzz anywhere in the lesson', () => {
    expect(JSON.stringify(l5())).not.toMatch(/Fizz|Buzz/)
  })

  it('no checkpoint incorrect feedback reveals the correct choice', () => {
    for (const step of l5().steps) {
      if (step.type !== 'article') continue
      for (const panel of step.config.panels) {
        if (panel.activity?.kind !== 'checkpoint') continue
        const c = panel.activity
        const correct = c.choices[c.answerIndex].toLowerCase()
        const incorrect = (c.feedback?.incorrect ?? '').toLowerCase()
        expect(incorrect).not.toContain(correct)
      }
    }
  })
})
