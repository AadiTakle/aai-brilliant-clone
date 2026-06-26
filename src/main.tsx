import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { preloadPyodide } from './lib/pyodide/runner'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Warm up Pyodide once the browser is idle (after first paint) so a learner's
// first sandbox/block run is fast. This must never block render or throw, and
// only runs in a real browser — `preloadPyodide()` itself is a safe no-op
// elsewhere and swallows any error.
if (typeof window !== 'undefined') {
  const warm = () => preloadPyodide()
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(warm, { timeout: 4000 })
  } else {
    window.setTimeout(warm, 2000)
  }
}
