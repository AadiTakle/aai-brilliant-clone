// Module Web Worker that runs Python via Pyodide.
//
// This MUST be a module worker (`new Worker(url, { type: 'module' })`):
//
//  - Recent Pyodide builds refuse to run in a classic worker — `pyodide.js`
//    throws "Classic web workers are not supported" the moment it executes.
//  - Classic workers can only pull in code via `importScripts()`, and Chromium
//    refuses to `importScripts()` a cross-origin URL (the Pyodide CDN) — it
//    fails with a NetworkError even though the same URL fetches fine with CORS
//    from the main thread.
//
// A module worker sidesteps both problems: it loads Pyodide with a dynamic
// `import()` of `pyodide.mjs`, which uses a normal CORS fetch (the CDN sends
// the right headers) instead of `importScripts()`.
//
// The CDN base (`indexURL`) is passed in from the main thread so the version
// lives in exactly one place (src/lib/pyodide/runner.ts).

let ready = null

async function getPy(indexURL) {
  if (!ready) {
    ready = import(indexURL + 'pyodide.mjs').then((mod) => mod.loadPyodide({ indexURL }))
  }
  return ready
}

self.onmessage = async (e) => {
  const { id, source, stdin, indexURL } = e.data
  let out = ''
  let err = ''
  let py
  try {
    py = await getPy(indexURL)
  } catch (loadErr) {
    self.postMessage({ type: 'result', id, stdout: '', error: 'Failed to load Python: ' + String(loadErr) })
    return
  }
  // Signal that the one-time load is done and execution is starting, so the
  // main thread only now begins counting the run against the timeout budget.
  self.postMessage({ type: 'started', id })
  try {
    py.setStdout({ batched: (s) => { out += s + '\n' } })
    py.setStderr({ batched: (s) => { err += s + '\n' } })
    if (stdin !== undefined) {
      const lines = stdin.length > 0 ? stdin.split('\n') : []
      let i = 0
      py.setStdin({ stdin: () => (i < lines.length ? lines[i++] : null) })
    }
    await py.runPythonAsync(source)
    self.postMessage({ type: 'result', id, stdout: out, error: err.trim() ? err.trim() : null })
  } catch (runErr) {
    const message = runErr && runErr.message ? String(runErr.message) : String(runErr)
    self.postMessage({ type: 'result', id, stdout: out, error: message })
  }
}
