# Phase 4 — Manual / Environment-Dependent Tests

Automated unit tests (`npm test`) cover the compiler, the tap-to-place reducer, the output grader, and fill_blank/bugfix grading (with a fake runner). The Pyodide integration tests are real but need a Node run; the rest are visual/touch checks.

## A. Pyodide integration tests (real Python)
Written at `tests/phase-4-blocks/pyodide-run.pyodide.test.ts`. Run:
```bash
npm run test:pyodide
```
First run loads Pyodide (can take 10–30s). Expected: 3 tests pass (stdout capture, graded block program, runtime-error reporting).

## B. Visual / interaction checks (manual)
Run `npm run dev`, sign in, open **Over and Over Again**, advance to the block steps (2–5).

1. Palette + tap-to-place
   - Tap a palette block → it highlights ("held"); the drop zones light up.
   - Tap a **"+ place here"** / **"+ add block"** zone → the block is inserted there; held clears.
2. Drag-and-drop (desktop + touch)
   - Drag a palette block onto a drop zone → it inserts. Test with mouse and on a touch device.
3. Nesting
   - Place a `for` block, then place a `print` block into its body slot (indented zone).
4. Fields
   - Edit the `times` (count) and `text`/`variable` fields; re-run reflects changes.
5. Run + grading
   - **Run** compiles + executes; first run shows the "loading Python…" note.
   - Step 2 (sandbox): any output is fine, no grading.
   - Step 3 (fill_blank): correct fill prints Hello! ×5 → green "Correct!".
   - Step 4 (bugfix): change count 3 → 5 to print 0–4 → green.
   - Step 5: build from scratch to print Hi ×4 → green; a wrong program → red.
6. Remove + Reset
   - The × removes a block; **Reset** (bugfix/fill steps) restores the initial program.

## Sign-off
- [ ] A. `npm run test:pyodide` passes
- [ ] Tap-to-place works
- [ ] Drag works (mouse + touch)
- [ ] Nesting into loop body works
- [ ] Field edits affect output
- [ ] Grading correct/incorrect per step
- [ ] Remove + Reset work
