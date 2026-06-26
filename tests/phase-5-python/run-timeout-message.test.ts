import { describe, it, expect } from 'vitest'
import { formatTimeoutMessage } from '../../src/lib/pyodide/runner'

// [runner] The learner-facing timeout message is shared by both run paths (the
// browser Web Worker hard-kill and the Node inline race), so it's worth pinning
// its wording and pluralization without needing a real Pyodide run.
describe('[runner] formatTimeoutMessage', () => {
  it('explains the likely cause (a loop that never stops)', () => {
    expect(formatTimeoutMessage(5000)).toMatch(/loop never stops/i)
    expect(formatTimeoutMessage(5000)).toMatch(/too long/i)
  })

  it('pluralizes seconds correctly', () => {
    expect(formatTimeoutMessage(1000)).toContain('over 1 second')
    expect(formatTimeoutMessage(1000)).not.toContain('1 seconds')
    expect(formatTimeoutMessage(5000)).toContain('over 5 seconds')
  })

  it('never reports less than one second', () => {
    expect(formatTimeoutMessage(200)).toContain('over 1 second')
  })
})
