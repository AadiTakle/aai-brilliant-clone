import { describe, it, expect, beforeAll } from 'vitest'
import { loadPyodideRunner, runPython, DEFAULT_RUN_TIMEOUT_MS } from '../../src/lib/pyodide/runner'

// [runner] Every Python run is bounded by a default wall-clock timeout. These run
// under real Python (`npm run test:pyodide`) on the Node inline path, so we use an
// async-yielding program the promise race can interrupt. In the browser, runs go
// through a Web Worker that is terminated on timeout, which additionally hard-kills
// non-yielding busy loops (`while True: pass`) — not exercisable from Node here.
describe('[runner] Python run timeout', () => {
  beforeAll(async () => {
    await loadPyodideRunner()
  })

  it('exposes a 5-second default budget', () => {
    expect(DEFAULT_RUN_TIMEOUT_MS).toBe(5000)
  })

  it('does not time out a fast run', async () => {
    const { stdout, error } = await runPython('print("quick")')
    expect(error).toBeNull()
    expect(stdout.trim()).toBe('quick')
  })

  it('returns a friendly timeout error when a run exceeds the budget', async () => {
    const src = 'import asyncio\nawait asyncio.sleep(2)\nprint("done")'
    const { stdout, error } = await runPython(src, { timeoutMs: 200 })
    expect(error).toMatch(/too long/i)
    expect(stdout).not.toContain('done')
  })
})
