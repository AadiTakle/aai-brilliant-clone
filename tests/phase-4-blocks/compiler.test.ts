import { describe, it, expect } from 'vitest'
import { compileToSource } from '../../src/lib/blocks/compiler'
import type { CodeNode } from '../../src/lib/blocks/definitions'

const num = (value: number): CodeNode => ({ type: 'num', fields: { value } })
const str = (value: string): CodeNode => ({ type: 'str', fields: { value } })
const variable = (name = 'i'): CodeNode => ({ type: 'var', fields: { name } })
const range = (start: number, stop: number): CodeNode => ({
  type: 'range_call',
  slots: { start: [num(start)], stop: [num(stop)] },
})
const forEach = (iter: CodeNode, body: CodeNode[]): CodeNode => ({
  type: 'for_each',
  slots: { var: [variable('i')], iter: [iter], body },
})
const print = (value: CodeNode): CodeNode => ({ type: 'print', slots: { value: [value] } })

// [Phase 4] block -> Python compiler (nested expression blocks)
describe('[Phase 4] compiler', () => {
  it('compiles a for-loop with a printed string body', () => {
    const program: CodeNode[] = [forEach(range(0, 3), [print(str('Hi'))])]
    expect(compileToSource(program)).toBe('for i in range(0, 3):\n    print("Hi")')
  })

  it('compiles multiple body statements', () => {
    const program: CodeNode[] = [forEach(range(0, 2), [print(str('A')), print(variable('i'))])]
    expect(compileToSource(program)).toBe('for i in range(0, 2):\n    print("A")\n    print(i)')
  })

  it('emits `pass` for an empty loop body', () => {
    const program: CodeNode[] = [forEach(range(0, 2), [])]
    expect(compileToSource(program)).toBe('for i in range(0, 2):\n    pass')
  })

  it('compiles empty expression slots to a sentinel', () => {
    const program: CodeNode[] = [{ type: 'print', slots: { value: [] } }]
    expect(compileToSource(program)).toBe('print(__?__)')
  })

  it('falls back to a comment for an unknown block type', () => {
    expect(compileToSource([{ type: 'mystery' }])).toBe('# unknown block: mystery')
  })
})
