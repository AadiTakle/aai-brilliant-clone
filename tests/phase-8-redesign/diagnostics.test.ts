import { describe, it, expect } from 'vitest'
import { diagnose } from '../../src/lib/grading/diagnostics'

// [Phase 8] tailored failure hints
describe('[Phase 8] diagnose', () => {
  it('flags a missing quote from an unterminated-string error', () => {
    const hint = diagnose({ stderr: 'SyntaxError: unterminated string literal (detected at line 1)' })
    expect(hint).toMatch(/quote/i)
  })

  it('flags bad indentation', () => {
    const hint = diagnose({ stderr: 'IndentationError: expected an indented block' })
    expect(hint).toMatch(/indent/i)
  })

  it('extracts the undefined name from a NameError', () => {
    const hint = diagnose({ stderr: "NameError: name 'cont' is not defined" })
    expect(hint).toContain('cont')
  })

  it('detects an off-by-one when the sequence is one too long', () => {
    const hint = diagnose({ expected: '1\n2\n3\n4\n5', actual: '1\n2\n3\n4\n5\n6' })
    expect(hint).toMatch(/off by one/i)
  })

  it('detects an off-by-one when the numbers start one too high', () => {
    const hint = diagnose({ expected: '0\n1\n2', actual: '1\n2\n3' })
    expect(hint).toMatch(/off by one/i)
  })

  it('detects a line-count off-by-one for non-numeric output', () => {
    const hint = diagnose({ expected: 'Hi\nHi\nHi', actual: 'Hi\nHi\nHi\nHi' })
    expect(hint).toMatch(/one line too many/i)
  })

  it('returns null when nothing specific applies', () => {
    expect(diagnose({ expected: 'apple\nbanana', actual: 'cherry\ndurian' })).toBeNull()
  })
})
