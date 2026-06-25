import { describe, it, expect } from 'vitest'
import { getLesson } from '../../src/content/loader'
import type { Lesson, Step } from '../../src/content/schemas'
import { printsVariable, reassignmentEditedEarlierNotLast } from '../../src/lib/blocks/analysis'
import type { CodeNode } from '../../src/lib/blocks/definitions'

function l2(): Lesson {
  const lesson = getLesson('l2-boxes-that-remember')
  if (!lesson) throw new Error('missing lesson: l2-boxes-that-remember')
  return lesson
}

function stepById(id: string): Step {
  const step = l2().steps.find((s) => s.id === id)
  if (!step) throw new Error(`missing step: ${id}`)
  return step
}

function widgetsOf(step: Step): string[] {
  if (step.type !== 'article') return []
  return step.config.panels.flatMap((p) => (p.activity?.kind === 'widget' ? [p.activity.widget] : []))
}

describe('[L2] rehaul — boxes that remember', () => {
  it('keeps the lesson id stable', () => {
    expect(l2().id).toBe('l2-boxes-that-remember')
  })

  // 2.1 — the intro drops VALUES into a box (interactive value_box), no type sorter here.
  it('intro (2.1) uses the interactive value_box with number presets and not the type_sorter', () => {
    const intro = stepById('intro')
    expect(intro.type).toBe('article')
    const widgets = widgetsOf(intro)
    expect(widgets).toContain('value_box')
    expect(widgets).not.toContain('type_sorter')
    if (intro.type !== 'article') return
    const valueBoxPanel = intro.config.panels.find(
      (p) => p.activity?.kind === 'widget' && p.activity.widget === 'value_box',
    )
    const cfg = (valueBoxPanel?.activity as { config: Record<string, unknown> }).config
    expect((cfg.options as unknown[]).every((v) => typeof v === 'number')).toBe(true)
  })

  // 2.2a — strings/types are introduced here: value_box with TEXT presets + the type_sorter.
  it('2.2a introduces strings via a text value_box and types via the type_sorter', () => {
    const step = stepById('strings-and-types')
    expect(step.type).toBe('article')
    const widgets = widgetsOf(step)
    expect(widgets).toContain('value_box')
    expect(widgets).toContain('type_sorter')
    if (step.type !== 'article') return
    const valueBoxPanel = step.config.panels.find(
      (p) => p.activity?.kind === 'widget' && p.activity.widget === 'value_box',
    )
    const cfg = (valueBoxPanel?.activity as { config: Record<string, unknown> }).config
    expect(cfg.valueType).toBe('string')
    expect((cfg.options as unknown[]).every((v) => typeof v === 'string')).toBe(true)
  })

  // The old single 2.2 is now TWO steps: the strings/types article AND the block step.
  it('2.2 is now two steps (a strings/types article and a block coding step)', () => {
    const ids = l2().steps.map((s) => s.id)
    expect(ids).toContain('strings-and-types')
    expect(ids).toContain('store-and-print-text')
    const article = stepById('strings-and-types')
    const block = stepById('store-and-print-text')
    expect(article.type).toBe('article')
    expect(block.type).toBe('block_problem')
  })

  // 2.2b — variables in the block interface: a variable used inside a print, blocks locked.
  it('2.2b uses a variable inside print, locks blocks, and stays graded', () => {
    const step = stepById('store-and-print-text')
    expect(step.type).toBe('block_problem')
    if (step.type !== 'block_problem') return
    expect(step.config.lockBlocks).toBe(true)
    expect(step.config.expectedOutput).toBeTruthy()
    // A print block reads a variable.
    const json = JSON.stringify(step.config.initial)
    expect(json).toContain('"print"')
    expect(json).toContain('"var"')
    expect(json).toContain('"assign"')
  })

  // 2.2b — the print must go through the box: skipping the variable and printing
  // a literal must not pass (enforced by requirePrintVar).
  it('2.2b requires the print to use the word variable', () => {
    const step = stepById('store-and-print-text')
    expect(step.type).toBe('block_problem')
    if (step.type !== 'block_problem') return
    expect(step.config.requirePrintVar).toBe('word')
  })

  // 2.3 — last value wins: blocks locked + reassignment check configured.
  it('2.3 locks blocks and opts into the reassignment diagnostic', () => {
    const step = stepById('last-value-wins')
    expect(step.type).toBe('block_problem')
    if (step.type !== 'block_problem') return
    expect(step.config.lockBlocks).toBe(true)
    expect(step.config.reassignmentVar).toBe('n')
    expect(step.config.expectedOutput).toBe('9')
  })

  // Coverage contract: an assign block must exist somewhere in L2.
  it('keeps an assign block in the lesson (coverage contract)', () => {
    const json = JSON.stringify(l2().steps)
    expect(json).toContain('"assign"')
  })

  // GLOBAL RULE: no incorrect-answer feedback reveals the answer.
  it('no checkpoint incorrect feedback reveals the correct choice', () => {
    for (const step of l2().steps) {
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

describe('[L2] reassignment diagnostic helper', () => {
  const initial: CodeNode[] = [
    { type: 'assign', slots: { target: [{ type: 'var', fields: { name: 'n' } }], value: [{ type: 'num', fields: { value: 3 } }] } },
    { type: 'assign', slots: { target: [{ type: 'var', fields: { name: 'n' } }], value: [{ type: 'num', fields: { value: 3 } }] } },
    { type: 'print', slots: { value: [{ type: 'var', fields: { name: 'n' } }] } },
  ]

  function withValues(first: number, second: number): CodeNode[] {
    return [
      { type: 'assign', slots: { target: [{ type: 'var', fields: { name: 'n' } }], value: [{ type: 'num', fields: { value: first } }] } },
      { type: 'assign', slots: { target: [{ type: 'var', fields: { name: 'n' } }], value: [{ type: 'num', fields: { value: second } }] } },
      { type: 'print', slots: { value: [{ type: 'var', fields: { name: 'n' } }] } },
    ]
  }

  it('flags editing the first assignment but leaving the last one unchanged', () => {
    expect(reassignmentEditedEarlierNotLast(withValues(9, 3), initial, 'n')).toBe(true)
  })

  it('does not flag the correct edit (only the last assignment changed)', () => {
    expect(reassignmentEditedEarlierNotLast(withValues(3, 9), initial, 'n')).toBe(false)
  })

  it('does not flag an untouched program', () => {
    expect(reassignmentEditedEarlierNotLast(withValues(3, 3), initial, 'n')).toBe(false)
  })

  it('does not flag when both lines were changed (last one is set)', () => {
    expect(reassignmentEditedEarlierNotLast(withValues(9, 7), initial, 'n')).toBe(false)
  })
})

describe('[L2] print-uses-variable guard helper', () => {
  const program = (printArg: CodeNode): CodeNode[] => [
    {
      type: 'assign',
      slots: {
        target: [{ type: 'var', fields: { name: 'word' } }],
        value: [{ type: 'str', fields: { value: 'Hello' } }],
      },
    },
    { type: 'print', slots: { value: [printArg] } },
  ]

  it('detects a print that uses the variable', () => {
    expect(printsVariable(program({ type: 'var', fields: { name: 'word' } }), 'word')).toBe(true)
  })

  it('does not count printing a string literal as using the variable', () => {
    expect(printsVariable(program({ type: 'str', fields: { value: 'Hello' } }), 'word')).toBe(false)
  })

  it('does not count printing a different variable name', () => {
    expect(printsVariable(program({ type: 'var', fields: { name: 'other' } }), 'word')).toBe(false)
  })
})
