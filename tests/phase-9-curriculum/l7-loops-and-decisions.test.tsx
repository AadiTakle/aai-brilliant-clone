import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { getLesson, listLessons } from '../../src/content/loader'
import type { Lesson, Step } from '../../src/content/schemas'
import { gradePython } from '../../src/lib/grading/pythonGrader'
import { gradeParsons } from '../../src/lib/grading/parsonsGrader'
import { diagnose } from '../../src/lib/grading/diagnostics'
import { programStepperConfigSchema } from '../../src/problem-types/article/schema'
import { ProgramStepper } from '../../src/problem-types/article/widgets/ProgramStepper'
import { ParsonsProblemStep } from '../../src/problem-types/parsons_problem/ParsonsProblemStep'
import type { PythonRunner } from '../../src/lib/pyodide/runner'

const constRunner = (stdout: string): PythonRunner => async () => ({ stdout, error: null })

function mockMatchMedia(reduce: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduce && query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onchange: null,
    dispatchEvent: vi.fn(),
  }))
}

function l7(): Lesson {
  const lesson = getLesson('l7-loops-and-decisions')
  if (!lesson) throw new Error('missing lesson: l7-loops-and-decisions')
  return lesson
}

function stepById(id: string): Step {
  const step = l7().steps.find((s) => s.id === id)
  if (!step) throw new Error(`missing step: ${id}`)
  return step
}

function widgetActivities(step: Step) {
  if (step.type !== 'article') return []
  return step.config.panels.flatMap((p) =>
    p.activity?.kind === 'widget' ? [p.activity] : [],
  )
}

function widgetsOf(step: Step): string[] {
  return widgetActivities(step).map((a) => a.widget)
}

// The pseudo-FizzBuzz the parsons + typed 7.4 build (yes for multiples of 3, no
// otherwise; numbers 0..6) — accumulated as WORDS, so there is never any str().
const YES_NO_7 = 'yes no no yes no no yes'
// The two short worked demos in 7.2 (kept <= 15 steps each).
const DEMO2_YES_NO = 'yes no no yes' // if/else over range(4)
const DEMO1_ALL_NO = 'no no no no' // same word every turn over range(4)

describe('[L7] Loops and Decisions — structure + ordering', () => {
  it('keeps the lesson id and its 7th-place registration order', () => {
    expect(l7().id).toBe('l7-loops-and-decisions')
    expect(listLessons().map((l) => l.id)[6]).toBe('l7-loops-and-decisions')
  })

  it('walks intro → worked-demo → parsons → typed practice (block steps removed)', () => {
    expect(l7().steps.map((s) => s.id)).toEqual([
      'intro',
      'accumulate-in-a-loop',
      'order-loop-and-if',
      'accumulate-multiples-of-three',
    ])
    // The old block_problem steps are gone (moving toward typed Python).
    expect(l7().steps.some((s) => s.type === 'block_problem')).toBe(false)
    expect(l7().steps.some((s) => s.id === 'accumulate-label')).toBe(false)
    expect(l7().steps.some((s) => s.id === 'loop-if-together')).toBe(false)
  })
})

describe('[L7] 7.1 — intro accumulator via program_stepper + commentary', () => {
  it('renders the accumulator demo through the program_stepper (trace) with per-step commentary', () => {
    const step = stepById('intro')
    expect(step.type).toBe('article')
    expect(widgetsOf(step)).toContain('program_stepper')
    const widget = widgetActivities(step).find((a) => a.widget === 'program_stepper')!
    const cfg = programStepperConfigSchema.parse(widget.config)
    expect(cfg.mode).toBe('trace')
    if (cfg.mode !== 'trace') return
    // Every step carries commentary (the thing the old code_tracer lacked).
    expect(cfg.steps.length).toBeGreaterThan(0)
    expect(cfg.steps.every((s) => s.commentary.trim().length > 0)).toBe(true)
    // It teaches the accumulator pattern: read the old value, add, store back.
    const code = cfg.code.join('\n')
    expect(code).toMatch(/result\s*=\s*result\s*\+/)
    // Words, not numbers — there is no str() at this level.
    expect(code).not.toContain('str(')
  })

  it('still ends with a checkpoint that checks understanding of concatenation', () => {
    const step = stepById('intro')
    if (step.type !== 'article') throw new Error('not article')
    const checkpoints = step.config.panels.flatMap((p) =>
      p.activity?.kind === 'checkpoint' ? [p.activity] : [],
    )
    expect(checkpoints.length).toBeGreaterThan(0)
  })
})

describe('[L7] 7.3 worked demo — accumulation in a loop + double indentation', () => {
  it('is an ungraded article built entirely from program_stepper traces', () => {
    const step = stepById('accumulate-in-a-loop')
    expect(step.type).toBe('article')
    expect(step.graded).toBe(false)
    const widgets = widgetsOf(step)
    expect(widgets.length).toBeGreaterThanOrEqual(2)
    expect(widgets.every((w) => w === 'program_stepper')).toBe(true)
  })

  it('first demo adds the same word each turn into a string inside a loop (single indent, kept short)', () => {
    const step = stepById('accumulate-in-a-loop')
    const widget = widgetActivities(step)[0]
    const cfg = programStepperConfigSchema.parse(widget.config)
    expect(cfg.mode).toBe('trace')
    if (cfg.mode !== 'trace') return
    const code = cfg.code.join('\n')
    // Short loop so the whole demo is <= 15 steps to click through.
    expect(code).toMatch(/for\s+i\s+in\s+range\(4\):/)
    // String accumulator: read result, add a word + a space, store back. No str().
    expect(code).toMatch(/result\s*=\s*result\s*\+/)
    expect(code).not.toContain('str(')
    expect(cfg.steps.length).toBeLessThanOrEqual(15)
    // The end result printed is the same word repeated.
    const printed = cfg.steps.map((s) => s.output).filter(Boolean).join('')
    expect(printed).toContain(DEMO1_ALL_NO)
  })

  it('second demo nests an if/else inside the loop, creating DOUBLE indentation that the commentary points out (kept short)', () => {
    const step = stepById('accumulate-in-a-loop')
    const widget = widgetActivities(step)[1]
    const cfg = programStepperConfigSchema.parse(widget.config)
    expect(cfg.mode).toBe('trace')
    if (cfg.mode !== 'trace') return
    const code = cfg.code
    // The for, the if and the else are all present.
    expect(code.join('\n')).toMatch(/for\s+i\s+in\s+range/)
    expect(code.join('\n')).toMatch(/if\s+i\s*%\s*3\s*==\s*0:/)
    expect(code.join('\n')).toMatch(/else:/)
    // Words, not numbers — no str() at this level.
    expect(code.join('\n')).not.toContain('str(')
    // Some line is indented TWICE (8 leading spaces) — inside the loop AND the if/else.
    expect(code.some((l) => /^ {8}\S/.test(l))).toBe(true)
    // The commentary explicitly calls out the double indentation.
    const commentary = cfg.steps.map((s) => s.commentary).join(' ').toLowerCase()
    expect(commentary).toMatch(/indent|pushed in|twice|inside the if/)
    // Kept short so it is not tedious to step through.
    expect(cfg.steps.length).toBeLessThanOrEqual(15)
    // It decides yes/no and builds the expected short sequence.
    const printed = cfg.steps.map((s) => s.output).filter(Boolean).join('')
    expect(printed).toContain(DEMO2_YES_NO)
  })
})

describe('[L7] 7.3 parsons — assemble a loop + if accumulator (double indent)', () => {
  it('keeps a parsons_problem with checkIndent, generic wording (no Fizz/Buzz), and an accumulator body', () => {
    const step = stepById('order-loop-and-if')
    expect(step.type).toBe('parsons_problem')
    if (step.type !== 'parsons_problem') return
    expect(step.config.checkIndent).toBe(true)
    const code = step.config.lines.map((l) => l.code).join('\n')
    expect(code).not.toMatch(/Fizz|Buzz/)
    // Accumulates into a string instead of printing literals (ties back to 7.1).
    expect(code).toMatch(/result\s*=\s*result\s*\+/)
    // The body line lives inside the loop AND the if → double indentation.
    const accumulator = step.config.lines.find((l) => /result\s*=\s*result\s*\+/.test(l.code))!
    expect(accumulator.indent).toBe(2)
    const ifLine = step.config.lines.find((l) => /^if\b/.test(l.code))!
    expect(ifLine.indent).toBe(1)
  })

  it('its wrong-indentation hint is answer-free and reminds that BOTH for and if need indentation', () => {
    const step = stepById('order-loop-and-if')
    if (step.type !== 'parsons_problem') throw new Error('not parsons')
    const hint = (step.config.indentHint ?? '').toLowerCase()
    expect(hint).toMatch(/for/)
    expect(hint).toMatch(/if/)
    expect(hint).toMatch(/indent/)
    // Answer-free: never spells out the exact indentation numbers.
    expect(hint).not.toMatch(/8 spaces|two levels deep|indent 2/)
  })

  it('grades the intended order + indentation correct, and a flat arrangement wrong', () => {
    const step = stepById('order-loop-and-if')
    if (step.type !== 'parsons_problem') throw new Error('not parsons')
    const solution = step.config.lines.map((l) => ({ id: l.id, indent: l.indent }))
    expect(gradeParsons(solution, solution, true).correct).toBe(true)
    const flat = step.config.lines.map((l) => ({ id: l.id, indent: 0 }))
    const res = gradeParsons(flat, solution, true)
    expect(res.orderCorrect).toBe(true)
    expect(res.indentCorrect).toBe(false)
    expect(res.correct).toBe(false)
  })

  it('its wrong-order hint points back to the previous worked demo and stays answer-free', () => {
    const step = stepById('order-loop-and-if')
    if (step.type !== 'parsons_problem') throw new Error('not parsons')
    const hint = (step.config.orderHint ?? '').toLowerCase()
    expect(hint.length).toBeGreaterThan(0)
    // References the previous worked demo and tells them to press the Back button.
    expect(hint).toMatch(/demo|loop/)
    expect(hint).toContain('back')
    // Answer-free: it does not just list the lines / the order for them.
    expect(hint).not.toContain('result = result +')
    // It is NOT the generic "check the order of the lines" default.
    expect(hint).not.toBe('not quite — check the order of the lines.')
  })

  it('the ParsonsProblemStep shows the custom orderHint when the order is wrong', async () => {
    const step = stepById('order-loop-and-if')
    if (step.type !== 'parsons_problem') throw new Error('not parsons')
    const user = userEvent.setup()
    render(<ParsonsProblemStep step={step} onComplete={vi.fn()} />)
    // Add the lines in a deliberately wrong order (print first).
    const reversed = [...step.config.lines].reverse()
    for (const line of reversed) {
      await user.click(screen.getByLabelText(`Add ${line.code}`))
    }
    await user.click(screen.getByRole('button', { name: /check/i }))
    expect(screen.getByText(step.config.orderHint!)).toBeInTheDocument()
    // The generic fallback must NOT appear.
    expect(screen.queryByText('Not quite — check the order of the lines.')).toBeNull()
  })

  it('the ParsonsProblemStep shows the custom indentHint when only the indentation is wrong', async () => {
    const step = stepById('order-loop-and-if')
    if (step.type !== 'parsons_problem') throw new Error('not parsons')
    const user = userEvent.setup()
    render(<ParsonsProblemStep step={step} onComplete={vi.fn()} />)
    // Add every line in the correct order, but leave them all flush-left.
    for (const line of step.config.lines) {
      await user.click(screen.getByLabelText(`Add ${line.code}`))
    }
    await user.click(screen.getByRole('button', { name: /check/i }))
    const hint = step.config.indentHint!
    expect(screen.getByText(hint)).toBeInTheDocument()
  })
})

describe('[L7] 7.4 — typed yes/no accumulator (pseudo-FizzBuzz)', () => {
  it('is a graded python_sandbox requiring loop + conditional + modulo, generic (no Fizz)', () => {
    const step = stepById('accumulate-multiples-of-three')
    expect(step.type).toBe('python_sandbox')
    if (step.type !== 'python_sandbox') return
    expect(step.graded).toBe(true)
    expect([...step.config.requiredConstructs].sort()).toEqual(['conditional', 'loop', 'modulo'])
    expect(step.config.testCases[0].expectedStdout).toBe(YES_NO_7)
    expect(step.config.prompt).not.toMatch(/Fizz|Buzz/)
    expect(step.config.successMessage && step.config.successMessage.length > 0).toBe(true)
    // GLOBAL RULE: the authored feedback never hands over the answer.
    const feedback = step.config.testCases[0].feedback ?? ''
    expect(feedback).not.toContain(YES_NO_7)
  })

  it('blank/wrong fail and the yes/no accumulator passes (constructs satisfied, no str())', async () => {
    const step = stepById('accumulate-multiples-of-three')
    if (step.type !== 'python_sandbox') throw new Error('not python')
    const opts = { requiredConstructs: step.config.requiredConstructs }

    // Blank program: nothing printed → fails.
    const blank = await gradePython('', step.config.testCases, constRunner(''), opts)
    expect(blank.passed).toBe(false)

    // Right output but no loop/if/% (hardcoded) → caught by construct check.
    const cheat = await gradePython(
      `print("${YES_NO_7}")`,
      step.config.testCases,
      constRunner(YES_NO_7),
      opts,
    )
    expect(cheat.passed).toBe(false)
    expect(cheat.missingConstructs.length).toBeGreaterThan(0)

    // A real loop + if/else + % accumulator that builds the words → passes. No str().
    const ref =
      'result = ""\nfor i in range(7):\n    if i % 3 == 0:\n        result = result + "yes "\n    else:\n        result = result + "no "\nprint(result)'
    expect(ref).not.toContain('str(')
    const ok = await gradePython(ref, step.config.testCases, constRunner(YES_NO_7 + ' '), opts)
    expect(ok.passed).toBe(true)
    expect(ok.missingConstructs).toEqual([])
  })

  it('produces a specific, answer-free hint when the words are run together (no spaces)', () => {
    const hint = diagnose({ kind: 'python', expected: YES_NO_7, actual: 'yesnonoyesnonoyes' })
    expect(hint).toBeTruthy()
    expect(hint!.toLowerCase()).toMatch(/space|run together|apart|between/)
    // Answer-free: it never prints the expected sequence back.
    expect(hint).not.toContain(YES_NO_7)
  })
})

describe('[L7] ProgramStepper trace mode — component behavior', () => {
  function output(container: HTMLElement): string {
    return container.querySelector('.ps-output .console')?.textContent ?? ''
  }

  it('schema accepts a trace config and L5 decision + L6 loop configs still parse', () => {
    const trace = programStepperConfigSchema.parse({
      mode: 'trace',
      code: ['label = ""', 'label = label + "Hi"', 'print(label)'],
      steps: [
        { line: 0, commentary: 'start', vars: { label: '""' } },
        { line: 1, commentary: 'add', vars: { label: '"Hi"' } },
        { line: 2, commentary: 'print', vars: { label: '"Hi"' }, output: 'Hi' },
      ],
    })
    expect(trace.mode).toBe('trace')
    // L5 decision config (no mode) and L6 loop config still parse unchanged.
    expect(programStepperConfigSchema.parse({ conditions: [{ divisor: 3, prints: 'Fizz' }] }).mode).toBe('decision')
    expect(programStepperConfigSchema.parse({ mode: 'loop', stop: 3 }).mode).toBe('loop')
    // A trace config must carry at least one code line and one step.
    expect(() => programStepperConfigSchema.parse({ mode: 'trace', code: [], steps: [] })).toThrow()
  })

  it('steps through the authored trace, shows no input field, and prints the built-up result at the end', async () => {
    mockMatchMedia(false)
    const user = userEvent.setup()
    const onComplete = vi.fn()
    const step = stepById('accumulate-in-a-loop')
    const widget = widgetActivities(step)[0]
    const { container } = render(<ProgramStepper config={widget.config} onComplete={onComplete} />)
    // Trace/loop modes never show the decision-mode number input.
    expect(screen.queryByLabelText('input number')).toBeNull()
    const stepBtn = () => screen.getByRole('button', { name: /^step$/i }) as HTMLButtonElement
    for (let i = 0; i < 60 && !stepBtn().disabled; i++) {
      await user.click(stepBtn())
    }
    expect(output(container)).toContain(DEMO1_ALL_NO)
    await waitFor(() => expect(onComplete).toHaveBeenCalled())
  })
})

describe('[L7] global no-answer rule', () => {
  it('no checkpoint incorrect feedback reveals the correct choice', () => {
    for (const step of l7().steps) {
      if (step.type !== 'article') continue
      for (const panel of step.config.panels) {
        if (panel.activity?.kind !== 'checkpoint') continue
        const c = panel.activity
        const correct = c.choices[c.answerIndex].toLowerCase()
        const incorrect = (c.feedback?.incorrect ?? '').toLowerCase()
        if (incorrect) expect(incorrect).not.toContain(correct)
      }
    }
  })
})