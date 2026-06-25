import { describe, it, expect } from 'vitest'
import { getLesson } from '../../src/content/loader'
import type { Lesson, Step } from '../../src/content/schemas'

function l1(): Lesson {
  const lesson = getLesson('l1-talking-to-the-computer')
  if (!lesson) throw new Error('missing lesson: l1-talking-to-the-computer')
  return lesson
}

function stepById(id: string): Step {
  const step = l1().steps.find((s) => s.id === id)
  if (!step) throw new Error(`missing step: ${id}`)
  return step
}

describe('[L1] rehaul — talking to the computer', () => {
  it('keeps the lesson id stable', () => {
    expect(l1().id).toBe('l1-talking-to-the-computer')
  })

  // 1.1 — print is a function: input → machine → output, shown via function_machine.
  it('intro teaches print as a function via the function_machine widget', () => {
    const intro = stepById('intro')
    expect(intro.type).toBe('article')
    if (intro.type !== 'article') return
    const widgets = intro.config.panels.flatMap((p) =>
      p.activity?.kind === 'widget' ? [p.activity.widget] : [],
    )
    expect(widgets).toContain('function_machine')
  })

  // GLOBAL RULE: incorrect-answer feedback must never reveal the answer.
  it('checkpoint feedback guides without ever giving the answer outright', () => {
    const intro = stepById('intro')
    if (intro.type !== 'article') throw new Error('intro is not an article')
    const checkpoints = intro.config.panels.flatMap((p) =>
      p.activity?.kind === 'checkpoint' ? [p.activity] : [],
    )
    expect(checkpoints.length).toBeGreaterThan(0)
    for (const c of checkpoints) {
      const correctChoice = c.choices[c.answerIndex]
      const incorrect = (c.feedback?.incorrect ?? '').toLowerCase()
      // The literal correct option must not appear in the wrong-answer feedback.
      expect(incorrect).not.toContain(correctChoice.toLowerCase())
      expect(incorrect).not.toContain('print("hello")')
    }
  })

  // 1.2 — introduce dragging/dropping a function block into the program.
  it('block problem keeps a print block in the palette and stays graded', () => {
    const step = stepById('print-a-string')
    expect(step.type).toBe('block_problem')
    if (step.type !== 'block_problem') return
    expect(step.config.palette).toContain('print')
    expect(step.config.expectedOutput).toBeTruthy()
  })

  it('block problem 1.2 opts into lenient ("close enough") grading', () => {
    const step = stepById('print-a-string')
    if (step.type !== 'block_problem') throw new Error('not a block problem')
    expect(step.config.lenient).toBe(true)
  })

  // 1.3 — first typed program: output "Hello World!", answer not pre-filled.
  it('first typed program prints "Hello World!" and is not pre-filled with the answer', () => {
    const step = stepById('first-program')
    expect(step.type).toBe('python_sandbox')
    if (step.type !== 'python_sandbox') return
    expect(step.config.testCases.length).toBeGreaterThan(0)
    expect(step.config.testCases[0].expectedStdout).toBe('Hello World!')
    // Starter code must not hand the learner the answer (global no-answer rule).
    expect(step.config.starterCode).not.toContain('Hello World!')
    expect(step.config.starterCode).not.toMatch(/print\s*\(/)
  })

  it('first typed program 1.3 is lenient and has an encouraging success message', () => {
    const step = stepById('first-program')
    if (step.type !== 'python_sandbox') throw new Error('not a python sandbox')
    expect(step.config.lenient).toBe(true)
    expect(step.config.successMessage).toBeTruthy()
    // Success message must celebrate the milestone but not contain the answer.
    expect((step.config.successMessage ?? '').toLowerCase()).not.toContain('hello world')
  })

  it('no graded feedback in L1 reveals the literal answer', () => {
    for (const step of l1().steps) {
      if (step.type !== 'python_sandbox') continue
      for (const tc of step.config.testCases) {
        expect((tc.feedback ?? '').toLowerCase()).not.toContain('hello world')
      }
    }
  })
})
