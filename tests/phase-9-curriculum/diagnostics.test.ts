import { describe, it, expect } from 'vitest'
import { diagnose } from '../../src/lib/grading/diagnostics'

// [Phase 9] new diagnostics for conditionals / comparisons
describe('[Phase 9] diagnostics', () => {
  it('flags a missing colon from the source on a syntax error', () => {
    const hint = diagnose({ stderr: 'SyntaxError: invalid syntax', source: 'if x == 0\n    print(x)' })
    expect(hint).toMatch(/colon/i)
  })

  it('flags a missing colon directly from a modern Python message', () => {
    expect(diagnose({ stderr: "SyntaxError: expected ':'" })).toMatch(/colon/i)
  })

  it('flags = vs == inside a condition', () => {
    const hint = diagnose({ stderr: 'SyntaxError: invalid syntax', source: 'if x = 0:\n    print(x)' })
    expect(hint).toMatch(/==/)
  })

  it('does not confuse a correct == with assignment', () => {
    // No syntax error here; an output mismatch should not yield the == hint.
    const hint = diagnose({ stderr: 'SyntaxError: invalid syntax', source: 'if x == 0:\n    print(' })
    expect(hint).not.toMatch(/single `=`/)
  })

  it('flags elif/else with no preceding if', () => {
    const hint = diagnose({ stderr: 'SyntaxError: invalid syntax', source: 'else:\n    print(1)' })
    expect(hint).toMatch(/else/i)
  })

  it('explains comparing different types', () => {
    const hint = diagnose({
      stderr: "TypeError: '<' not supported between instances of 'str' and 'int'",
    })
    expect(hint).toMatch(/different types/i)
  })

  it('still handles indentation errors', () => {
    expect(diagnose({ stderr: 'IndentationError: expected an indented block' })).toMatch(/indent/i)
  })
})
