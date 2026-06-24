import { describe, it, expect } from 'vitest'
import { usesLoopNode } from '../../src/lib/blocks/analysis'
import { usesLoopSource } from '../../src/lib/grading/loopCheck'
import type { CodeNode } from '../../src/lib/blocks/definitions'

// [Phase 8] loop detection for the "must use a loop" rule
describe('[Phase 8] usesLoopNode (blocks)', () => {
  it('finds a loop at the top level', () => {
    const program: CodeNode[] = [
      { type: 'for_each', slots: { var: [], iter: [], body: [] } },
    ]
    expect(usesLoopNode(program)).toBe(true)
  })

  it('finds a loop nested inside another block slot', () => {
    const program: CodeNode[] = [
      {
        type: 'for_each',
        slots: {
          var: [{ type: 'var', fields: { name: 'i' } }],
          iter: [],
          body: [{ type: 'for_each', slots: { var: [], iter: [], body: [] } }],
        },
      },
    ]
    expect(usesLoopNode(program)).toBe(true)
  })

  it('returns false when there is no loop (just prints)', () => {
    const program: CodeNode[] = [
      { type: 'print', slots: { value: [{ type: 'str', fields: { value: 'Hi' } }] } },
      { type: 'print', slots: { value: [{ type: 'str', fields: { value: 'Hi' } }] } },
    ]
    expect(usesLoopNode(program)).toBe(false)
  })
})

describe('[Phase 8] usesLoopSource (python)', () => {
  it('detects a for loop', () => {
    expect(usesLoopSource('for i in range(3):\n    print(i)')).toBe(true)
  })

  it('detects a while loop', () => {
    expect(usesLoopSource('n = 0\nwhile n < 3:\n    n += 1')).toBe(true)
  })

  it('ignores `for` inside a string literal', () => {
    expect(usesLoopSource('print("for")\nprint("while")')).toBe(false)
  })

  it('ignores `for` inside a comment', () => {
    expect(usesLoopSource('# use a for loop here\nprint("Hi")')).toBe(false)
  })

  it('returns false for stacked prints', () => {
    expect(usesLoopSource('print("Hi")\nprint("Hi")\nprint("Hi")')).toBe(false)
  })
})
