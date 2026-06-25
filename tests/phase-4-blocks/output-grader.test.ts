import { describe, it, expect } from 'vitest'
import { gradeOutput, normalizeOutput, normalizeLenient } from '../../src/lib/grading/outputGrader'

// [Phase 4] stdout output grader
describe('[Phase 4] output grader', () => {
  it('passes on an exact match', () => {
    expect(gradeOutput('Hi\nHi\n', 'Hi\nHi').correct).toBe(true)
  })

  it('tolerates trailing whitespace and trailing newlines', () => {
    expect(gradeOutput('0\n1\n2\n\n', '0\n1\n2').correct).toBe(true)
    expect(gradeOutput('Hi   \n', 'Hi').correct).toBe(true)
  })

  it('fails on a real difference', () => {
    expect(gradeOutput('Hi\nHi\nHi', 'Hi\nHi').correct).toBe(false)
  })

  it('normalizes CRLF and outer blank lines', () => {
    expect(normalizeOutput('\r\nHi\r\n')).toBe('Hi')
  })
})

// Opt-in lenient ("close enough") matching for beginner steps.
describe('[L1] lenient output matching', () => {
  it('strict mode (default) is case- and punctuation-sensitive', () => {
    expect(gradeOutput('hello world', 'Hello World!').correct).toBe(false)
  })

  it('lenient mode ignores case, surrounding whitespace, and trailing punctuation', () => {
    expect(gradeOutput('hello world', 'Hello World!', { lenient: true }).correct).toBe(true)
    expect(gradeOutput('   HELLO   WORLD!!!  ', 'Hello World!', { lenient: true }).correct).toBe(true)
    expect(gradeOutput('good morning', 'Good morning!', { lenient: true }).correct).toBe(true)
  })

  it('lenient mode still fails a genuinely wrong answer', () => {
    expect(gradeOutput('good evening', 'Good morning!', { lenient: true }).correct).toBe(false)
    // An empty output is never "close enough".
    expect(gradeOutput('', 'Hello World!', { lenient: true }).correct).toBe(false)
  })

  it('normalizeLenient lowercases, collapses spaces, and strips trailing punctuation', () => {
    expect(normalizeLenient('  Hello   World!  ')).toBe('hello world')
  })
})
