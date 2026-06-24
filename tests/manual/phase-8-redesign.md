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
- Streak 0 → dark/“cold” flame showing `0`. Streak ≥ 1 → **orange** flame with the count.
- Streak/Sparks sit just left of the account button and are large enough to read at a glance.
- Streak only advances when you finish an ENTIRE lesson (not on a single step).
- Clicking the streak opens a modal with this week's days (Sun–Sat); days you completed
  a lesson are filled, today is outlined.

## J. Step gating
- On any step, **Next** is disabled until you finish that step (article panels done,
  graded problem passed, or sandbox run). A hint explains it's locked.

## K. Typography
- App uses a bolder/bubblier type (Fredoka headings, Nunito body).

## L. Code editor dark mode
- In dark mode the Python editor switches to a dark CodeMirror theme (no white-on-white).

## M. Blocks: auto-filled values
- New blocks come pre-filled: `for i in …`, `range(0, 5)`, `print("Hello!")`. Edit those
  values inline. The only drop slots are nesting ones (the loop's sequence, the body).
- Block lines never wrap; the workspace scrolls horizontally for long lines.

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
