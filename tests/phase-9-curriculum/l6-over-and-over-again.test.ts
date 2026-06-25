import { describe, it, expect } from 'vitest'
import { getLesson } from '../../src/content/loader'
import type { Lesson, Step } from '../../src/content/schemas'

function l6(): Lesson {
  const lesson = getLesson('l6-over-and-over-again')
  if (!lesson) throw new Error('missing lesson: l6-over-and-over-again')
  return lesson
}

function stepById(id: string): Step | undefined {
  return l6().steps.find((s) => s.id === id)
}

function widgetsOf(step: Step | undefined): string[] {
  if (!step || step.type !== 'article') return []
  return step.config.panels.flatMap((p) => (p.activity?.kind === 'widget' ? [p.activity.widget] : []))
}

function articleText(step: Step | undefined): string {
  if (!step || step.type !== 'article') return ''
  return step.config.panels.map((p) => p.text ?? '').join(' ')
}

function widgetConfig(step: Step | undefined, widget: string): Record<string, unknown> | undefined {
  if (!step || step.type !== 'article') return undefined
  for (const p of step.config.panels) {
    if (p.activity?.kind === 'widget' && p.activity.widget === widget) {
      return (p.activity as { config: Record<string, unknown> }).config
    }
  }
  return undefined
}

describe('[L6] rehaul — Over and Over Again', () => {
  it('keeps the lesson id, title, and registration position stable', () => {
    expect(l6().id).toBe('l6-over-and-over-again')
    expect(l6().title).toBe('Over and Over Again')
  })

  it('drops the old typed/observe/input steps that were merged away', () => {
    for (const id of ['loop-it-yourself', 'now-you-type-it', 'count-1-to-5', 'repeat-n-times', 'count-to-n']) {
      expect(stepById(id)).toBeUndefined()
    }
  })

  it('has the rebuilt step order: intro → for-loop syntax cluster → fill/fix → demo → typed loops', () => {
    expect(l6().steps.map((s) => s.id)).toEqual([
      'intro',
      'for-loop-syntax',
      'fix-the-loop-indent',
      'fill-the-loop',
      'fix-the-loop',
      'count-with-n',
      'print-hi-loop',
      'count-1-to-n',
    ])
  })

  it('GLOBAL RULE: no failure feedback hands over the loop solution', () => {
    // Stating the goal text in a prompt is fine; spelling out the construction
    // (a finished for/range loop) in failure feedback is not.
    for (const s of l6().steps) {
      if (s.type !== 'python_sandbox') continue
      for (const tc of s.config.testCases) {
        const fb = (tc.feedback ?? '').toLowerCase()
        expect(fb).not.toMatch(/for\s+\w+\s+in\s+range/)
        expect(fb).not.toMatch(/range\(\s*1\s*,\s*n\s*\+\s*1\s*\)/)
      }
    }
  })

  // --- NEW 6.2: for-loop SYNTAX as three beats + assemble ---------------------
  describe('6.2 — for-loop syntax (variable, range, indentation, assemble)', () => {
    const syntax = () => {
      const s = stepById('for-loop-syntax')
      if (!s || s.type !== 'article') throw new Error('for-loop-syntax missing/not article')
      return s
    }

    it('is an article inserted right after the intro and before fill-the-loop', () => {
      const ids = l6().steps.map((s) => s.id)
      expect(ids.indexOf('for-loop-syntax')).toBe(ids.indexOf('intro') + 1)
      expect(ids.indexOf('for-loop-syntax')).toBeLessThan(ids.indexOf('fill-the-loop'))
      expect(syntax().type).toBe('article')
    })

    it('(a) the loop VARIABLE beat steps a real loop so i visibly takes each value', () => {
      const cfg = widgetConfig(syntax(), 'program_stepper')
      expect(cfg).toBeTruthy()
      expect(cfg!.mode).toBe('loop')
      // No accumulator → the body is print(i), so i itself is on show.
      expect(cfg!.accumulator).toBeUndefined()
    })

    it('(b) the RANGE beat reuses the number wheel (range_machine) to build range(n) → 0..n-1', () => {
      const cfg = widgetConfig(syntax(), 'range_machine')
      expect(cfg).toBeTruthy()
      // The range beat is the simple range(n) form (start 0, no +1).
      expect(cfg!.plusOne ?? false).toBe(false)
    })

    it('teaches indentation in prose and bridges from 6.1 (mentions the for-line spelling)', () => {
      const text = articleText(syntax()).toLowerCase()
      expect(text).toMatch(/indent|spaces/)
      expect(text).toContain('range')
      expect(text).toMatch(/\bi\b/)
    })

    it('(assemble) ends with a comprehension check labeling the parts of the for-line', () => {
      const hasCheckpoint = syntax().config.panels.some((p) => p.activity?.kind === 'checkpoint')
      expect(hasCheckpoint).toBe(true)
    })
  })

  // --- NEW 6.2c: the indentation fix-the-bug (L5 pattern) ---------------------
  describe('6.2c — fix-the-loop-indent (typed indentation fix)', () => {
    const step = () => {
      const s = stepById('fix-the-loop-indent')
      if (!s || s.type !== 'python_sandbox') throw new Error('fix-the-loop-indent missing')
      return s
    }

    it('is a graded python sandbox whose starter body is flush-left (will IndentationError)', () => {
      const code = step().config.starterCode
      // The for-header is present and its body line is NOT indented in the starter.
      expect(code).toMatch(/^for .*range\(.*\):$/m)
      expect(code).toMatch(/^print\(/m)
      expect(step().config.testCases.length).toBeGreaterThan(0)
    })

    it('requires a loop and offers an encouraging success message', () => {
      const c = step().config
      const requiresLoop = c.requireLoop || c.requiredConstructs.includes('loop')
      expect(requiresLoop).toBe(true)
      expect(c.successMessage).toBeTruthy()
    })

    it('its failure feedback nudges toward indentation without giving the fixed code', () => {
      const fb = step().config.testCases.map((t) => t.feedback ?? '').join(' ').toLowerCase()
      expect(fb).toMatch(/indent|spaces|inside/)
    })

    it('no input() — input handling is abstracted away', () => {
      expect(step().config.starterCode).not.toContain('input(')
    })
  })

  // --- 6.3 / 6.4 unchanged grading behavior ----------------------------------
  describe('fill-the-loop / fix-the-loop keep their grading behavior', () => {
    it('fill-the-loop still grades to five Hellos with a loop', () => {
      const s = stepById('fill-the-loop')
      if (!s || s.type !== 'block_problem') throw new Error('fill-the-loop missing')
      expect(s.config.mode).toBe('fill_blank')
      expect(s.config.expectedOutput).toBe('Hello!\nHello!\nHello!\nHello!\nHello!')
      expect(s.config.requireLoop).toBe(true)
    })

    it('fix-the-loop still grades to 0..4 with a loop', () => {
      const s = stepById('fix-the-loop')
      if (!s || s.type !== 'block_problem') throw new Error('fix-the-loop missing')
      expect(s.config.mode).toBe('bugfix')
      expect(s.config.expectedOutput).toBe('0\n1\n2\n3\n4')
      expect(s.config.requireLoop).toBe(true)
    })
  })

  // --- 6.5: count-with-n is now a dedicated range-collapse DEMO ---------------
  describe('6.5 — count-with-n repurposed into the range-collapse demo', () => {
    const demo = () => {
      const s = stepById('count-with-n')
      if (!s || s.type !== 'article') throw new Error('count-with-n should now be an article demo')
      return s
    }

    it('is an article (no longer a graded block problem)', () => {
      expect(demo().type).toBe('article')
    })

    it('uses the range_machine widget in collapse mode (range(1, n + 1))', () => {
      const cfg = widgetConfig(demo(), 'range_machine')
      expect(cfg).toBeTruthy()
      expect(cfg!.plusOne).toBe(true)
      expect(cfg!.start).toBe(1)
    })

    it('its prose frames the expression collapsing to one value before the loop runs', () => {
      const text = articleText(demo()).toLowerCase()
      expect(text).toMatch(/before the loop|collapse|works out|single (value|number)/)
    })
  })

  // --- 6.6: one typed-from-scratch loop printing "Hi" ------------------------
  describe('6.6 — print-hi-loop (write a loop from scratch)', () => {
    const step = () => {
      const s = stepById('print-hi-loop')
      if (!s || s.type !== 'python_sandbox') throw new Error('print-hi-loop missing')
      return s
    }

    it('is graded, requires a loop, and prints "Hi" a fixed number of times (no input)', () => {
      const c = step().config
      expect(c.testCases.length).toBeGreaterThan(0)
      expect(c.testCases[0].expectedStdout).toBe('Hi\nHi\nHi\nHi')
      const requiresLoop = c.requireLoop || c.requiredConstructs.includes('loop')
      expect(requiresLoop).toBe(true)
      expect(c.starterCode).not.toContain('input(')
      // From scratch: the starter must not already contain a finished loop.
      expect(c.starterCode).not.toMatch(/for\s+\w+\s+in\s+range/)
    })

    it('has an encouraging success message and answer-free failure feedback', () => {
      const c = step().config
      expect(c.successMessage).toBeTruthy()
      const fb = (c.testCases[0].feedback ?? '').toLowerCase()
      expect(fb).not.toContain('range(4)')
    })
  })

  // --- 6.7: count from 1 to n with input abstracted away ---------------------
  describe('6.7 — count-1-to-n (loop construction, n is given)', () => {
    const step = () => {
      const s = stepById('count-1-to-n')
      if (!s || s.type !== 'python_sandbox') throw new Error('count-1-to-n missing')
      return s
    }

    it('provides n as a given variable (no input/int(input)) and grades 1..n', () => {
      const c = step().config
      expect(c.starterCode).toMatch(/^n\s*=\s*\d+/m)
      expect(c.starterCode).not.toContain('input(')
      expect(c.testCases[0].expectedStdout).toBe('1\n2\n3\n4\n5')
      const requiresLoop = c.requireLoop || c.requiredConstructs.includes('loop')
      expect(requiresLoop).toBe(true)
    })
  })

  // --- coverage contract still satisfied -------------------------------------
  it('still teaches a for_each block (fill/fix) and range(1, n + 1) in typed python', () => {
    const json = JSON.stringify(l6().steps)
    expect(json).toContain('"for_each"')
    // range with an expression argument now lives in typed source.
    const pySource = l6()
      .steps.filter((s): s is Extract<Step, { type: 'python_sandbox' }> => s.type === 'python_sandbox')
      .map((s) => s.config.starterCode)
      .join('\n')
    expect(pySource).toMatch(/range\([^)]*\+[^)]*\)/)
  })
})
