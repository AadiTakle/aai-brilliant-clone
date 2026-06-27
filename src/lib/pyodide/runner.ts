// Lazy, shared Pyodide loader + Python runner used by both the block engine
// (Phase 4) and the Python sandbox (Phase 5).
//
// In the BROWSER, Python runs inside a dedicated same-origin module Web Worker
// (/public/pyodide.worker.js) so a run that never yields (`while True: pass`)
// cannot freeze the UI: when a run blows past its wall-clock budget we
// `terminate()` the worker (hard-killing the loop) and spin up a fresh one for
// the next run. In NODE (tests) we load the installed
// `pyodide` package on the main thread and bound the run with a promise race —
// good enough for async/yielding programs, which is all the tests exercise.

const PYODIDE_VERSION = '314.0.0'
const CDN_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`

// Default wall-clock budget for a single Python run (excludes the one-time
// Pyodide load). Runs that exceed it resolve with a friendly timeout error
// instead of leaving the caller hanging. Pass `timeoutMs` to override (0 or a
// non-finite value disables it).
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

export type PythonRunner = (source: string, opts?: RunOptions) => Promise<RunResult>

/** The learner-facing message shown when a run is aborted for running too long. */
export function formatTimeoutMessage(ms: number): string {
  const seconds = Math.max(1, Math.round(ms / 1000))
  return `Your code took too long to run (over ${seconds} second${seconds === 1 ? '' : 's'}). This usually means a loop never stops — check what makes your loop end.`
}

function timeoutEnabled(ms: number): boolean {
  return Boolean(ms) && ms > 0 && Number.isFinite(ms)
}

// --- Browser: Pyodide in a terminatable Web Worker -------------------------

// The worker lives at /public/pyodide.worker.js and is created as a MODULE
// worker (`{ type: 'module' }`). That matters: recent Pyodide rejects classic
// workers outright, and classic workers can only load code via
// `importScripts()`, which Chromium refuses to do for the cross-origin Pyodide
// CDN. A module worker loads Pyodide with a CORS-friendly dynamic `import()`
// instead. We pass the CDN base in via the run message so the version stays
// defined once, here.

let worker: Worker | null = null
let nextRunId = 0
// Runs are serialized so a single shared worker (and its single stdout sink) is
// never asked to handle two programs at once.
let runChain: Promise<RunResult | void> = Promise.resolve()

function getWorker(): Worker {
  if (!worker) {
    // Resolved lazily (not at module load) so importing this module in a non-Vite
    // context — e.g. a tsx script — never touches `import.meta.env`, which only
    // the browser worker path needs anyway.
    const workerUrl = `${import.meta.env.BASE_URL}pyodide.worker.js`
    worker = new Worker(workerUrl, { type: 'module' })
  }
  return worker
}

function disposeWorker() {
  if (worker) worker.terminate()
  worker = null
}

function runInWorker(source: string, opts: RunOptions, timeoutMs: number): Promise<RunResult> {
  const w = getWorker()
  const id = ++nextRunId
  return new Promise<RunResult>((resolve) => {
    let timer: ReturnType<typeof setTimeout> | undefined

    const cleanup = () => {
      if (timer) clearTimeout(timer)
      w.removeEventListener('message', onMessage)
      w.removeEventListener('error', onError)
    }

    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; id?: number; stdout?: string; error?: string | null }
      if (!data || data.id !== id) return
      if (data.type === 'started') {
        // Pyodide is loaded and the program is now running — start the clock.
        if (timeoutEnabled(timeoutMs)) {
          timer = setTimeout(() => {
            cleanup()
            // The worker is wedged in the user's loop; the only way out is to
            // kill it. The next run lazily creates (and reloads) a fresh worker.
            disposeWorker()
            resolve({ stdout: '', error: formatTimeoutMessage(timeoutMs) })
          }, timeoutMs)
        }
        return
      }
      if (data.type === 'result') {
        cleanup()
        resolve({ stdout: data.stdout ?? '', error: data.error ?? null })
      }
    }

    const onError = (event: ErrorEvent) => {
      cleanup()
      disposeWorker()
      resolve({ stdout: '', error: event.message || 'Python worker crashed.' })
    }

    w.addEventListener('message', onMessage)
    w.addEventListener('error', onError)
    w.postMessage({ id, source, stdin: opts.stdin, indexURL: CDN_BASE })
  })
}

// --- Node / fallback: Pyodide on the main thread ---------------------------

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
  if (!timeoutEnabled(ms)) return promise
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new PythonTimeoutError(ms)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

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

async function runInline(source: string, opts: RunOptions, timeoutMs: number): Promise<RunResult> {
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
      return { stdout: out, error: formatTimeoutMessage(e.ms) }
    }
    return { stdout: out, error: e instanceof Error ? e.message : String(e) }
  }
}

// Prefer the worker whenever the platform has real Workers (the browser). jsdom
// has `window` but no `Worker`, and Node has neither — both fall back to inline.
function canUseWorker(): boolean {
  return typeof window !== 'undefined' && typeof Worker !== 'undefined'
}

// Has a preload been kicked off already? Keeps `preloadPyodide()` idempotent so
// it's safe to call from multiple places / repeatedly.
let preloadStarted = false

/**
 * Warm up Pyodide ahead of the learner's first real run so that first run is
 * fast instead of incurring the multi-second one-time load.
 *
 * - In the browser it spins up the shared worker and triggers Pyodide to load
 *   via a trivial no-op run (`pass`) with the timeout disabled, routed through
 *   the same serialization chain real runs use.
 * - In Node/jsdom (no `Worker`) it kicks off the inline `loadPyodideRunner()`.
 *
 * It is idempotent, never throws, and swallows any error: a failed preload must
 * never surface to the user — the real run will load/report on its own. It also
 * no-ops gracefully where there is no `window`/`Worker`.
 */
export function preloadPyodide(): void {
  if (preloadStarted) return
  preloadStarted = true
  try {
    if (canUseWorker()) {
      // Serialize with real runs; `pass` just forces the one-time load. A
      // disabled timeout (0) keeps the slow load from being aborted.
      const result = runChain.then(
        () => runInWorker('pass', {}, 0),
        () => runInWorker('pass', {}, 0),
      )
      runChain = result.catch(() => {})
    } else {
      // Inline path (jsdom / Node): start the one-time load in the background.
      loadPyodideRunner().catch(() => {})
    }
  } catch {
    // Best-effort warm-up; never let a preload failure reach the user.
  }
}

export const runPython: PythonRunner = async (source, opts = {}) => {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_RUN_TIMEOUT_MS
  if (canUseWorker()) {
    // Serialize so the shared worker handles one program at a time.
    const result = runChain.then(
      () => runInWorker(source, opts, timeoutMs),
      () => runInWorker(source, opts, timeoutMs),
    )
    runChain = result.catch(() => {})
    return result
  }
  return runInline(source, opts, timeoutMs)
}

/** Test hook: clears the cached instance(s) so a fresh runner can be loaded. */
export function resetPyodideForTests() {
  instancePromise = null
  preloadStarted = false
  disposeWorker()
  runChain = Promise.resolve()
}
