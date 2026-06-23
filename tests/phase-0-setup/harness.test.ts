import { describe, it, expect } from 'vitest'

// [Phase 0] Test harness smoke test
// Feature under test: the Vitest + jsdom harness runs and DOM globals exist.
describe('[Phase 0] Test harness', () => {
  it('runs a basic assertion', () => {
    expect(1 + 1).toBe(2)
  })

  it('provides a jsdom document', () => {
    const el = document.createElement('div')
    el.textContent = 'ready'
    expect(el.textContent).toBe('ready')
  })
})
