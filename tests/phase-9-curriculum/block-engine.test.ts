import { describe, it, expect } from 'vitest'
import { compileToSource } from '../../src/lib/blocks/compiler'
import { BLOCK_DEFS } from '../../src/lib/blocks/definitions'
import type { CodeNode } from '../../src/lib/blocks/definitions'
import { comparesVariable, usesConditionalNode, usesLoopNode, usesModuloNode } from '../../src/lib/blocks/analysis'

const num = (value: number): CodeNode => ({ type: 'num', fields: { value } })
const str = (value: string): CodeNode => ({ type: 'str', fields: { value } })
const variable = (name = 'i'): CodeNode => ({ type: 'var', fields: { name } })
const range = (start: number, stop: number): CodeNode => ({
  type: 'range_call',
  slots: { start: [num(start)], stop: [num(stop)] },
})
const print = (value: CodeNode): CodeNode => ({ type: 'print', slots: { value: [value] } })
const binop = (left: CodeNode, op: string, right: CodeNode): CodeNode => ({
  type: 'binop',
  fields: { op },
  slots: { left: [left], right: [right] },
})
const compare = (left: CodeNode, op: string, right: CodeNode): CodeNode => ({
  type: 'compare',
  fields: { op },
  slots: { left: [left], right: [right] },
})
const assign = (target: CodeNode, value: CodeNode): CodeNode => ({
  type: 'assign',
  slots: { target: [target], value: [value] },
})
const ifBlock = (cond: CodeNode, body: CodeNode[]): CodeNode => ({
  type: 'if_block',
  slots: { cond: [cond], body },
})
const elseBlock = (body: CodeNode[]): CodeNode => ({ type: 'else_block', slots: { body } })
const forEach = (iter: CodeNode, body: CodeNode[]): CodeNode => ({
  type: 'for_each',
  slots: { var: [variable('i')], iter: [iter], body },
})

// [Phase 9] new block types compile to Python
describe('[Phase 9] block engine — new blocks', () => {
  it('compiles assignment', () => {
    expect(compileToSource([assign(variable('x'), num(0))])).toBe('x = 0')
  })

  it('compiles a comparison expression', () => {
    expect(compileToSource([print(compare(variable('i'), '==', num(0)))])).toBe('print(i == 0)')
  })

  it('compare block only offers the operators the curriculum teaches (==, >, <)', () => {
    const opField = BLOCK_DEFS.compare.fields?.find((f) => f.name === 'op')
    // Untaught comparators (!=, <=, >=) would only confuse a true beginner.
    expect(opField?.options).toEqual(['==', '>', '<'])
  })

  it('compiles a modulo expression', () => {
    expect(compileToSource([print(binop(variable('i'), '%', num(3)))])).toBe('print(i % 3)')
  })

  it('compiles single-argument range as a loop iterable', () => {
    const rangeN: CodeNode = { type: 'range_n', slots: { stop: [num(5)] } }
    expect(compileToSource([forEach(rangeN, [print(variable('i'))])])).toBe(
      'for i in range(5):\n    print(i)',
    )
  })

  it('compiles an if with an indented body', () => {
    const program = [ifBlock(compare(binop(variable('i'), '%', num(3)), '==', num(0)), [print(str('Fizz'))])]
    expect(compileToSource(program)).toBe('if i % 3 == 0:\n    print("Fizz")')
  })

  it('compiles else with a body', () => {
    expect(compileToSource([elseBlock([print(variable('i'))])])).toBe('else:\n    print(i)')
  })

  it('nests for -> if -> print to the correct cumulative indentation', () => {
    const program = [
      forEach(range(0, 3), [ifBlock(compare(binop(variable('i'), '%', num(2)), '==', num(0)), [print(variable('i'))])]),
    ]
    expect(compileToSource(program)).toBe(
      'for i in range(0, 3):\n    if i % 2 == 0:\n        print(i)',
    )
  })

  it('emits pass for an empty if body', () => {
    expect(compileToSource([ifBlock(compare(variable('i'), '>', num(0)), [])])).toBe(
      'if i > 0:\n    pass',
    )
  })
})

// [Phase 9] block AST detectors used by requiredConstructs
describe('[Phase 9] block analysis detectors', () => {
  const fizzish = [
    forEach(range(1, 4), [ifBlock(compare(binop(variable('i'), '%', num(3)), '==', num(0)), [print(str('Fizz'))])]),
  ]

  it('detects loops, conditionals, and modulo in a nested program', () => {
    expect(usesLoopNode(fizzish)).toBe(true)
    expect(usesConditionalNode(fizzish)).toBe(true)
    expect(usesModuloNode(fizzish)).toBe(true)
  })

  it('does not falsely detect constructs', () => {
    const plain = [print(str('hi'))]
    expect(usesLoopNode(plain)).toBe(false)
    expect(usesConditionalNode(plain)).toBe(false)
    expect(usesModuloNode(plain)).toBe(false)
    // a `+` binop is not modulo
    expect(usesModuloNode([print(binop(variable('a'), '+', variable('b')))])).toBe(false)
  })
})

// [Phase 9] comparesVariable — the "your yes/no question must test the box" guard
describe('[Phase 9] comparesVariable detector', () => {
  it('accepts a compare that tests the variable with the right op and literal (either side)', () => {
    expect(comparesVariable([print(compare(variable('remainder'), '==', num(0)))], 'remainder', '==', 0)).toBe(true)
    // order does not matter: 0 == remainder is just as valid
    expect(comparesVariable([print(compare(num(0), '==', variable('remainder')))], 'remainder', '==', 0)).toBe(true)
  })

  it('rejects a faked comparison that never references the variable (e.g. 0 == 0)', () => {
    expect(comparesVariable([print(compare(num(0), '==', num(0)))], 'remainder', '==', 0)).toBe(false)
  })

  it('rejects comparing the variable against the wrong literal or with the wrong operator', () => {
    expect(comparesVariable([print(compare(variable('remainder'), '==', num(1)))], 'remainder', '==', 0)).toBe(false)
    expect(comparesVariable([print(compare(variable('remainder'), '>', num(0)))], 'remainder', '==', 0)).toBe(false)
  })

  it('ignores op/against when they are not specified (variable presence is enough)', () => {
    expect(comparesVariable([print(compare(variable('remainder'), '>', num(5)))], 'remainder')).toBe(true)
    expect(comparesVariable([print(compare(variable('other'), '==', num(0)))], 'remainder')).toBe(false)
  })
})
