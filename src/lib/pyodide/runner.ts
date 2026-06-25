// Lazy, shared Pyodide loader + Python runner used by both the block engine
// (Phase 4) and the Python sandbox (Phase 5).
//
// In the browser we load Pyodide from the CDN (keeps the wasm out of the Vite
// bundle). In Node (tests) we load the installed `pyodide` package.

const PYODIDE_VERSION = '314.0.0'
const CDN_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`

// Default wall-clock budget for a single Python run (excludes the one-time
// Pyodide load). Runs that exceed it resolve with a friendly timeout error
// instead of leaving the caller hanging. Pass `timeoutMs` to override (0 or a
// non-finite value disables it).
//
// NOTE: this bounds the *awaited* promise. A pure-Python loop that never yields
// (`while True: pass`) blocks the JS thread, so the only way to hard-abort it is
// to run Pyodide in a Web Worker (out of scope here). The timeout still protects
// against async / yielding runs overrunning and gives a clear message.
export const DEFAULT_RUN_TIMEOUT_MS = 5000

export interface RunResult {
  stdout: string
  error: string | null
}

export interface RunOptions {
  stdin?: string
  /** Wall-clock budget in ms for the run. Defaults to `DEFAULT_RUN_TIMEOUT_MS`. */
  timeoutMs?: number
}

class PythonTimeoutError extends Error {
  readonly ms: number
  constructor(ms: number) {
    super(`Python run exceeded ${ms} ms`)
    this.name = 'PythonTimeoutError'
    this.ms = ms
  }
}

// Reject if `promise` has not settled within `ms`. A non-positive / non-finite
// budget disables the timeout.
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  if (!ms || ms <= 0 || !Number.isFinite(ms)) return promise
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new PythonTimeoutError(ms)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

export type PythonRunner = (source: string, opts?: RunOptions) => Promise<RunResult>

interface PyodideLike {
  runPythonAsync: (code: string) => Promise<unknown>
  setStdout: (opts: { batched: (s: string) => void }) => void
  setStderr: (opts: { batched: (s: string) => void }) => void
  setStdin: (opts: { stdin: () => string | null | undefined }) => void
}

let instancePromise: Promise<PyodideLike> | null = null

type GlobalWithLoader = typeof globalThis & {
  loadPyodide?: (opts?: { indexURL?: string }) => Promise<PyodideLike>
}

async function loadInBrowser(): Promise<PyodideLike> {
  const g = globalThis as GlobalWithLoader
  if (!g.loadPyodide) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = `${CDN_BASE}pyodide.js`
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load Pyodide from CDN'))
      document.head.appendChild(script)
    })
  }
  if (!g.loadPyodide) throw new Error('Pyodide loader unavailable')
  return g.loadPyodide({ indexURL: CDN_BASE })
}

async function loadInNode(): Promise<PyodideLike> {
  const mod = (await import(/* @vite-ignore */ 'pyodide')) as {
    loadPyodide: () => Promise<PyodideLike>
  }
  return mod.loadPyodide()
}

/** Returns a shared Pyodide instance, loading it on first use. */
export function loadPyodideRunner(): Promise<PyodideLike> {
  if (!instancePromise) {
    instancePromise = typeof window !== 'undefined' ? loadInBrowser() : loadInNode()
  }
  return instancePromise
}

export const runPython: PythonRunner = async (source, opts = {}) => {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_RUN_TIMEOUT_MS
  // The (potentially slow) one-time load is intentionally outside the budget.
  const py = await loadPyodideRunner()
  let out = ''
  let err = ''
  py.setStdout({ batched: (s) => (out += `${s}\n`) })
  py.setStderr({ batched: (s) => (err += `${s}\n`) })

  if (opts.stdin !== undefined) {
    const lines = opts.stdin.length > 0 ? opts.stdin.split('\n') : []
    let i = 0
    py.setStdin({ stdin: () => (i < lines.length ? lines[i++] : null) })
  }

  try {
    await withTimeout(py.runPythonAsync(source), timeoutMs)
    return { stdout: out, error: err.trim() ? err.trim() : null }
  } catch (e) {
    if (e instanceof PythonTimeoutError) {
      const seconds = Math.round(e.ms / 1000)
      return {
        stdout: out,
        error: `Your code took too long to run (over ${seconds} second${seconds === 1 ? '' : 's'}). This usually means a loop never stops — check what makes your loop end.`,
      }
    }
    return { stdout: out, error: e instanceof Error ? e.message : String(e) }
  }
}

/** Test hook: clears the cached instance so a fresh runner can be loaded. */
export function resetPyodideForTests() {
  instancePromise = null
}
