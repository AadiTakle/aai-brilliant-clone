import { describe, it, expect } from 'vitest'
import { getLesson } from '../../src/content/loader'
import type { Lesson, Step } from '../../src/content/schemas'
import { gradeBlocks } from '../../src/lib/grading/blockGrader'
import { gradePython } from '../../src/lib/grading/pythonGrader'
import type { CodeNode } from '../../src/lib/blocks/definitions'
import type { PythonRunner } from '../../src/lib/pyodide/runner'

const constRunner = (stdout: string): PythonRunner => async () => ({ stdout, error: null })

function l3(): Lesson {
  const lesson = getLesson('l3-doing-the-math')
  if (!lesson) throw new Error('missing lesson: l3-doing-the-math')
  return lesson
}

function stepById(id: string): Step {
  const step = l3().steps.find((s) => s.id === id)
  if (!step) throw new Error(`missing step: ${id}`)
  return step
}

function widgetsOf(step: Step): string[] {
  if (step.type !== 'article') return []
  return step.config.panels.flatMap((p) => (p.activity?.kind === 'widget' ? [p.activity.widget] : []))
}

describe('[L3] rehaul — What\'s Remaining? (modulo only)', () => {
  it('keeps the lesson id stable but renames the display title', () => {
    expect(l3().id).toBe('l3-doing-the-math')
    expect(l3().title).toBe("What's Remaining?")
  })

  // 3.3 — concatenation is omitted entirely; this lesson is solely about modulo.
  it('omits the concatenation step (no string + string anywhere in L3)', () => {
    const ids = l3().steps.map((s) => s.id)
    expect(ids).not.toContain('concatenate-strings')
    // No binop with op '+' should remain in any block program in L3.
    const json = JSON.stringify(l3().steps)
    expect(json).not.toContain('"op":"+"')
  })

  // 3.1 — two-part article: the modulo picker widget + a pattern checkpoint.
  it('3.1 uses the new modulo_picker widget and not the old remainder_machine/multiples_grid', () => {
    const intro = stepById('intro')
    expect(intro.type).toBe('article')
    const widgets = widgetsOf(intro)
    expect(widgets).toContain('modulo_picker')
    expect(widgets).not.toContain('remainder_machine')
    expect(widgets).not.toContain('multiples_grid')
  })

  it('3.1 part 2 is exploratory: prompt/text only ask what the numbers share, divide hint lives in INCORRECT feedback, revelation in CORRECT', () => {
    const intro = stepById('intro')
    if (intro.type !== 'article') throw new Error('intro is not an article')
    const checkpoints = intro.config.panels.flatMap((p) =>
      p.activity?.kind === 'checkpoint' ? [p.activity] : [],
    )
    expect(checkpoints.length).toBeGreaterThan(0)
    const cp = checkpoints[checkpoints.length - 1]
    // The prompt simply asks what the matching numbers have in common.
    expect(cp.prompt.toLowerCase()).toContain('in common')
    // Tweak A: the prompt/text must NOT pre-load the divide-by-3 hint — the
    // checkpoint stays exploratory. The instruction text stops at "take a close look".
    const introText = intro.config.panels.map((p) => p.text ?? '').join(' ').toLowerCase()
    const promptAndText = (cp.prompt + ' ' + introText).toLowerCase()
    expect(promptAndText).not.toMatch(/divid/)
    expect(introText).toContain('take a close look')
    // The divide-by-3 hint appears ONLY in the incorrect-answer feedback.
    expect((cp.feedback?.incorrect ?? '').toLowerCase()).toMatch(/divid/)
    // The revelation lives in the CORRECT feedback.
    expect((cp.feedback?.correct ?? '').toLowerCase()).toContain('multiple of 3')
    // The INCORRECT feedback never reveals the correct choice (global no-answer rule).
    const correctChoice = cp.choices[cp.answerIndex].toLowerCase()
    expect((cp.feedback?.incorrect ?? '').toLowerCase()).not.toContain(correctChoice)
  })

  // 3.2 — fix-the-bug block problem using a `remainder` variable, blocks locked.
  it('3.2 is a fix-the-bug block problem: uses a remainder variable, locks blocks, requires modulo', () => {
    const step = stepById('fix-the-remainder')
    expect(step.type).toBe('block_problem')
    if (step.type !== 'block_problem') return
    expect(step.config.lockBlocks).toBe(true)
    expect(step.config.requiredConstructs).toContain('modulo')
    // The print must go through the box (same guard as L2's store-and-print-text):
    // typing the answer straight into print() instead of printing `remainder` fails.
    expect(step.config.requirePrintVar).toBe('remainder')
    expect(step.config.expectedOutput).toBe('1')
    const json = JSON.stringify(step.config.initial)
    expect(json).toContain('"assign"')
    expect(json).toContain('"remainder"')
    expect(json).toContain('"op":"%"')
    expect(json).toContain('"print"')
    // The program's purpose is stated and the hint reiterates remainder = result of %.
    expect(step.config.prompt.toLowerCase()).toContain('remainder of 10')
    expect(step.config.prompt.toLowerCase()).toMatch(/remainder of a division|left over after|remainder left/)
  })

  it('3.2 starts BUGGED (wrong divisor) and grades correct only once fixed to 10 % 3', async () => {
    const step = stepById('fix-the-remainder')
    if (step.type !== 'block_problem') throw new Error('not a block problem')
    const bugged = step.config.initial as CodeNode[]
    // The starting program does not yet print the expected remainder (it's bugged).
    const buggedRun = await gradeBlocks(bugged, step.config.expectedOutput!, constRunner('2'), {
      requiredConstructs: step.config.requiredConstructs,
    })
    expect(buggedRun.correct).toBe(false)

    // Fix it: change the divisor to 3 → 10 % 3 == 1.
    const fixed: CodeNode[] = [
      {
        type: 'assign',
        slots: {
          target: [{ type: 'var', fields: { name: 'remainder' } }],
          value: [
            {
              type: 'binop',
              fields: { op: '%' },
              slots: {
                left: [{ type: 'num', fields: { value: 10 } }],
                right: [{ type: 'num', fields: { value: 3 } }],
              },
            },
          ],
        },
      },
      { type: 'print', slots: { value: [{ type: 'var', fields: { name: 'remainder' } }] } },
    ]
    const fixedRun = await gradeBlocks(fixed, step.config.expectedOutput!, constRunner('1'), {
      requiredConstructs: step.config.requiredConstructs,
      requirePrintVar: step.config.requirePrintVar,
    })
    expect(fixedRun.correct).toBe(true)
    expect(fixedRun.missingConstructs).toEqual([])
    expect(fixedRun.printVarMissing).toBe(false)
  })

  // 3.2 — typing the answer straight into print() (skipping the remainder box) must
  // not pass, even though the output happens to be correct.
  it('3.2 rejects printing the answer directly instead of the remainder variable', async () => {
    const step = stepById('fix-the-remainder')
    if (step.type !== 'block_problem') throw new Error('not a block problem')
    // remainder is computed correctly, but print() prints the literal answer.
    const bypass: CodeNode[] = [
      {
        type: 'assign',
        slots: {
          target: [{ type: 'var', fields: { name: 'remainder' } }],
          value: [
            {
              type: 'binop',
              fields: { op: '%' },
              slots: {
                left: [{ type: 'num', fields: { value: 10 } }],
                right: [{ type: 'num', fields: { value: 3 } }],
              },
            },
          ],
        },
      },
      { type: 'print', slots: { value: [{ type: 'num', fields: { value: 1 } }] } },
    ]
    const run = await gradeBlocks(bypass, step.config.expectedOutput!, constRunner('1'), {
      requiredConstructs: step.config.requiredConstructs,
      requirePrintVar: step.config.requirePrintVar,
    })
    expect(run.correct).toBe(false)
    expect(run.printVarMissing).toBe(true)
  })

  // 3.4 — typed python step, answer NOT pre-filled; prompt must not name modulo.
  it('3.4 starter is a scaffold (remainder with no value, print) and does not pre-fill the answer', () => {
    const step = stepById('type-the-remainder')
    expect(step.type).toBe('python_sandbox')
    if (step.type !== 'python_sandbox') return
    const starter = step.config.starterCode
    expect(starter).toContain('print(remainder)')
    expect(starter).toMatch(/remainder\s*=/)
    // No value assigned yet, and the modulo operator is NOT pre-filled.
    expect(starter).not.toMatch(/remainder\s*=\s*[^#\s]/)
    expect(starter).not.toContain('%')
    // The prompt must not name the operator or give the formula.
    expect(step.config.prompt.toLowerCase()).not.toContain('modulo')
    expect(step.config.prompt).not.toContain('%')
    expect(step.config.prompt).not.toContain('10 % 3')
  })

  it('3.4 grades a real solution, rejects a non-modulo fake, and only hints modulo on failure', async () => {
    const step = stepById('type-the-remainder')
    if (step.type !== 'python_sandbox') throw new Error('not a python sandbox')
    expect(step.config.requiredConstructs).toContain('modulo')
    expect(step.config.testCases[0].expectedStdout).toBe('1')
    expect(step.config.successMessage).toBeTruthy()

    // A correct solution passes.
    const ok = await gradePython(
      'remainder = 10 % 3\nprint(remainder)',
      step.config.testCases,
      constRunner('1'),
      { requiredConstructs: step.config.requiredConstructs },
    )
    expect(ok.passed).toBe(true)

    // A right-looking output that never uses modulo is rejected (no faking).
    const fake = await gradePython('remainder = 1\nprint(remainder)', step.config.testCases, constRunner('1'), {
      requiredConstructs: step.config.requiredConstructs,
    })
    expect(fake.passed).toBe(false)
    expect(fake.missingConstructs).toContain('modulo')

    // The failure feedback suggests the modulo operator but never the full answer.
    const fb = (step.config.testCases[0].feedback ?? '').toLowerCase()
    expect(fb).toMatch(/%|modulo/)
    expect(fb).not.toContain('10 % 3')
  })

  // GLOBAL RULE: no incorrect-answer feedback reveals the correct choice.
  it('no checkpoint incorrect feedback reveals the correct choice', () => {
    for (const step of l3().steps) {
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
