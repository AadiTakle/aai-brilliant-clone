import { describe, it, expect } from 'vitest'
import { getLesson, listLessons } from '../../src/content/loader'
import type { Lesson, Step } from '../../src/content/schemas'
import {
  usesConditionalSource,
  usesLoopSource,
  usesModuloSource,
} from '../../src/lib/grading/constructCheck'
import { FIZZBUZZPOP_REFERENCE } from './fixtures'

const EXPECTED_ORDER = [
  'l1-talking-to-the-computer',
  'l2-boxes-that-remember',
  'l3-doing-the-math',
  'l4-true-or-false',
  'l5-making-decisions',
  'over-and-over-again',
  'l7-loops-and-decisions',
  'l8-build-your-own-machine',
  'l9-fizzbuzzpop',
]

// --- structural helpers over a validated lesson -------------------------------

interface BlockNode {
  type: string
  fields?: Record<string, string | number>
  slots?: Record<string, BlockNode[]>
}

function collectBlockNodes(nodes: BlockNode[] | undefined, out: BlockNode[]) {
  for (const n of nodes ?? []) {
    out.push(n)
    for (const children of Object.values(n.slots ?? {})) collectBlockNodes(children, out)
  }
}

function lessonBlockNodes(lesson: Lesson): BlockNode[] {
  const out: BlockNode[] = []
  for (const step of lesson.steps) {
    if (step.type === 'block_problem') collectBlockNodes(step.config.initial as BlockNode[], out)
  }
  return out
}

// All block types a lesson teaches, from both palettes and preset programs.
function lessonBlockTypes(lesson: Lesson): Set<string> {
  const set = new Set<string>()
  for (const step of lesson.steps) {
    if (step.type !== 'block_problem') continue
    step.config.palette.forEach((t) => set.add(t))
    const nodes: BlockNode[] = []
    collectBlockNodes(step.config.initial as BlockNode[], nodes)
    nodes.forEach((n) => set.add(n.type))
  }
  return set
}

function lessonWidgets(lesson: Lesson): string[] {
  const widgets: string[] = []
  for (const step of lesson.steps) {
    if (step.type !== 'article') continue
    for (const panel of step.config.panels) {
      if (panel.activity?.kind === 'widget') widgets.push(panel.activity.widget)
    }
  }
  return widgets
}

function lessonPythonSource(lesson: Lesson): string {
  return lesson.steps
    .filter((s): s is Extract<Step, { type: 'python_sandbox' }> => s.type === 'python_sandbox')
    .map((s) => s.config.starterCode + '\n' + s.config.testCases.map((t) => t.expectedStdout).join('\n'))
    .join('\n')
}

function hasBinop(nodes: BlockNode[], op: string): boolean {
  return nodes.some((n) => n.type === 'binop' && n.fields?.op === op)
}

function getLessonOrThrow(id: string): Lesson {
  const lesson = getLesson(id)
  if (!lesson) throw new Error(`missing lesson: ${id}`)
  return lesson
}

describe('[Phase 9] curriculum ordering + capstone contract', () => {
  it('registers all nine lessons in the intended order', () => {
    expect(listLessons().map((l) => l.id)).toEqual(EXPECTED_ORDER)
  })

  it('the reference FizzBuzzPop solution uses a loop, modulo, and a conditional', () => {
    expect(usesLoopSource(FIZZBUZZPOP_REFERENCE)).toBe(true)
    expect(usesModuloSource(FIZZBUZZPOP_REFERENCE)).toBe(true)
    expect(usesConditionalSource(FIZZBUZZPOP_REFERENCE)).toBe(true)
  })

  it('the capstone step enforces every required construct and is graded', () => {
    const capstone = getLessonOrThrow('l9-fizzbuzzpop')
    const step = capstone.steps.find((s) => s.id === 'capstone')
    expect(step?.type).toBe('python_sandbox')
    if (step?.type !== 'python_sandbox') throw new Error('capstone is not a python sandbox')
    expect(step.graded).toBe(true)
    expect(step.config.requiredConstructs.sort()).toEqual(['conditional', 'loop', 'modulo'])
    expect(step.config.testCases.length).toBeGreaterThan(0)
  })
})

// Every row of the coverage matrix maps to a lesson that introduces it. If a
// lesson is renamed/removed or a teaching block is dropped, the matching
// assertion fails — protecting the "taught before the capstone" guarantee.
describe('[Phase 9] capstone coverage matrix → lessons', () => {
  it('L1 introduces print(), string literals, and expression-as-argument', () => {
    const l1 = getLessonOrThrow('l1-talking-to-the-computer')
    expect(lessonBlockTypes(l1).has('print')).toBe(true)
    expect(lessonWidgets(l1)).toContain('function_machine')
    expect(lessonPythonSource(l1)).toContain('print(2 + 3)')
  })

  it('L2 introduces variables (assign) and int-vs-string', () => {
    const l2 = getLessonOrThrow('l2-boxes-that-remember')
    expect(lessonBlockTypes(l2).has('assign')).toBe(true)
    expect(lessonWidgets(l2)).toContain('variable_box')
    expect(lessonWidgets(l2)).toContain('type_sorter')
  })

  it('L3 introduces % (modulo) and string + string concatenation', () => {
    const l3 = getLessonOrThrow('l3-doing-the-math')
    const nodes = lessonBlockNodes(l3)
    expect(hasBinop(nodes, '%')).toBe(true)
    expect(hasBinop(nodes, '+')).toBe(true)
    expect(lessonWidgets(l3)).toContain('remainder_machine')
  })

  it('L4 introduces comparisons producing booleans', () => {
    const l4 = getLessonOrThrow('l4-true-or-false')
    expect(lessonBlockTypes(l4).has('compare')).toBe(true)
    expect(lessonWidgets(l4)).toContain('comparison_explorer')
  })

  it('L5 introduces if/else and a Parsons reordering', () => {
    const l5 = getLessonOrThrow('l5-making-decisions')
    const types = lessonBlockTypes(l5)
    expect(types.has('if_block')).toBe(true)
    expect(types.has('else_block')).toBe(true)
    expect(l5.steps.some((s) => s.type === 'parsons_problem')).toBe(true)
  })

  it('L6 introduces loops and range with an expression argument', () => {
    const l6 = getLessonOrThrow('over-and-over-again')
    const nodes = lessonBlockNodes(l6)
    expect(lessonBlockTypes(l6).has('for_each')).toBe(true)
    // range(1, n + 1): a range_call whose stop slot contains a binop.
    const rangeWithExpr = nodes.some(
      (n) => n.type === 'range_call' && (n.slots?.stop ?? []).some((c) => c.type === 'binop'),
    )
    expect(rangeWithExpr).toBe(true)
  })

  it('L7 introduces the accumulator pattern (label = label + "Fizz")', () => {
    const l7 = getLessonOrThrow('l7-loops-and-decisions')
    const nodes = lessonBlockNodes(l7)
    // an assign whose value is a binop '+' that reads a variable (accumulator)
    const accumulator = nodes.some(
      (n) =>
        n.type === 'assign' &&
        (n.slots?.value ?? []).some(
          (v) => v.type === 'binop' && v.fields?.op === '+' && (v.slots?.left ?? []).some((l) => l.type === 'var'),
        ),
    )
    expect(accumulator).toBe(true)
    expect(lessonWidgets(l7)).toContain('code_tracer')
  })

  it('L8 introduces def/return functions', () => {
    const l8 = getLessonOrThrow('l8-build-your-own-machine')
    const src = lessonPythonSource(l8)
    expect(src).toContain('def ')
    expect(src).toContain('return')
  })
})
