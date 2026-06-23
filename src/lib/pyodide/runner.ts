// Lazy, shared Pyodide loader + Python runner used by both the block engine
// (Phase 4) and the Python sandbox (Phase 5).
//
// In the browser we load Pyodide from the CDN (keeps the wasm out of the Vite
// bundle). In Node (tests) we load the installed `pyodide` package.

const PYODIDE_VERSION = '314.0.0'
const CDN_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`

export interface RunResult {
  stdout: string
  error: string | null
}

export interface RunOptions {
  stdin?: string
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
    await py.runPythonAsync(source)
    return { stdout: out, error: err.trim() ? err.trim() : null }
  } catch (e) {
    return { stdout: out, error: e instanceof Error ? e.message : String(e) }
  }
}

/** Test hook: clears the cached instance so a fresh runner can be loaded. */
export function resetPyodideForTests() {
  instancePromise = null
}
