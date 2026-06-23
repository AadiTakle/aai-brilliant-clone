import { describe, it, expect } from 'vitest'
import { compileToSource } from '../../src/lib/blocks/compiler'
import type { CodeNode } from '../../src/lib/blocks/definitions'

// [Phase 4] block -> Python compiler
describe('[Phase 4] compiler', () => {
  it('compiles a for-loop with a printed string body', () => {
    const program: CodeNode[] = [
      {
        type: 'for_range',
        fields: { var: 'i', count: 3 },
        slots: { body: [{ type: 'print_text', fields: { text: 'Hi' } }] },
      },
    ]
    expect(compileToSource(program)).toBe('for i in range(3):\n    print("Hi")')
  })

  it('compiles print_var and multiple body statements', () => {
    const program: CodeNode[] = [
      {
        type: 'for_range',
        fields: { var: 'i', count: 2 },
        slots: {
          body: [
            { type: 'print_text', fields: { text: 'A' } },
            { type: 'print_var', fields: { var: 'i' } },
          ],
        },
      },
    ]
    expect(compileToSource(program)).toBe('for i in range(2):\n    print("A")\n    print(i)')
  })

  it('emits `pass` for an empty loop body', () => {
    const program: CodeNode[] = [{ type: 'for_range', fields: { count: 2 } }]
    expect(compileToSource(program)).toBe('for i in range(2):\n    pass')
  })

  it('falls back to a comment for an unknown block type', () => {
    expect(compileToSource([{ type: 'mystery' }])).toBe('# unknown block: mystery')
  })
})
