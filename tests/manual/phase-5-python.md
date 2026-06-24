# Phase 5 — Manual / Environment-Dependent Tests

Automated unit tests (`npm test`) cover the python grader (per-case pass/fail, feedback, run-only detection). The Pyodide stdin integration runs via Node; the editor UX is a manual check.

## A. Pyodide integration (real stdin)
`tests/phase-5-python/python-grader.pyodide.test.ts`. Run:
```bash
npm run test:pyodide
```
Expected: stdin is injected per case and grading passes/fails correctly.

## B. Editor + UX checks (manual)
Run `npm run dev`, sign in, open **Over and Over Again**, advance to the Python steps (6–9).

1. CodeMirror editor
   - Python syntax highlighting + line numbers show; typing/editing works.
   - **Reset code** restores the starter code.
2. Symbol toolbar (mobile-focused)
   - Tapping `⇥` inserts 4 spaces; `( )`, `[ ]`, `"` insert pairs with the caret placed inside; `print`/`range`/`input` insert calls.
   - Verify insertion happens at the cursor and the editor keeps focus.
3. Run-only step (6)
   - Press Run → output console shows the printed lines; no grading UI.
4. Graded steps (7–9)
   - Correct solution → each test shows ✓ and "All tests passed!".
   - Wrong solution → failing test shows ✗ with expected vs got and any feedback.
   - Step 8/9 read input via `input()`; confirm different inputs produce different expected outputs.
5. First-run Pyodide load shows the "loading Python…" note.

## Sign-off
- [ ] A. `npm run test:pyodide` passes
- [ ] Editor highlight + edit + reset
- [ ] Symbol toolbar inserts correctly at caret
- [ ] Run-only step shows output, no grading
- [ ] Graded steps show per-test ✓/✗ + feedback
- [ ] Mobile: editor + toolbar usable
