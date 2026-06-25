import { describe, it, expect, beforeAll } from 'vitest'
import { loadPyodideRunner, runPython, DEFAULT_RUN_TIMEOUT_MS } from '../../src/lib/pyodide/runner'

// [runner] Every Python run is bounded by a default wall-clock timeout. These run
// under real Python (`npm run test:pyodide`). We use an async-yielding program so
// the timer can fire deterministically (a pure-Python busy loop would block the JS
// thread; hard-aborting that needs a Web Worker, which is out of scope).
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
