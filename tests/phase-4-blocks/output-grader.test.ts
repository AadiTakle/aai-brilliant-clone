import { describe, it, expect } from 'vitest'
import { gradeOutput, normalizeOutput } from '../../src/lib/grading/outputGrader'

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
