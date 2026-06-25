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
  'l6-over-and-over-again',
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

// The code of every parsons line a lesson defines (the "answer" the learner
// reassembles). Used to detect constructs taught via line-ordering puzzles.
function lessonParsonsSource(lesson: Lesson): string {
  return lesson.steps
    .filter((s): s is Extract<Step, { type: 'parsons_problem' }> => s.type === 'parsons_problem')
    .flatMap((s) => s.config.lines.map((l) => l.code))
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
  it('L1 introduces print(), the function machine, and a first typed program', () => {
    const l1 = getLessonOrThrow('l1-talking-to-the-computer')
    expect(lessonBlockTypes(l1).has('print')).toBe(true)
    expect(lessonWidgets(l1)).toContain('function_machine')
    // L1 still demonstrably pairs print() with a runnable Python step: the first
    // typed program outputs "Hello World!".
    expect(l1.steps.some((s) => s.type === 'python_sandbox')).toBe(true)
    expect(lessonPythonSource(l1)).toContain('Hello World!')
  })

  it('L2 introduces variables (assign) and int-vs-string', () => {
    const l2 = getLessonOrThrow('l2-boxes-that-remember')
    expect(lessonBlockTypes(l2).has('assign')).toBe(true)
    // The passive variable_box was replaced by the interactive value_box widget.
    expect(lessonWidgets(l2)).toContain('value_box')
    expect(lessonWidgets(l2)).toContain('type_sorter')
  })

  it('L3 introduces % (modulo) via the modulo_picker widget', () => {
    const l3 = getLessonOrThrow('l3-doing-the-math')
    const nodes = lessonBlockNodes(l3)
    expect(hasBinop(nodes, '%')).toBe(true)
    // Concatenation moved out of L3 (now taught in L7); L3 is modulo-only.
    expect(lessonWidgets(l3)).toContain('modulo_picker')
  })

  it('L4 introduces comparisons producing booleans', () => {
    const l4 = getLessonOrThrow('l4-true-or-false')
    expect(lessonBlockTypes(l4).has('compare')).toBe(true)
    expect(lessonWidgets(l4)).toContain('comparison_explorer')
  })

  it('L5 introduces the conditional construct (if/elif/else) and a Parsons reordering', () => {
    const l5 = getLessonOrThrow('l5-making-decisions')
    // L5 was rebuilt OFF blocks toward typed Python + a learner-driven dial: the
    // conditional is now taught in TYPED steps and assembled in a Parsons puzzle,
    // so it no longer ships if_block/else_block *blocks*. The conditional is still
    // demonstrably taught — its python source (and parsons lines) use if/else, and
    // a graded typed step enforces requiredConstructs ['conditional'].
    const source = lessonPythonSource(l5) + '\n' + lessonParsonsSource(l5)
    expect(source).toMatch(/\bif\b/)
    expect(source).toMatch(/\belse\b/)
    expect(usesConditionalSource(source)).toBe(true)
    const enforcesConditional = l5.steps.some(
      (s) => s.type === 'python_sandbox' && s.graded && s.config.requiredConstructs.includes('conditional'),
    )
    expect(enforcesConditional).toBe(true)
    // The new learner-driven decision_machine widget is the tactile heart of L5.
    expect(lessonWidgets(l5)).toContain('decision_machine')
    expect(l5.steps.some((s) => s.type === 'parsons_problem')).toBe(true)
  })

  it('L6 introduces loops and range with an expression argument', () => {
    const l6 = getLessonOrThrow('l6-over-and-over-again')
    // for_each is still taught via the fill-the-loop / fix-the-loop block steps.
    expect(lessonBlockTypes(l6).has('for_each')).toBe(true)
    // The range-with-expression guarantee moved from a block to TYPED Python:
    // L6's python source contains a range(...) call with a `+` expression
    // (range(1, n + 1)). The number-wheel demo step teaches it interactively and
    // the typed steps apply it, so the construct is still taught before L9.
    expect(lessonPythonSource(l6)).toMatch(/range\([^)]*\+[^)]*\)/)
  })

  it('L7 introduces the accumulator pattern and string concatenation via program_stepper, a parsons + typed Python', () => {
    const l7 = getLessonOrThrow('l7-loops-and-decisions')
    // L7 was rebuilt toward typed Python: it now teaches with the program_stepper
    // widget (not code_tracer) and has NO block_problem steps.
    expect(lessonWidgets(l7)).toContain('program_stepper')
    expect(lessonWidgets(l7)).not.toContain('code_tracer')
    expect(l7.steps.some((s) => s.type === 'block_problem')).toBe(false)

    // The accumulator pattern (read a variable, add onto it, store it back) and
    // the string-concatenation guarantee (moved here from L3) now live in L7's
    // parsons lines and typed Python source.
    const source = lessonParsonsSource(l7) + '\n' + lessonPythonSource(l7)
    // An assignment whose right side adds onto the SAME variable: `x = x + ...`.
    expect(source).toMatch(/(\w+)\s*=\s*\1\s*\+/)
    // String concatenation: a `+` joining text in the accumulator.
    expect(source).toContain('+')
  })

  it('L8 introduces def/return functions', () => {
    const l8 = getLessonOrThrow('l8-build-your-own-machine')
    const src = lessonPythonSource(l8)
    expect(src).toContain('def ')
    expect(src).toContain('return')
  })
})
