# Phase 8 — Block redesign & minimalist UI (manual checks)

Run `npm run dev:local` (emulators + Vite) and sign in with a test account.

## A. Scratch-style nested blocks
- Open the lesson **Over and over again** → step "Build your first loop".
- The palette is split into **Blocks** (`for ▢ in ▢:`, `print(▢)`) and **Values**
  (`range(▢, ▢)`, number, text, variable).
- Tap a `for` block, then tap the workspace drop zone → it lands as a line of Python.
- Tap a value block (e.g. `range(▢, ▢)`), then tap the loop's **sequence** slot →
  it fills the slot. Statement slots only accept blocks; expression slots only accept values.
- Drop `number` blocks into `range`'s start/stop and edit them inline.
- Drop a `print(▢)` into the loop body and a `text` value into its slot; edit the text.
- Press **Run** → output reflects the compiled Python. Empty slots run as an error.

## B. "Use a loop" enforcement
- Graded loop steps (block "Finish the loop"/"Fix the loop"/"Loop it yourself" and the
  typed Python steps) must use a loop.
- In a typed Python step, solve it by writing `print(...)` lines individually with the
  correct output → it should fail with *"Right answer, but solve it with a loop…"*.
- Re-solve with a `for` loop → passes.

## C. Tailored hints
- Typed Python step: remove a closing quote → hint mentions a missing quote.
- Remove indentation inside the loop → hint mentions indentation.
- Reference an undefined variable → hint names the variable.
- Produce a sequence one item too long/short → off-by-one hint.

## D. Sparks currency + earn animation
- The nav shows `✦ N` (Sparks). Complete a graded step → a green `+N` rises from
  below into the total and the number counts up.
- With OS "Reduce motion" on, the total updates instantly with no floating `+N`.
- Account menu and the results page show Sparks too.

## E. Streak flame
- Nav, account menu, and results show a flame + day count.
- Streak 0 → dark/“cold” flame showing `0`. Streak ≥ 1 → blue flame with the count.

## F. Home "Review lesson"
- A not-started lesson shows **Start lesson**; a partially done one **Continue lesson**;
  a fully completed one **Review lesson** (and reopening starts at step 1).

## G. Progress bar
- The lesson/home progress fill is a solid green (no gradient).

## H. Minimalist theme + dark mode
- UI is flat: no gradients or drop shadows, limited blue/neutral palette, small radii.
- Account menu → **Dark mode** toggles the whole app dark; label flips to **Light mode**.
- Reload → the choice persists. Clearing storage falls back to the OS color scheme.
- Matrix: light + dark × {home, lesson (article/checkpoint/blocks/python), results}.
  Note: the CodeMirror editor stays light-themed for now (acceptable, future polish).
