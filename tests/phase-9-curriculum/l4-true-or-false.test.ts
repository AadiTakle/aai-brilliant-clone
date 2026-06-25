import { describe, it, expect } from 'vitest'
import { getLesson } from '../../src/content/loader'
import type { Lesson, Step } from '../../src/content/schemas'
import { gradeBlocks } from '../../src/lib/grading/blockGrader'
import type { CodeNode } from '../../src/lib/blocks/definitions'
import type { PythonRunner } from '../../src/lib/pyodide/runner'

const constRunner = (stdout: string): PythonRunner => async () => ({ stdout, error: null })

function l4(): Lesson {
  const lesson = getLesson('l4-true-or-false')
  if (!lesson) throw new Error('missing lesson: l4-true-or-false')
  return lesson
}

function stepById(id: string): Step {
  const step = l4().steps.find((s) => s.id === id)
  if (!step) throw new Error(`missing step: ${id}`)
  return step
}

function widgetsOf(step: Step): string[] {
  if (step.type !== 'article') return []
  return step.config.panels.flatMap((p) => (p.activity?.kind === 'widget' ? [p.activity.widget] : []))
}

function checkpointsOf(step: Step) {
  if (step.type !== 'article') return []
  return step.config.panels.flatMap((p) => (p.activity?.kind === 'checkpoint' ? [p.activity] : []))
}

function articleText(step: Step): string {
  if (step.type !== 'article') return ''
  return step.config.panels.map((p) => p.text ?? '').join(' ')
}

describe('[L4] rehaul — True or False (comparisons for beginners)', () => {
  it('keeps the lesson id and title stable', () => {
    expect(l4().id).toBe('l4-true-or-false')
    expect(l4().title).toBe('True or False')
  })

  // The lesson now opens with a gentle concept step BEFORE the explorer, then
  // the comparison explorer, then a build-it-yourself block, then exact-text.
  it('orders the steps: a new concept step before intro, then intro, build, exact-text', () => {
    const ids = l4().steps.map((s) => s.id)
    expect(ids[0]).toBe('meet-the-signs')
    expect(ids[1]).toBe('intro')
    expect(ids.indexOf('meet-the-signs')).toBeLessThan(ids.indexOf('intro'))
    expect(ids).toContain('compare-numbers')
    expect(ids).toContain('exact-text')
    // intro (the comparison explorer) comes before the build step
    expect(ids.indexOf('intro')).toBeLessThan(ids.indexOf('compare-numbers'))
  })

  // 1 — NEW pre-step article introduces ==, >, < gently for kids.
  it('1. opens with an article that introduces the ==, > and < signs', () => {
    const step = stepById('meet-the-signs')
    expect(step.type).toBe('article')
    const text = articleText(step)
    expect(text).toContain('==')
    expect(text).toContain('>')
    expect(text).toContain('<')
    // It does NOT use the comparison_explorer (that is the next step's job).
    expect(widgetsOf(step)).not.toContain('comparison_explorer')
    // Has at least one understanding check.
    expect(checkpointsOf(step).length).toBeGreaterThan(0)
  })

  // 2 — the comparison explorer step keeps the comparison_explorer widget.
  it('2. the intro step uses the comparison_explorer widget (the scroll-selector playground)', () => {
    const step = stepById('intro')
    expect(step.type).toBe('article')
    expect(widgetsOf(step)).toContain('comparison_explorer')
  })

  // 3 — build-it-yourself block problem with a `remainder` variable.
  it('3. compare-numbers is a build-it-yourself locked block problem about multiples', () => {
    const step = stepById('compare-numbers')
    expect(step.type).toBe('block_problem')
    if (step.type !== 'block_problem') return
    expect(step.config.lockBlocks).toBe(true)
    expect(step.config.requiredConstructs).toContain('modulo')
    expect(step.config.expectedOutput).toBe('True')
    // The learner has blocks to drag in to complete the program.
    expect(step.config.palette.length).toBeGreaterThan(0)
    expect(step.config.palette).toContain('binop')
  })

  it('3. requires the yes/no question to compare the remainder box with == against 0', () => {
    const step = stepById('compare-numbers')
    if (step.type !== 'block_problem') throw new Error('not a block problem')
    expect(step.config.requireCompare).toEqual({ variable: 'remainder', op: '==', against: 0 })
  })

  it('3. the program stores a `remainder` variable whose value slot starts EMPTY', () => {
    const step = stepById('compare-numbers')
    if (step.type !== 'block_problem') throw new Error('not a block problem')
    const initial = step.config.initial as CodeNode[]
    const remainderAssign = initial.find(
      (n) => n.type === 'assign' && n.slots?.target?.[0]?.fields?.name === 'remainder',
    )
    expect(remainderAssign).toBeTruthy()
    // The value to assign is left for the learner: the slot is empty.
    expect(remainderAssign?.slots?.value ?? []).toHaveLength(0)
  })

  it('3. the printed comparison is present (a compare block) but its slots start EMPTY', () => {
    const step = stepById('compare-numbers')
    if (step.type !== 'block_problem') throw new Error('not a block problem')
    const initial = step.config.initial as CodeNode[]
    const print = initial.find((n) => n.type === 'print')
    const compare = print?.slots?.value?.[0]
    expect(compare?.type).toBe('compare')
    // Both sides of the comparison are empty for the learner to complete.
    expect(compare?.slots?.left ?? []).toHaveLength(0)
    expect(compare?.slots?.right ?? []).toHaveLength(0)
  })

  it('3. the blank starter program does NOT yet pass (it is unfinished)', async () => {
    const step = stepById('compare-numbers')
    if (step.type !== 'block_problem') throw new Error('not a block problem')
    // Empty expression slots compile to a sentinel → no valid output.
    const run = await gradeBlocks(step.config.initial as CodeNode[], step.config.expectedOutput!, constRunner(''), {
      requiredConstructs: step.config.requiredConstructs,
    })
    expect(run.correct).toBe(false)
  })

  it('3. grades correct once the learner builds remainder = i % 3 and prints remainder == 0', async () => {
    const step = stepById('compare-numbers')
    if (step.type !== 'block_problem') throw new Error('not a block problem')
    const built: CodeNode[] = [
      {
        type: 'assign',
        slots: {
          target: [{ type: 'var', fields: { name: 'i' } }],
          value: [{ type: 'num', fields: { value: 9 } }],
        },
      },
      {
        type: 'assign',
        slots: {
          target: [{ type: 'var', fields: { name: 'remainder' } }],
          value: [
            {
              type: 'binop',
              fields: { op: '%' },
              slots: {
                left: [{ type: 'var', fields: { name: 'i' } }],
                right: [{ type: 'num', fields: { value: 3 } }],
              },
            },
          ],
        },
      },
      {
        type: 'print',
        slots: {
          value: [
            {
              type: 'compare',
              fields: { op: '==' },
              slots: {
                left: [{ type: 'var', fields: { name: 'remainder' } }],
                right: [{ type: 'num', fields: { value: 0 } }],
              },
            },
          ],
        },
      },
    ]
    const run = await gradeBlocks(built, step.config.expectedOutput!, constRunner('True'), {
      requiredConstructs: step.config.requiredConstructs,
      requireCompare: step.config.requireCompare,
    })
    expect(run.correct).toBe(true)
    expect(run.missingConstructs).toEqual([])
    expect(run.compareMissing).toBe(false)
  })

  it('3. rejects a faked comparison that ignores the remainder box (e.g. prints i == 9)', async () => {
    const step = stepById('compare-numbers')
    if (step.type !== 'block_problem') throw new Error('not a block problem')
    // remainder = i % 3 (so % IS used), but the printed question checks i == 9
    // instead of the remainder — output is still "True", yet it never tests the box.
    const faked: CodeNode[] = [
      {
        type: 'assign',
        slots: {
          target: [{ type: 'var', fields: { name: 'i' } }],
          value: [{ type: 'num', fields: { value: 9 } }],
        },
      },
      {
        type: 'assign',
        slots: {
          target: [{ type: 'var', fields: { name: 'remainder' } }],
          value: [
            {
              type: 'binop',
              fields: { op: '%' },
              slots: {
                left: [{ type: 'var', fields: { name: 'i' } }],
                right: [{ type: 'num', fields: { value: 3 } }],
              },
            },
          ],
        },
      },
      {
        type: 'print',
        slots: {
          value: [
            {
              type: 'compare',
              fields: { op: '==' },
              slots: {
                left: [{ type: 'var', fields: { name: 'i' } }],
                right: [{ type: 'num', fields: { value: 9 } }],
              },
            },
          ],
        },
      },
    ]
    const run = await gradeBlocks(faked, step.config.expectedOutput!, constRunner('True'), {
      requiredConstructs: step.config.requiredConstructs,
      requireCompare: step.config.requireCompare,
    })
    // The % is present, so it's specifically the comparator that fails.
    expect(run.missingConstructs).toEqual([])
    expect(run.compareMissing).toBe(true)
    expect(run.correct).toBe(false)
  })

  it('3. a right-looking answer that never uses % is rejected (no faking the multiple check)', async () => {
    const step = stepById('compare-numbers')
    if (step.type !== 'block_problem') throw new Error('not a block problem')
    // remainder = 0 ; print(remainder == 0) → "True" but no modulo used.
    const fake: CodeNode[] = [
      {
        type: 'assign',
        slots: {
          target: [{ type: 'var', fields: { name: 'remainder' } }],
          value: [{ type: 'num', fields: { value: 0 } }],
        },
      },
      {
        type: 'print',
        slots: {
          value: [
            {
              type: 'compare',
              fields: { op: '==' },
              slots: {
                left: [{ type: 'var', fields: { name: 'remainder' } }],
                right: [{ type: 'num', fields: { value: 0 } }],
              },
            },
          ],
        },
      },
    ]
    const run = await gradeBlocks(fake, step.config.expectedOutput!, constRunner('True'), {
      requiredConstructs: step.config.requiredConstructs,
      requireCompare: step.config.requireCompare,
    })
    expect(run.correct).toBe(false)
    expect(run.missingConstructs).toContain('modulo')
  })

  it('3. the prompt guides without writing the answer (no `remainder == 0`, no `i % 3`)', () => {
    const step = stepById('compare-numbers')
    if (step.type !== 'block_problem') throw new Error('not a block problem')
    const prompt = step.config.prompt
    expect(prompt).not.toContain('remainder == 0')
    expect(prompt).not.toContain('i % 3')
    expect(prompt).not.toContain('% 3')
  })

  // 4 — exact text comparison is now an ARTICLE, not a block problem.
  it('4. exact-text is an article (no longer a block problem) about exact text matching', () => {
    const step = stepById('exact-text')
    expect(step.type).toBe('article')
    // The lesson no longer compares the empty string in a block problem.
    expect(l4().steps.some((s) => s.id === 'compare-strings')).toBe(false)
  })

  it('4. demonstrates that capitalization, spaces, and symbols all break equality', () => {
    const step = stepById('exact-text')
    const text = articleText(step).toLowerCase()
    const cps = checkpointsOf(step)
    const allPrompts = cps.map((c) => c.prompt).join(' ')
    // The concept words appear in the prose.
    expect(text).toMatch(/capital/)
    expect(text).toMatch(/space/)
    expect(text).toMatch(/symbol/)
    // The classic capitalization example is explored.
    expect((allPrompts + ' ' + text)).toContain('Cat')
    expect((allPrompts + ' ' + text)).toContain('cat')
    expect(cps.length).toBeGreaterThanOrEqual(2)
  })

  // GLOBAL no-answer rule across every checkpoint in the lesson.
  it('global rule: no checkpoint incorrect feedback reveals the correct choice', () => {
    for (const step of l4().steps) {
      for (const cp of checkpointsOf(step)) {
        const correct = cp.choices[cp.answerIndex].toLowerCase()
        const incorrect = (cp.feedback?.incorrect ?? '').toLowerCase()
        expect(incorrect).not.toContain(correct)
      }
    }
  })

  // Coverage contract: a compare block + the comparison_explorer widget remain.
  it('coverage: keeps a compare block and the comparison_explorer widget', () => {
    const json = JSON.stringify(l4().steps)
    expect(json).toContain('"compare"')
    const allWidgets = l4().steps.flatMap((s) => widgetsOf(s))
    expect(allWidgets).toContain('comparison_explorer')
  })
})
